<script setup>
import { ref } from 'vue'
import { cloud } from '../cloud'
import { auth } from '../stores/auth'
import { SITE } from '../config'
import { formatDate, initialOf } from '../lib/format'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  postId: { type: Number, required: true },
})

const emit = defineEmits(['reload'])

const replying = ref(null)
const replyText = ref('')
const replyName = ref(localStorage.getItem('blog_guest_name') || '')
const busy = ref(false)
const error = ref('')

function displayName(node) {
  return node.owner_name || node.guest_name || '游客'
}

function toggleReply(node) {
  replying.value = replying.value === node.id ? null : node.id
  replyText.value = ''
  error.value = ''
}

async function submitReply(node) {
  const text = replyText.value.trim()
  if (!text || busy.value) return

  let payload
  if (auth.user) {
    payload = { post_id: props.postId, parent_id: node.id, content: text, owner_name: SITE.authorName }
  } else {
    const name = replyName.value.trim()
    if (!name) {
      error.value = '请填写昵称'
      return
    }
    if (name.length > 20) {
      error.value = '昵称不能超过 20 字'
      return
    }
    payload = { post_id: props.postId, parent_id: node.id, content: text, guest_name: name }
  }

  busy.value = true
  error.value = ''
  const { error: e } = await cloud.database.from('comments').insert(payload)
  busy.value = false
  if (e) {
    error.value = e.message || '回复失败，请稍后重试'
    return
  }
  if (!auth.user) localStorage.setItem('blog_guest_name', replyName.value.trim())
  replyText.value = ''
  replying.value = null
  emit('reload')
}

async function removeComment(node) {
  if (!confirm('确定删除这条评论？')) return
  const { data, error: e } = await cloud.database.from('comments').delete().eq('id', node.id).select()
  if (e) {
    alert('删除失败：' + (e.message || '未知错误'))
    return
  }
  if (!data || data.length === 0) {
    alert('无权限删除该评论')
    return
  }
  emit('reload')
}
</script>

<template>
  <div class="comment-tree">
    <div v-for="node in nodes" :key="node.id" class="comment-node">
      <div class="comment">
        <div class="comment-avatar">{{ initialOf(displayName(node)) }}</div>
        <div class="comment-main">
          <div class="comment-head">
            <span class="comment-author" :style="node.owner_id ? 'color: var(--primary)' : ''">
              {{ displayName(node) }}
              <span v-if="node.owner_id" class="badge badge-admin" style="margin-left: 4px; font-size: 11px; padding: 0 6px">站长</span>
            </span>
            <span class="comment-time">{{ formatDate(node.created_at) }}</span>
          </div>
          <p class="comment-content">{{ node.content }}</p>
          <div class="comment-actions">
            <a @click="toggleReply(node)">回复</a>
            <a v-if="auth.isAdmin" class="action-danger" @click="removeComment(node)">删除</a>
          </div>
          <div v-if="replying === node.id" class="reply-box">
            <input
              v-if="!auth.user"
              v-model="replyName"
              class="form-input"
              maxlength="20"
              placeholder="你的昵称（必填）"
              style="margin-bottom: 8px"
            />
            <textarea v-model="replyText" rows="3" maxlength="500" :placeholder="`回复 ${displayName(node)}：`"></textarea>
            <div class="reply-actions">
              <span v-if="error" class="form-error">{{ error }}</span>
              <button class="btn btn-primary btn-sm" :disabled="busy || !replyText.trim()" @click="submitReply(node)">
                {{ busy ? '发送中…' : '回复' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="node.children && node.children.length" class="comment-children">
        <CommentTree :nodes="node.children" :post-id="postId" @reload="emit('reload')" />
      </div>
    </div>
  </div>
</template>
