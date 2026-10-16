<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, signOut } from './stores/auth'
import { SITE } from './config'

const router = useRouter()
const displayName = computed(() => auth.profile?.display_name || auth.user?.name || SITE.authorName)

async function handleSignOut() {
  await signOut()
  router.push({ name: 'home' })
}

// ===== 全页背景：静态图打底 + 动态视频叠加 =====
const bgVideoRef = ref(null)

onMounted(() => {
  // 无障碍：用户偏好减弱动态效果时，停用视频只留静态图
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && bgVideoRef.value) {
    bgVideoRef.value.pause()
    bgVideoRef.value.style.display = 'none'
  }
})
</script>

<template>
  <div class="layout">
    <div class="page-bg" aria-hidden="true">
      <div class="page-bg-img" :style="{ backgroundImage: 'url(' + SITE.bgImage + ')' }"></div>
      <video
        ref="bgVideoRef"
        class="page-bg-video"
        autoplay
        muted
        loop
        playsinline
        :poster="SITE.bgImage"
      >
        <source :src="SITE.bgVideo" type="video/mp4" />
      </video>
      <div class="page-bg-glow"></div>
    </div>
    <header class="site-header">
      <div class="nav-bar">
        <router-link :to="{ name: 'home' }" class="logo">blog<span class="logo-dot">.cn</span></router-link>
        <nav class="nav">
          <router-link :to="{ name: 'home' }">首页</router-link>
          <router-link :to="{ name: 'archive' }">归档</router-link>
          <template v-if="auth.user">
            <router-link :to="{ name: 'editor-new' }" class="btn btn-primary btn-sm">+ 写文章</router-link>
            <div class="user-menu">
              <div class="avatar" :title="displayName"><img :src="SITE.avatar" :alt="displayName" /></div>
              <div class="dropdown">
                <div class="dropdown-name">{{ displayName }}</div>
                <router-link v-if="auth.isAdmin" :to="{ name: 'admin-dashboard' }">后台管理</router-link>
                <a href="javascript:void(0)" class="dropdown-danger" @click="handleSignOut">退出登录</a>
              </div>
            </div>
          </template>
        </nav>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <footer class="site-footer">
      <div class="container">© {{ new Date().getFullYear() }} blog.cn · Powered by 云服务</div>
    </footer>
  </div>
</template>
