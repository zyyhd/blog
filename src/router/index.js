import { createRouter, createWebHashHistory } from 'vue-router'
import { auth, initAuth } from '../stores/auth'

// 使用 hash 路由：静态托管无 history 回退，深链接必须始终命中 index.html
const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/post/:id', name: 'post', component: () => import('../views/PostDetailView.vue') },
  { path: '/archive', name: 'archive', component: () => import('../views/ArchiveView.vue') },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/editor', name: 'editor-new', component: () => import('../views/EditorView.vue'), meta: { requiresLogin: true } },
  { path: '/editor/:id', name: 'editor-edit', component: () => import('../views/EditorView.vue'), meta: { requiresLogin: true } },
  {
    // 管理员入口：未登录时由 AdminLayout 内嵌登录表单；
    // 已登录但非管理员由下方全局守卫拦回首页
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: '', name: 'admin-dashboard', component: () => import('../views/admin/AdminDashboard.vue') },
      { path: 'posts', name: 'admin-posts', component: () => import('../views/admin/AdminPostsView.vue') },
      { path: 'comments', name: 'admin-comments', component: () => import('../views/admin/AdminCommentsView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(_to, _from, saved) {
    return saved || { top: 0 }
  },
})

router.beforeEach(async (to) => {
  // 刷新页面时守卫可能先于启动初始化执行，先等到会话恢复完成再判断，
  // 否则会把已登录用户误判成未登录。initAuth 幂等，重复调用不会重放 OAuth 回调。
  if (!auth.ready) await initAuth()

  if (to.meta.requiresLogin && !auth.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // 后台：未登录时放行（由 AdminLayout 内嵌登录表单），已登录但非管理员回首页
  if (to.meta.requiresAdmin && auth.user && !auth.isAdmin) {
    return { name: 'home' }
  }
})
