<script setup>
import { ref, computed, onMounted } from 'vue'
import { cloud } from '../cloud'
import { SITE } from '../config'
import { formatCount, formatDateShort } from '../lib/format'

const loading = ref(true)
const posts = ref([])

const totalPosts = computed(() => posts.value.length)
const totalViews = computed(() => posts.value.reduce((s, p) => s + (Number(p.views) || 0), 0))
const latest = computed(() => posts.value.slice(0, 6))
const tagCloud = computed(() => {
  const count = new Map()
  for (const p of posts.value) {
    for (const t of p.tags || []) count.set(t, (count.get(t) || 0) + 1)
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)
})

onMounted(async () => {
  const { data } = await cloud.database
    .from('posts')
    .select('id, title, tags, views, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(500)
  posts.value = data || []
  loading.value = false
})
</script>

<template>
  <aside class="site-sidebar">
    <div class="card sidebar-card author-card">
      <div class="author-avatar"><img :src="SITE.avatar" :alt="SITE.authorName" /></div>
      <div class="author-name">{{ SITE.authorName }}</div>
      <div class="author-desc">记录与分享，热爱生活</div>
      <div class="author-stats">
        <div class="author-stat"><b>{{ loading ? '—' : totalPosts }}</b><span>文章</span></div>
        <div class="author-stat"><b>{{ loading ? '—' : formatCount(totalViews) }}</b><span>总阅读</span></div>
      </div>
    </div>
    <div class="card sidebar-card">
      <div class="sidebar-title">最新文章</div>
      <div class="sidebar-body">
        <template v-if="loading"><div class="loading-bar" style="padding: 10px 0">加载中…</div></template>
        <template v-else-if="latest.length">
          <router-link
            v-for="p in latest"
            :key="p.id"
            :to="{ name: 'post', params: { id: p.id } }"
            class="sidebar-link"
          >
            <span class="sidebar-link-title">{{ p.title }}</span>
            <time>{{ formatDateShort(p.created_at) }}</time>
          </router-link>
        </template>
        <p v-else style="font-size: 13px; color: var(--text-3)">暂无文章</p>
      </div>
    </div>

    <div v-if="tagCloud.length" class="card sidebar-card">
      <div class="sidebar-title">标签云</div>
      <div class="sidebar-body" style="display: flex; flex-wrap: wrap; gap: 8px; padding-top: 2px">
        <router-link
          v-for="[tag, count] in tagCloud"
          :key="tag"
          :to="{ name: 'home', query: { tag } }"
          class="tag"
        >{{ tag }} · {{ count }}</router-link>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-link-title {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
