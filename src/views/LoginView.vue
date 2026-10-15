<script setup>
import { ref, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cloud } from '../cloud'
import { refreshSession } from '../stores/auth'

const route = useRoute()
const router = useRouter()

const activeTab = ref('password') // password | sms
const phone = ref('')
const password = ref('')
const code = ref('')
const setupPassword = ref('') // 首次创建账号时设置密码
const phoneError = ref('')
const loginError = ref('')
const sending = ref(false)
const submitting = ref(false)
const sent = ref(false)
const needSetupPassword = ref(false) // 验证码登录且账号不存在时，要求设置密码
const countdown = ref(0)
let timer = null

// 保存"获取验证码"的挑战状态（发送与校验分离，避免重复发送）
let pendingOtp = null

function onPhoneInput() {
  phoneError.value = ''
}

function validatePhone() {
  const p = phone.value.trim()
  if (!/^1\d{10}$/.test(p)) {
    phoneError.value = '请输入正确的 11 位手机号'
    return ''
  }
  phoneError.value = ''
  return p
}

// ===== 密码登录（日常使用，无需短信）=====
async function submitPasswordLogin() {
  const p = phone.value.trim()
  if (!/^1\d{10}$/.test(p)) {
    loginError.value = '请输入正确的 11 位手机号'
    return
  }
  if (!password.value) {
    loginError.value = '请输入密码'
    return
  }
  submitting.value = true
  loginError.value = ''
  const { error } = await cloud.auth.signInWithPassword({ phone: p, password: password.value })
  submitting.value = false
  if (error) {
    loginError.value = '手机号或密码不正确'
    return
  }
  await refreshSession()
  goBack()
}

// ===== 验证码登录（首次创建账号 / 忘记密码时备用）=====
async function sendCode() {
  const p = validatePhone()
  if (!p) return
  sending.value = true
  loginError.value = ''
  const { data, error } = await cloud.auth.sendOtp({ phone: p })
  sending.value = false
  if (error) {
    loginError.value = error.message || '验证码发送失败，请稍后重试'
    return
  }
  pendingOtp = { phone: p, verificationId: data.verificationId, isExistingUser: data.isExistingUser }
  // 账号不存在 → 必须设置密码（创建带密码的管理员账号）
  needSetupPassword.value = !data.isExistingUser
  sent.value = true
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function submitSmsLogin() {
  const p = phone.value.trim()
  if (!pendingOtp || pendingOtp.phone !== p) {
    loginError.value = '请先获取当前手机号的验证码'
    return
  }
  if (!code.value.trim()) {
    loginError.value = '请输入验证码'
    return
  }
  if (needSetupPassword.value) {
    if (setupPassword.value.length < 6 || setupPassword.value.length > 30) {
      loginError.value = '密码需 6-30 位'
      return
    }
  }
  submitting.value = true
  loginError.value = ''
  const { error } = await cloud.auth.verifyOtp({
    phone: pendingOtp.phone,
    verificationId: pendingOtp.verificationId,
    isExistingUser: pendingOtp.isExistingUser,
    token: code.value.trim(),
    password: needSetupPassword.value ? setupPassword.value : undefined,
  })
  submitting.value = false
  if (error) {
    loginError.value = error.message || '验证失败，请检查验证码'
    return
  }
  pendingOtp = null
  await refreshSession()
  goBack()
}

function switchTab(tab) {
  activeTab.value = tab
  loginError.value = ''
  phoneError.value = ''
}

function goBack() {
  // 内嵌在 /admin 页时：登录成功后原地显示后台，不跳走
  if (route.path.startsWith('/admin')) return
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    router.push(redirect)
  } else {
    router.push({ name: 'home' })
  }
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="container page-top-pad">
    <div class="auth-wrap">
    <div class="card auth-card">
      <h2 class="auth-title">管理员登录</h2>
      <p class="auth-sub">仅站长使用 · 账号为站长手机号</p>

      <div class="auth-tabs">
        <button type="button" class="auth-tab" :class="{ active: activeTab === 'password' }" @click="switchTab('password')">
          密码登录
        </button>
        <button type="button" class="auth-tab" :class="{ active: activeTab === 'sms' }" @click="switchTab('sms')">
          验证码登录
        </button>
      </div>

      <!-- 密码登录 -->
      <form v-if="activeTab === 'password'" @submit.prevent="submitPasswordLogin">
        <div class="form-item">
          <label class="form-label">手机号</label>
          <input v-model="phone" class="form-input" type="tel" inputmode="numeric" maxlength="11" placeholder="站长手机号" />
        </div>
        <div class="form-item">
          <label class="form-label">密码</label>
          <input v-model="password" class="form-input" type="password" maxlength="30" placeholder="登录密码" />
        </div>
        <div v-if="loginError" class="form-error" style="margin-bottom: 10px">{{ loginError }}</div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>
        <p class="auth-note">首次使用？切换到「验证码登录」创建账号并设置密码（仅需一次短信验证）。忘记密码时也可用验证码登录。</p>
      </form>

      <!-- 验证码登录 / 首次设置 -->
      <form v-else @submit.prevent="submitSmsLogin">
        <div class="form-item">
          <label class="form-label">手机号</label>
          <input
            v-model="phone"
            class="form-input"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            placeholder="请输入 11 位手机号"
            @input="onPhoneInput"
          />
          <div v-if="phoneError" class="form-error">{{ phoneError }}</div>
        </div>

        <div class="form-item">
          <label class="form-label">验证码</label>
          <div class="form-row">
            <input v-model="code" class="form-input" type="text" inputmode="numeric" maxlength="6" placeholder="6 位验证码" />
            <button class="btn btn-outline" type="button" :disabled="sending || countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s 后重发` : sending ? '发送中…' : '获取验证码' }}
            </button>
          </div>
        </div>

        <div v-if="needSetupPassword" class="form-item">
          <label class="form-label">设置登录密码<span class="req">*</span></label>
          <input v-model="setupPassword" class="form-input" type="password" maxlength="30" placeholder="6-30 位，之后可用密码登录" />
          <div class="form-hint">首次创建管理员账号，需设置一次密码</div>
        </div>

        <div v-if="loginError" class="form-error" style="margin-bottom: 10px">{{ loginError }}</div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="submitting || !sent">
          {{ submitting ? '处理中…' : needSetupPassword ? '创建账号并登录' : '登录' }}
        </button>
        <p class="auth-note">验证码登录仅在首次创建账号或忘记密码时使用；日常请在「密码登录」页签登录。</p>
      </form>
      </div>
    </div>
  </div>
</template>
