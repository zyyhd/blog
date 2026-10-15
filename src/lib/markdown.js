import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

// Markdown 渲染 + XSS 净化（所有文章/评论内容必须经此函数后再渲染）
export function renderMarkdown(src) {
  const html = marked.parse(String(src || ''))
  return DOMPurify.sanitize(html)
}
