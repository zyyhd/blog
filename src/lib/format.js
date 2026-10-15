export function formatDate(input) {
  if (!input) return ''
  const d = new Date(input)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateShort(input) {
  if (!input) return ''
  const d = new Date(input)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatCount(n) {
  n = Number(n) || 0
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

// 由字符串生成稳定的蓝青色系渐变（无封面文章的默认封面，配合 Butterfly 风格）
export function coverGradient(seed) {
  let h = 0
  const s = String(seed || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const h1 = 185 + (h % 50) // 185~234：青绿到蓝
  const h2 = h1 + 35
  return `linear-gradient(135deg, hsl(${h1}, 70%, 58%), hsl(${h2}, 75%, 46%))`
}

export function initialOf(name) {
  return (String(name || '友').trim()[0] || '友').toUpperCase()
}
