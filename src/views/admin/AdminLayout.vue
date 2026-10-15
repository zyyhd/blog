<script setup>
import { auth } from '../../stores/auth'
import LoginView from '../LoginView.vue'
</script>

<template>
  <div class="container page-top-pad">
    <!-- 未登录：直接在 /admin 页内嵌登录表单 -->
    <LoginView v-if="!auth.user" />
    <!-- 已登录但非管理员 -->
    <div v-else-if="!auth.isAdmin" class="state-page">
      <div class="icon">🔒</div>
      <h3>无访问权限</h3>
      <p>该页面仅管理员可见</p>
    </div>
    <!-- 管理员：后台主体 -->
    <div v-else class="admin-wrap">
      <aside class="card admin-side">
        <router-link :to="{ name: 'admin-dashboard' }">📊 概览</router-link>
        <router-link :to="{ name: 'admin-posts' }">📝 文章管理</router-link>
        <router-link :to="{ name: 'admin-comments' }">💬 评论管理</router-link>
      </aside>
      <section class="admin-main">
        <router-view />
      </section>
    </div>
  </div>
</template>
