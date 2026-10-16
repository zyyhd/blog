import { reactive } from 'vue'
import { cloud } from '../cloud'

// 全局认证状态（响应式单例）
export const auth = reactive({
  ready: false, // 启动初始化（含 OAuth 回调处理）是否完成
  session: null,
  user: null,
  profile: null, // { id, owner_id, display_name, bio, role }
  isAdmin: false, // admin 或 super_admin
  isSuperAdmin: false, // 仅 super_admin：可管理用户角色
})

// 应用启动时调用一次：处理微信登录回调 → 恢复本地会话 → 加载用户档案
// 无论内部是否出错，ready 都必须置 true，避免页面永远卡在启动态
// 幂等：多处 await 时复用同一个 Promise，避免重复消费一次性 OAuth 回调参数
let initPromise = null
export function initAuth() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await restoreAuth()
      } catch (e) {
        console.error('[auth] 初始化失败，以未登录状态继续：', e)
      } finally {
        auth.ready = true
      }
    })()
  }
  return initPromise
}

async function restoreAuth() {
  const url = new URL(location.href)
  const hasCallback = url.searchParams.has('code') || url.searchParams.has('error')
  if (hasCallback) {
    const provider = url.searchParams.get('provider')
    if (provider === 'wechat' && typeof cloud.auth.handleWechatWebCallback === 'function') {
      const { data: session, error } = await cloud.auth.handleWechatWebCallback()
      if (error) {
        console.error('[auth] 微信登录回调失败：', error.message)
      } else if (session) {
        // 回调参数一次性，成功后必须清理，避免刷新时重放已消费的 code
        for (const key of ['code', 'state', 'provider']) url.searchParams.delete(key)
        history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
        await applySession(session)
        return
      }
    }
  }
  // 普通启动：恢复本地会话（失败不阻塞启动）
  try {
    const { data: session } = await cloud.auth.getSession()
    await applySession(session || null)
  } catch (e) {
    console.error('[auth] 会话恢复失败，以未登录状态继续：', e)
  }
}

async function applySession(session) {
  auth.session = session || null
  auth.user = session?.user ?? null
  auth.profile = null
  auth.isAdmin = false
  auth.isSuperAdmin = false
  if (auth.user) await ensureProfile()
}

// 重新拉取会话与档案（登录成功后由页面调用）
export async function refreshSession() {
  const { data: session } = await cloud.auth.getSession()
  await applySession(session || null)
}

async function ensureProfile() {
  const uid = auth.user?.id
  if (!uid) return
  const { data, error } = await cloud.database
    .from('profiles')
    .select('*')
    .eq('owner_id', uid)
    .maybeSingle()
  if (!error && data) {
    auth.profile = data
    auth.isAdmin = data.role === 'admin' || data.role === 'super_admin'
    auth.isSuperAdmin = data.role === 'super_admin'
    return
  }
  // 首次登录：创建档案（首个注册用户由数据库触发器自动设为超级管理员）
  const { data: created, error: insertError } = await cloud.database
    .from('profiles')
    .insert({ display_name: auth.user.name ?? null })
    .select()
    .single()
  if (!insertError && created) {
    auth.profile = created
    auth.isAdmin = created.role === 'admin' || created.role === 'super_admin'
    auth.isSuperAdmin = created.role === 'super_admin'
  }
}

export async function signOut() {
  await cloud.auth.signOut()
  await applySession(null)
}

// 监听会话状态变化（登出、过期等）
export function watchAuth() {
  cloud.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      auth.session = null
      auth.user = null
      auth.profile = null
      auth.isAdmin = false
      auth.isSuperAdmin = false
    }
  })
}
