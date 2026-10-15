<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth, signOut } from './stores/auth'
import { SITE } from './config'

const router = useRouter()
const route = useRoute()
const displayName = computed(() => auth.profile?.display_name || auth.user?.name || SITE.authorName)

async function handleSignOut() {
  await signOut()
  router.push({ name: 'home' })
}

// ===== 全站花瓣飘落 =====
const petalsRef = ref(null)
// 后台/编辑器不显示，避免干扰写作
const showPetals = computed(() => !route.path.startsWith('/admin') && !route.path.startsWith('/editor'))

onMounted(() => {
  const host = petalsRef.value
  // 无障碍：用户偏好减弱动态效果时不生成
  if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const frag = document.createDocumentFragment()
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('span')
    p.className = 'petal'
    const size = (Math.random() * 8 + 7).toFixed(1)
    const dur = (Math.random() * 9 + 9).toFixed(1)
    const delay = (-Math.random() * 18).toFixed(1)
    const sway = (Math.random() * 30 + 18).toFixed(0)
    p.style.cssText =
      `left:${(Math.random() * 100).toFixed(2)}%;` +
      `width:${size}px;height:${size}px;` +
      `animation-duration:${dur}s;animation-delay:${delay}s;` +
      `--sway:${sway}px;opacity:${(Math.random() * 0.4 + 0.45).toFixed(2)}`
    frag.appendChild(p)
  }
  host.appendChild(frag)
})
</script>

<template>
  <div class="layout">
    <div class="page-bg" :style="{ backgroundImage: 'url(' + SITE.bgImage + ')' }" aria-hidden="true"></div>
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
                <router-link :to="{ name: 'admin-dashboard' }">后台管理</router-link>
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

    <div v-show="showPetals" ref="petalsRef" class="petal-layer" aria-hidden="true"></div>

    <footer class="site-footer">
      <div class="container">© {{ new Date().getFullYear() }} blog.cn · Powered by 云服务</div>
    </footer>
  </div>
</template>
