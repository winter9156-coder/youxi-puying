import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,  // 允许外部隧道访问（如 serveo/ngrok）
    proxy: {
      '/proxy/ai': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/ai/, ''),
      }
    }
  },
})
