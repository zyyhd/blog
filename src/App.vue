<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth, signOut } from './stores/auth'
import { SITE } from './config'

const router = useRouter()
const displayName = computed(() => auth.profile?.display_name || auth.user?.name || SITE.authorName)

async function handleSignOut() {
  await signOut()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="layout">
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

    <footer class="site-footer">
      <div class="container">© {{ new Date().getFullYear() }} blog.cn · Powered by 云服务</div>
    </footer>
  </div>
</template>
