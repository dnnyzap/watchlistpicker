import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em dev, o Vite repassa /api para o backend (localhost:8080 por padrao).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true },
    },
  },
})
