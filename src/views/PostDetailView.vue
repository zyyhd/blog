<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cloud } from '../cloud'
import { auth } from '../stores/auth'
import { renderMarkdown } from '../lib/markdown'
import { SITE } from '../config'
import { formatDate, formatCount } from '../lib/format'
import CommentTree from '../components/CommentTree.vue'

const route = useRoute()
const router = useRouter()
const postId = Number(route.params.id)

const post = ref(null)
const html = ref('')
const notFound = ref(false)
const loading = ref(true)
const error = ref('')

// 游客昵称（本地记住，下次自动填充）
const guestName = ref(localStorage.getItem('blog_guest_name') || '')
const commentText = ref('')
const commentBusy = ref(false)
const commentError = ref('')
const commentNotice = ref('')

const isOwner = computed(() => !!(auth.user && post.value && post.value.owner_id === auth.user.id))

const comments = ref([])

// 构建评论树（parent_id 关联，只展示可见评论）
const commentTree = computed(() => {
  const visible = comments.value.filter((c) => c.status === 'visible')
  const map = new Map()
  const roots = []
  visible.forEach((c) => map.set(c.id, { ...c, children: [] }))
  visible.forEach((c) => {
    const node = map.get(c.id)
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
})

async function loadPost() {
  const { data, error: err } = await cloud.database
    .from('posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle()
  if (err) {
    error.value = '加载失败：' + (err.message || '请稍后重试')
    loading.value = false
    return
  }
  if (!data) {
    notFound.value = true
    loading.value = false
    return
  }
  post.value = data
  html.value = renderMarkdown(data.content)
  loading.value = false
  if (data.status === 'published') {
    // 浏览量自增（数据库函数保证原子性），结果回填本地展示
    cloud.database
      .rpc('increment_views', { post_id: postId })
      .then(() => { if (post.value) post.value.views++ })
      .catch(() => {})
  }
}

async function loadComments() {
  const { data } = await cloud.database
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  comments.value = data || []
}

function validGuestName() {
  const name = guestName.value.trim()
  if (!name) return '请填写昵称'
  if (name.length > 20) return '昵称不能超过 20 字'
  return ''
}

async function submitComment() {
  const text = commentText.value.trim()
  if (!text || commentBusy.value) return
  commentBusy.value = true
  commentError.value = ''
  commentNotice.value = ''

  let payload
  let needModeration = false
  if (auth.user) {
    // 站长本人评论：身份由数据库自动绑定，直接公开
    payload = { post_id: postId, content: text, owner_name: SITE.authorName, status: 'visible' }
  } else {
    const nameError = validGuestName()
    if (nameError) {
      commentBusy.value = false
      commentError.value = nameError
      return
    }
    // 游客评论进入待审核队列，由后台审核通过后才在前台展示
    payload = { post_id: postId, content: text, guest_name: guestName.value.trim(), status: 'pending' }
    needModeration = true
  }

  let { error: e } = await cloud.database.from('comments').insert(payload)

  // 兜底：数据库策略若固定了 status 字段，带 status 的写入会被 RLS 拒绝，
  // 此时退回不传 status，交由数据库默认值决定（见 docs/comment-moderation.sql）
  if (e && /row-level security|policy/i.test(e.message || '')) {
    const fallback = { ...payload }
    delete fallback.status
    ;({ error: e } = await cloud.database.from('comments').insert(fallback))
  }

  commentBusy.value = false
  if (e) {
    commentError.value = e.message || '评论失败，请稍后重试'
    return
  }
  if (!auth.user) localStorage.setItem('blog_guest_name', guestName.value.trim())
  commentText.value = ''
  if (needModeration) commentNotice.value = '评论已提交，通过审核后展示'
  await loadComments()
}

async function unpublishOwn() {
  if (!confirm('撤回后文章转为草稿，前台将不再显示。确定继续？')) return
  const { data, error: e } = await cloud.database
    .from('posts')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select()
  if (e || !data || data.length === 0) {
    alert('操作失败：' + ((e && e.message) || '无权限'))
    return
  }
  post.value.status = 'draft'
}

async function deletePost() {
  if (!confirm('删除后无法恢复，确定删除这篇文章？')) return
  const { data, error: e } = await cloud.database.from('posts').delete().eq('id', postId).select()
  if (e || !data || data.length === 0) {
    alert('删除失败：' + ((e && e.message) || '无权限'))
    return
  }
  router.push({ name: 'home' })
}

onMounted(() => {
  loadPost()
  loadComments()
})
</script>

<template>
  <div class="container page-top-pad">
    <div class="post-page">
    <div v-if="loading" class="loading-bar">加载中…</div>

    <div v-else-if="notFound" class="state-page">
      <div class="icon">🔍</div>
      <h3>文章不存在</h3>
      <p>文章可能已被删除、下架，或尚未发布</p>
      <router-link :to="{ name: 'home' }" class="btn btn-outline btn-sm" style="margin-top: 14px">返回首页</router-link>
    </div>

    <div v-else-if="error" class="state-page">
      <div class="icon">⚠️</div>
      <h3>出错了</h3>
      <p>{{ error }}</p>
    </div>

    <article v-else-if="post" class="card">
      <header class="post-header">
        <div v-if="post.status !== 'published'" style="margin-bottom: 10px">
          <span class="badge" :class="post.status === 'draft' ? 'badge-draft' : 'badge-offline'">
            {{ post.status === 'draft' ? '草稿（仅自己可见）' : '已下架' }}
          </span>
        </div>
        <h1>{{ post.title }}</h1>
        <div class="post-meta">
          <span class="meta-author">{{ post.owner_name || '佚名' }}</span>
          <span>{{ formatDate(post.created_at) }}</span>
          <span>{{ formatCount(post.views) }} 阅读</span>
          <span v-for="t in post.tags || []" :key="t" class="tag">{{ t }}</span>
        </div>
      </header>

      <div class="post-content markdown" v-html="html"></div>

      <div v-if="auth.user" class="post-actions">
        <router-link v-if="isOwner" :to="{ name: 'editor-edit', params: { id: post.id } }" class="action-link">编辑</router-link>
        <a v-if="isOwner && post.status === 'published'" class="action-link" @click="unpublishOwn">撤回为草稿</a>
        <a class="action-link action-danger" @click="deletePost">删除</a>
      </div>

      <section class="comment-section" style="padding: 22px 32px 28px">
        <h3 class="comment-section-title">评论（{{ commentTree.length }}）</h3>

        <div class="comment-editor">
          <div v-if="!auth.user" class="form-item">
            <input
              v-model="guestName"
              class="form-input"
              maxlength="20"
              placeholder="你的昵称（必填，最多 20 字）"
            />
          </div>
          <div class="form-item">
            <textarea
              v-model="commentText"
              class="form-textarea"
              rows="3"
              maxlength="500"
              :placeholder="auth.user ? `以「${SITE.authorName}」的身份回复…` : '说点什么吧…（无需注册，最多 500 字）'"
            ></textarea>
            <div v-if="commentError" class="form-error">{{ commentError }}</div>
            <div v-if="commentNotice" class="form-success">{{ commentNotice }}</div>
          </div>
          <div style="display: flex; justify-content: flex-end">
            <button class="btn btn-primary" :disabled="commentBusy || !commentText.trim()" @click="submitComment">
              {{ commentBusy ? '发表中…' : '发表评论' }}
            </button>
          </div>
        </div>

        <div v-if="commentTree.length" class="comment-tree">
          <CommentTree :nodes="commentTree" :post-id="postId" @reload="loadComments" />
        </div>
        <p v-else style="color: var(--text-3); font-size: 13.5px; padding-top: 10px">还没有评论，来说两句吧～</p>
      </section>
    </article>
    </div>
  </div>
</template>
