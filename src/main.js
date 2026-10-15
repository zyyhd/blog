import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { auth, initAuth, watchAuth } from './stores/auth'
import './style.css'

async function bootstrap() {
  // 初始化失败（如网络/预览环境受限）也不能卡住页面，降级为未登录状态继续渲染
  try {
    await initAuth()
  } catch (e) {
    console.error('[boot] 初始化失败，以未登录状态继续：', e)
    auth.ready = true
  }
  try {
    watchAuth()
  } catch (e) {
    console.error('[boot] 会话监听注册失败：', e)
  }
  const app = createApp(App)
  app.use(router)
  await router.isReady()
  app.mount('#app')
}

bootstrap()
