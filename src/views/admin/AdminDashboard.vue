<script setup>
import { reactive, ref, onMounted } from 'vue'
import { cloud } from '../../cloud'
import { formatDate } from '../../lib/format'

const stats = reactive({ published: 0, draft: 0, offline: 0, comments: 0, pending: 0 })
const recentComments = ref([])
const recentPosts = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const count = (q) => q.select('*', { count: 'exact', head: true }).then((r) => r.count || 0)
    const [published, draft, offline, comments, pending] = await Promise.all([
      count(cloud.database.from('posts').eq('status', 'published')),
      count(cloud.database.from('posts').eq('status', 'draft')),
      count(cloud.database.from('posts').eq('status', 'offline')),
      count(cloud.database.from('comments')),
      count(cloud.database.from('comments').eq('status', 'pending')),
    ])
    stats.published = published
    stats.draft = draft
    stats.offline = offline
    stats.comments = comments
    stats.pending = pending
  } catch (e) {
    console.error('[dashboard] 统计加载失败：', e)
  }

  const [{ data: rc }, { data: rp }] = await Promise.all([
    // 关联查询直接带出文章标题，省掉原来「先查评论、再查标题」的第二次往返
    cloud.database.from('comments').select('*, post:posts(id, title)').order('created_at', { ascending: false }).limit(6),
    cloud.database.from('posts').select('id, title, status, owner_name, created_at').order('created_at', { ascending: false }).limit(6),
  ])
  recentComments.value = rc || []
  recentPosts.value = rp || []
  loading.value = false
})
</script>

<template>
  <div>
    <h2 class="admin-page-title">后台概览</h2>

    <div v-if="loading" class="loading-bar">加载中…</div>

    <template v-else>
      <div class="stat-grid">
        <div class="card stat-card blue"><div class="stat-value">{{ stats.published }}</div><div class="stat-label">已发布文章</div></div>
        <div class="card stat-card red"><div class="stat-value">{{ stats.pending }}</div><div class="stat-label">待审核评论</div></div>
        <div class="card stat-card orange"><div class="stat-value">{{ stats.draft }}</div><div class="stat-label">草稿</div></div>
        <div class="card stat-card gray"><div class="stat-value">{{ stats.offline }}</div><div class="stat-label">已下架</div></div>
        <div class="card stat-card green"><div class="stat-value">{{ stats.comments }}</div><div class="stat-label">评论总数</div></div>
      </div>

      <div class="card" style="padding: 20px 24px; margin-bottom: 20px">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px">最新文章</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>标题</th><th>作者</th><th>状态</th><th>发布时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in recentPosts" :key="p.id">
                <td class="wrap-cell"><router-link :to="{ name: 'editor-edit', params: { id: p.id } }">{{ p.title }}</router-link></td>
                <td>{{ p.owner_name || '匿名' }}</td>
                <td>
                  <span class="badge" :class="'badge-' + p.status">
                    {{ p.status === 'published' ? '已发布' : p.status === 'draft' ? '草稿' : '已下架' }}
                  </span>
                </td>
                <td>{{ formatDate(p.created_at) }}</td>
              </tr>
              <tr v-if="recentPosts.length === 0"><td colspan="4" style="color: var(--text-3)">暂无数据</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="padding: 20px 24px">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px">最新评论</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>评论人</th><th>内容</th><th>文章</th><th>状态</th><th>时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="c in recentComments" :key="c.id">
                <td>{{ c.owner_name || '匿名' }}</td>
                <td class="wrap-cell">{{ c.content.slice(0, 40) }}{{ c.content.length > 40 ? '…' : '' }}</td>
                <td class="wrap-cell">{{ c.post?.title || '#' + c.post_id }}</td>
                <td>
                  <span class="badge" :class="c.status === 'visible' ? 'badge-visible' : 'badge-hidden'">
                    {{ c.status === 'visible' ? '可见' : '已隐藏' }}
                  </span>
                </td>
                <td>{{ formatDate(c.created_at) }}</td>
              </tr>
              <tr v-if="recentComments.length === 0"><td colspan="5" style="color: var(--text-3)">暂无数据</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
