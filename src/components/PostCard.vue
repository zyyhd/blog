<script setup>
import { computed } from 'vue'
import { formatCount, formatDateShort, coverGradient } from '../lib/format'

const props = defineProps({
  post: { type: Object, required: true },
})

const gradient = computed(() => coverGradient(props.post.title))
const coverStyle = computed(() =>
  props.post.cover_url
    ? { backgroundImage: `url("${props.post.cover_url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: gradient.value },
)
</script>

<template>
  <router-link :to="{ name: 'post', params: { id: post.id } }" class="post-card">
    <div class="post-cover" :style="coverStyle">
      <span v-if="!post.cover_url" class="cover-title">{{ post.title }}</span>
    </div>
    <div class="post-card-body">
      <h3 class="post-title">{{ post.title }}</h3>
      <p class="post-summary">{{ post.summary || '点击查看全文…' }}</p>
      <div class="post-meta">
        <span>📅 {{ formatDateShort(post.created_at) }}</span>
        <span>👀 {{ formatCount(post.views) }} 阅读</span>
        <span v-for="t in (post.tags || []).slice(0, 3)" :key="t" class="tag">{{ t }}</span>
      </div>
    </div>
  </router-link>
</template>
