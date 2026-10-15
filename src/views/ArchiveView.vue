<script setup>
import { ref, computed, onMounted } from 'vue'
import { cloud } from '../cloud'
import { formatDateShort } from '../lib/format'

const loading = ref(true)
const error = ref('')
const posts = ref([])

const groups = computed(() => {
  const map = new Map()
  for (const p of posts.value) {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(p)
  }
  return [...map.entries()].map(([month, items]) => ({ month, items }))
})

const tagCloud = computed(() => {
  const count = new Map()
  for (const p of posts.value) {
    for (const t of p.tags || []) count.set(t, (count.get(t) || 0) + 1)
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
})

onMounted(async () => {
  const { data, error: err } = await cloud.database
    .from('posts')
    .select('id, title, tags, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(500)
  loading.value = false
  if (err) {
    error.value = '加载失败：' + (err.message || '请稍后重试')
    return
  }
  posts.value = data || []
})
</script>

<template>
  <div class="container page-top-pad">
    <div class="archive-wrap">
    <h2 class="admin-page-title">归档（{{ posts.length }} 篇）</h2>

    <div v-if="loading" class="loading-bar">加载中…</div>
    <div v-else-if="error" class="state-page"><div class="icon">⚠️</div><h3>出错了</h3><p>{{ error }}</p></div>

    <template v-else>
      <div v-if="tagCloud.length" class="tag-cloud">
        <router-link
          v-for="[tag, count] in tagCloud"
          :key="tag"
          :to="{ name: 'home', query: { tag } }"
          class="tag"
        >{{ tag }} · {{ count }}</router-link>
      </div>

      <div v-if="posts.length === 0" class="state-page">
        <div class="icon">📭</div>
        <h3>还没有文章</h3>
        <p>登录后写下第一篇文章吧</p>
      </div>

      <div v-for="g in groups" :key="g.month" class="archive-group">
        <h3 class="archive-group-title">{{ g.month }}（{{ g.items.length }} 篇）</h3>
        <div v-for="p in g.items" :key="p.id" class="archive-item">
          <time>{{ formatDateShort(p.created_at) }}</time>
          <router-link :to="{ name: 'post', params: { id: p.id } }">{{ p.title }}</router-link>
        </div>
      </div>
    </template>
    </div>
  </div>
</template>
