import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/iotdashboard/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/iotdashboardbackend': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true
      }
    }
  },
})
