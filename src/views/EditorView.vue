<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cloud } from '../cloud'
import { auth } from '../stores/auth'
import { SITE } from '../config'
import { renderMarkdown } from '../lib/markdown'

const route = useRoute()
const router = useRouter()

const editId = route.params.id ? Number(route.params.id) : null

const form = reactive({
  title: '',
  summary: '',
  tags: '',
  cover_url: '',
  content: '',
})

const originStatus = ref('draft')
const loading = ref(!!editId)
const loadError = ref('')
const error = ref('')
const busy = ref(false)
const showPreview = ref(true)

const previewHtml = computed(() => (showPreview.value ? renderMarkdown(form.content) : ''))
const wordCount = computed(() => form.content.length)

function parseTags() {
  return form.tags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function validate() {
  if (!form.title.trim()) return '请输入标题'
  if (form.title.trim().length > 100) return '标题不能超过 100 字'
  if (!form.content.trim()) return '请输入正文内容'
  if (parseTags().length > 5) return '最多 5 个标签'
  const cover = form.cover_url.trim()
  if (cover && !/^https?:\/\/.+/i.test(cover)) return '封面链接需以 http(s):// 开头'
  return ''
}

async function loadPost() {
  if (!editId) return
  const { data, error: err } = await cloud.database.from('posts').select('*').eq('id', editId).maybeSingle()
  loading.value = false
  if (err || !data) {
    loadError.value = '文章不存在或无权限编辑'
    return
  }
  form.title = data.title
  form.summary = data.summary || ''
  form.tags = (data.tags || []).join(', ')
  form.cover_url = data.cover_url || ''
  form.content = data.content || ''
  originStatus.value = data.status
}

async function save(status) {
  const msg = validate()
  if (msg) {
    error.value = msg
    return
  }
  busy.value = true
  error.value = ''
  const payload = {
    title: form.title.trim(),
    summary: form.summary.trim() || null,
    content: form.content,
    cover_url: form.cover_url.trim() || null,
    tags: parseTags(),
    status,
    owner_name: SITE.authorName,
  }
  if (editId) {
    payload.updated_at = new Date().toISOString()
    const { data, error: e } = await cloud.database.from('posts').update(payload).eq('id', editId).select()
    busy.value = false
    if (e || !data || data.length === 0) {
      error.value = '保存失败：' + ((e && e.message) || '文章不存在或无权限')
      return
    }
    router.push({ name: 'post', params: { id: editId } })
  } else {
    const { data, error: e } = await cloud.database.from('posts').insert(payload).select()
    busy.value = false
    if (e || !data || data.length === 0) {
      error.value = '保存失败：' + ((e && e.message) || '请稍后重试')
      return
    }
    router.push({ name: 'post', params: { id: data[0].id } })
  }
}

onMounted(loadPost)
</script>

<template>
  <div class="container page-top-pad">
    <div class="editor-wrap">
    <div class="editor-toolbar">
      <h2>{{ editId ? '编辑文章' : '写文章' }}</h2>
      <div style="display: flex; gap: 10px; align-items: center">
        <button class="btn btn-outline btn-sm" @click="showPreview = !showPreview">
          {{ showPreview ? '关闭预览' : '开启预览' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-bar">加载中…</div>

    <div v-else-if="loadError" class="state-page">
      <div class="icon">🔍</div>
      <h3>{{ loadError }}</h3>
      <router-link :to="{ name: 'my-posts' }" class="btn btn-outline btn-sm" style="margin-top: 14px">返回我的文章</router-link>
    </div>

    <div v-else class="card editor-body">
      <div class="form-item">
        <label class="form-label">标题<span class="req">*</span></label>
        <input v-model="form.title" class="form-input" maxlength="100" placeholder="请输入文章标题" />
      </div>

      <div class="form-item">
        <label class="form-label">摘要</label>
        <textarea v-model="form.summary" class="form-textarea" rows="2" maxlength="200" placeholder="展示在列表页的简短摘要（可选，默认截取正文）"></textarea>
      </div>

      <div class="form-item">
        <label class="form-label">标签</label>
        <input v-model="form.tags" class="form-input" placeholder="用逗号分隔，最多 5 个，如：前端, 随笔" />
      </div>

      <div class="form-item">
        <label class="form-label">封面图链接</label>
        <input v-model="form.cover_url" class="form-input" placeholder="https://… （可选，留空使用自动生成的渐变封面）" />
      </div>

      <div class="form-item">
        <label class="form-label">
          正文（Markdown）<span class="req">*</span>
          <span class="word-count" style="font-weight: 400; margin-left: 10px">{{ wordCount }} 字</span>
        </label>
        <div class="editor-content-area">
          <textarea
            v-model="form.content"
            class="form-textarea"
            placeholder="支持 Markdown 语法：## 标题、**粗体**、- 列表、> 引用、```代码块```、[链接](url)…"
          ></textarea>
          <div v-if="showPreview" class="editor-preview markdown" v-html="previewHtml"></div>
        </div>
      </div>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="editor-footer">
        <button class="btn btn-outline" :disabled="busy" @click="save('draft')">
          {{ busy ? '处理中…' : '保存草稿' }}
        </button>
        <button class="btn btn-primary" :disabled="busy" @click="save('published')">
          {{ busy ? '处理中…' : originStatus === 'published' ? '保存并发布' : '发布' }}
        </button>
      </div>
      </div>
    </div>
  </div>
</template>
