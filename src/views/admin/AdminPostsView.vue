<script setup>
import { ref, computed, onMounted } from 'vue'
import { cloud } from '../../cloud'
import { formatDate, formatCount } from '../../lib/format'
import Pagination from '../../components/Pagination.vue'

const PAGE_SIZE = 15
const posts = ref([])
const total = ref(0)
const page = ref(1)
const filter = ref('all')
const loading = ref(true)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

// 请求令牌：快速切换筛选/翻页时，先发出的请求可能后返回，
// 用递增令牌丢弃过期响应，避免旧数据覆盖新数据
let reqToken = 0

async function load() {
  const token = ++reqToken
  loading.value = true
  let query = cloud.database
    .from('posts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (filter.value !== 'all') query = query.eq('status', filter.value)
  const { data, count } = await query.range((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE - 1)
  if (token !== reqToken) return
  loading.value = false
  posts.value = data || []
  total.value = count || 0
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

async function setPostStatus(p, status) {
  const action = status === 'published' ? '恢复发布' : '下架'
  if (!confirm(`确定${action}《${p.title}》？`)) return
  const { data, error } = await cloud.database
    .from('posts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', p.id)
    .select()
  if (error || !data || data.length === 0) {
    alert('操作失败：' + ((error && error.message) || '无权限'))
    return
  }
  await load()
}

async function removePost(p) {
  if (!confirm(`确定删除《${p.title}》？该文章的全部评论和点赞将一并删除，无法恢复。`)) return
  const { data, error } = await cloud.database.from('posts').delete().eq('id', p.id).select()
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
    <h2 class="admin-page-title">文章管理（{{ total }}）</h2>

    <div class="filter-bar">
      <button class="filter-chip" :class="{ active: filter === 'all' }" @click="setFilter('all')">全部</button>
      <button class="filter-chip" :class="{ active: filter === 'published' }" @click="setFilter('published')">已发布</button>
      <button class="filter-chip" :class="{ active: filter === 'draft' }" @click="setFilter('draft')">草稿</button>
      <button class="filter-chip" :class="{ active: filter === 'offline' }" @click="setFilter('offline')">已下架</button>
    </div>

    <div v-if="loading" class="loading-bar">加载中…</div>

    <div v-else class="card table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>标题</th><th>作者</th><th>状态</th><th>阅读</th><th>发布时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in posts" :key="p.id">
            <td class="wrap-cell">
              <router-link :to="{ name: 'post', params: { id: p.id } }" style="font-weight: 600">{{ p.title }}</router-link>
            </td>
            <td>{{ p.owner_name || '匿名' }}</td>
            <td>
              <span class="badge" :class="'badge-' + p.status">
                {{ p.status === 'published' ? '已发布' : p.status === 'draft' ? '草稿' : '已下架' }}
              </span>
            </td>
            <td>{{ formatCount(p.views) }}</td>
            <td>{{ formatDate(p.created_at) }}</td>
            <td>
              <div class="row-actions">
                <button v-if="p.status === 'published'" class="btn btn-outline btn-sm" @click="setPostStatus(p, 'offline')">下架</button>
                <button v-if="p.status !== 'published'" class="btn btn-primary btn-sm" @click="setPostStatus(p, 'published')">恢复发布</button>
                <button class="btn btn-danger btn-sm" @click="removePost(p)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="posts.length === 0"><td colspan="6" style="color: var(--text-3)">暂无数据</td></tr>
        </tbody>
      </table>
    </div>

    <Pagination :page="page" :total-pages="totalPages" @change="goPage" />
  </div>
</template>
