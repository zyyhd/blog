<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { cloud } from '../cloud'
import PostCard from '../components/PostCard.vue'
import SiteSidebar from '../components/SiteSidebar.vue'
import Pagination from '../components/Pagination.vue'
import { SITE } from '../config'

const route = useRoute()
const PAGE_SIZE = 8

const posts = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref('')
const keyword = ref('')

const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : ''))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

// ===== 横幅随机名言（打字机效果）=====
const typedQuote = ref('')
let typeTimer = null

function pickQuote() {
  const quotes = SITE.quotes
  const q = quotes[Math.floor(Math.random() * quotes.length)]
  typedQuote.value = ''
  clearInterval(typeTimer)
  let i = 0
  typeTimer = setInterval(() => {
    i++
    typedQuote.value = q.slice(0, i)
    if (i >= q.length) clearInterval(typeTimer)
  }, 80)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    let query = cloud.database
      .from('posts')
      .select('id, title, summary, cover_url, tags, owner_name, views, created_at', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    if (tag.value) query = query.contains('tags', [tag.value])
    const kw = keyword.value.trim()
    if (kw) query = query.ilike('title', `%${kw}%`)
    const { data, count, error: err } = await query.range((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE - 1)
    if (err) {
      error.value = '加载失败：' + (err.message || '请稍后重试')
      return
    }
    posts.value = data || []
    total.value = count || 0
  } catch (e) {
    // 网络层异常（如当前访问域名未被云服务允许）也不能卡在加载态
    error.value = '加载失败：' + ((e && e.message) || '网络异常，请稍后重试')
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

function goPage(p) {
  page.value = p
  load()
}

function scrollToContent() {
  document.getElementById('home-content')?.scrollIntoView({ behavior: 'smooth' })
}

watch(tag, () => {
  page.value = 1
  load()
})

onMounted(() => {
  pickQuote()
  load()
})

onUnmounted(() => clearInterval(typeTimer))
</script>

<template>
  <div>
    <section class="hero-banner">
      <div class="hero-clouds" aria-hidden="true">
        <span class="cloud c1"></span>
        <span class="cloud c2"></span>
        <span class="cloud c3"></span>
        <span class="cloud c4"></span>
        <span class="cloud c5"></span>
      </div>
      <h1 class="hero-title">{{ SITE.siteTitle }}</h1>
      <p class="hero-sub">{{ typedQuote }}</p>
      <span class="hero-scroll" @click="scrollToContent">⌄</span>
    </section>

    <div class="container" id="home-content">
      <div class="home-layout">
        <div class="post-list">
          <div v-if="tag" class="filter-bar">
            <span style="font-size: 13.5px; color: var(--text-2)">标签筛选：</span>
            <router-link :to="{ name: 'home' }" class="filter-chip active">{{ tag }} ✕</router-link>
          </div>

          <div v-if="loading" class="loading-bar">加载中…</div>

          <div v-else-if="error" class="state-page">
            <div class="icon">⚠️</div>
            <h3>出错了</h3>
            <p>{{ error }}</p>
          </div>

          <div v-else-if="posts.length === 0" class="state-page">
            <div class="icon">📭</div>
            <h3>暂时没有文章</h3>
            <p>{{ tag ? '该标签下还没有文章' : '精彩内容即将呈现' }}</p>
          </div>

          <template v-else>
            <PostCard v-for="p in posts" :key="p.id" :post="p" />
          </template>

          <Pagination :page="page" :total-pages="totalPages" @change="goPage" />
        </div>

        <SiteSidebar />
      </div>
    </div>
  </div>
</template>
