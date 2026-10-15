import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base 用相对路径：打包产物可在任意静态目录（含本地预览面板）直接打开
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: Number(process.env.PORT) || 5173,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: Number(process.env.PORT) || 4173,
    strictPort: true,
  },
})
