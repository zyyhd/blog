<script setup>
import { ref, computed, onMounted } from 'vue'
import { cloud } from '../../cloud'
import { formatDate } from '../../lib/format'
import Pagination from '../../components/Pagination.vue'

const PAGE_SIZE = 15
const comments = ref([])
const total = ref(0)
const page = ref(1)
const filter = ref('all') // all | visible | hidden
const loading = ref(true)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

async function load() {
  loading.value = true
  let query = cloud.database
    .from('comments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (filter.value !== 'all') query = query.eq('status', filter.value)
  const { data, count } = await query.range((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE - 1)
  loading.value = false
  comments.value = data || []
  total.value = count || 0
  await attachPostTitles()
}

async function attachPostTitles() {
  const ids = [...new Set(comments.value.map((c) => c.post_id))]
  if (!ids.length) return
  const { data: posts } = await cloud.database.from('posts').select('id, title').in('id', ids)
  const map = new Map((posts || []).map((p) => [p.id, p.title]))
  comments.value = comments.value.map((c) => ({ ...c, post_title: map.get(c.post_id) || `#${c.post_id}` }))
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

async function toggleStatus(c) {
  const next = c.status === 'visible' ? 'hidden' : 'visible'
  const action = next === 'hidden' ? '隐藏' : '显示'
  if (!confirm(`确定${action}这条评论？`)) return
  const { data, error } = await cloud.database.from('comments').update({ status: next }).eq('id', c.id).select()
  if (error || !data || data.length === 0) {
    alert('操作失败：' + ((error && error.message) || '无权限'))
    return
  }
  await load()
}

async function removeComment(c) {
  if (!confirm('确定删除这条评论？该评论的所有回复将一并删除。')) return
  const { data, error } = await cloud.database.from('comments').delete().eq('id', c.id).select()
  if (error || !data || data.length === 0) {
    alert('删除失败：' + ((error && error.message) || '无权限'))
    return
  }
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="admin-page-title">评论管理（{{ total }}）</h2>

    <div class="filter-bar">
      <button class="filter-chip" :class="{ active: filter === 'all' }" @click="setFilter('all')">全部</button>
      <button class="filter-chip" :class="{ active: filter === 'visible' }" @click="setFilter('visible')">可见</button>
      <button class="filter-chip" :class="{ active: filter === 'hidden' }" @click="setFilter('hidden')">已隐藏</button>
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
              <router-link :to="{ name: 'post', params: { id: c.post_id } }">{{ c.post_title }}</router-link>
            </td>
            <td>
              <span class="badge" :class="c.status === 'visible' ? 'badge-visible' : 'badge-hidden'">
                {{ c.status === 'visible' ? '可见' : '已隐藏' }}
              </span>
            </td>
            <td>{{ formatDate(c.created_at) }}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-outline btn-sm" @click="toggleStatus(c)">
                  {{ c.status === 'visible' ? '隐藏' : '显示' }}
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
