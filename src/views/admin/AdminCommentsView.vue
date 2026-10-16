<script setup>
import { ref, computed, onMounted } from 'vue'
import { cloud } from '../../cloud'
import { formatDate } from '../../lib/format'
import Pagination from '../../components/Pagination.vue'

const PAGE_SIZE = 15
const comments = ref([])
const total = ref(0)
const page = ref(1)
const filter = ref('pending') // all | pending | visible | hidden
const loading = ref(true)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

// 请求令牌：快速切换筛选/翻页时，先发出的请求可能后返回，
// 用递增令牌丢弃过期响应，避免旧数据覆盖新数据
let reqToken = 0

async function load() {
  const token = ++reqToken
  loading.value = true
  let query = cloud.database
    .from('comments')
    // 用 PostgREST 的关联查询直接带出所属文章标题，省掉第二次往返，
    // 也顺带消除了标题从 #id 占位跳变的问题
    .select('*, post:posts(id, title)', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (filter.value !== 'all') query = query.eq('status', filter.value)
  const { data, count } = await query.range((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE - 1)
  if (token !== reqToken) return
  comments.value = data || []
  total.value = count || 0
  loading.value = false
}

function postTitle(c) {
  return c.post?.title || `#${c.post_id}`
}

// 单条变更后只更新本地列表，不整页重拉；
// 若当前筛选下该条已不匹配，则从列表移除，并在删空当前页时回退一页
function removeRowFromPage(row) {
  comments.value = comments.value.filter((x) => x.id !== row.id)
  total.value = Math.max(0, total.value - 1)
  if (comments.value.length === 0 && page.value > 1) {
    page.value -= 1
    load()
  }
}

function setFilter(f) {
  filter.value = f
  page.value = 1
  load()
}

function goPage(p) {
  page.value = p
  load()
}

// 审核通过：pending → visible
async function approveComment(c) {
  if (!confirm('确定通过这条评论？通过后将在前台公开显示。')) return
  await updateStatus(c, 'visible')
}

// 隐藏 / 恢复显示：pending、visible → hidden；hidden → visible
async function toggleStatus(c) {
  const next = c.status === 'hidden' ? 'visible' : 'hidden'
  const action = next === 'hidden' ? '隐藏' : '显示'
  if (!confirm(`确定${action}这条评论？`)) return
  await updateStatus(c, next)
}

const STATUS_META = {
  pending: { text: '待审核', cls: 'badge-pending' },
  visible: { text: '可见', cls: 'badge-visible' },
  hidden: { text: '已隐藏', cls: 'badge-hidden' },
}

function statusMeta(status) {
  return STATUS_META[status] || { text: status || '未知', cls: 'badge-hidden' }
}

async function updateStatus(c, next) {
  const { data, error } = await cloud.database.from('comments').update({ status: next }).eq('id', c.id).select()
  if (error || !data || data.length === 0) {
    alert('操作失败：' + ((error && error.message) || '无权限'))
    return
  }
  const updated = data[0]
  if (filter.value !== 'all' && updated.status !== filter.value) {
    removeRowFromPage(c)
  } else {
    // Object.assign 只覆盖返回的字段，关联出来的 post 会保留
    Object.assign(c, updated)
  }
}

async function removeComment(c) {
  if (!confirm('确定删除这条评论？该评论的所有回复将一并删除。')) return
  const { data, error } = await cloud.database.from('comments').delete().eq('id', c.id).select()
  if (error || !data || data.length === 0) {
    alert('删除失败：' + ((error && error.message) || '无权限'))
    return
  }
  removeRowFromPage(c)
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="admin-page-title">评论管理（{{ total }}）</h2>

    <div class="filter-bar">
      <button class="filter-chip" :class="{ active: filter === 'pending' }" @click="setFilter('pending')">待审核</button>
      <button class="filter-chip" :class="{ active: filter === 'visible' }" @click="setFilter('visible')">可见</button>
      <button class="filter-chip" :class="{ active: filter === 'hidden' }" @click="setFilter('hidden')">已隐藏</button>
      <button class="filter-chip" :class="{ active: filter === 'all' }" @click="setFilter('all')">全部</button>
    </div>

    <div v-if="loading" class="loading-bar">加载中…</div>

    <div v-else class="card table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>评论人</th><th>内容</th><th>文章</th><th>状态</th><th>时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in comments" :key="c.id">
            <td>{{ c.owner_name || c.guest_name || '游客' }}</td>
            <td class="wrap-cell">{{ c.content.slice(0, 50) }}{{ c.content.length > 50 ? '…' : '' }}</td>
            <td class="wrap-cell">
              <router-link :to="{ name: 'post', params: { id: c.post_id } }">{{ postTitle(c) }}</router-link>
            </td>
            <td>
              <span class="badge" :class="statusMeta(c.status).cls">{{ statusMeta(c.status).text }}</span>
            </td>
            <td>{{ formatDate(c.created_at) }}</td>
            <td>
              <div class="row-actions">
                <button v-if="c.status === 'pending'" class="btn btn-primary btn-sm" @click="approveComment(c)">通过</button>
                <button class="btn btn-outline btn-sm" @click="toggleStatus(c)">
                  {{ c.status === 'hidden' ? '显示' : '隐藏' }}
                </button>
                <button class="btn btn-danger btn-sm" @click="removeComment(c)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="comments.length === 0"><td colspan="6" style="color: var(--text-3)">暂无数据</td></tr>
        </tbody>
      </table>
    </div>

    <Pagination :page="page" :total-pages="totalPages" @change="goPage" />
  </div>
</template>
