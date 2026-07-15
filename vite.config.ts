import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 3000 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portal: resolve(__dirname, 'apps/portal/index.html'),
        habits: resolve(__dirname, 'apps/habits/index.html'),
        schedule: resolve(__dirname, 'apps/schedule/index.html'),
        todo: resolve(__dirname, 'apps/todo/index.html'),
        category: resolve(__dirname, 'apps/category/index.html'),
        diary: resolve(__dirname, 'apps/diary/index.html'),
        sleep: resolve(__dirname, 'apps/sleep/index.html'),
        finance: resolve(__dirname, 'apps/finance/index.html'),
        craving: resolve(__dirname, 'apps/craving/index.html'),
        menstruation: resolve(__dirname, 'apps/menstruation/index.html'),
        review: resolve(__dirname, 'apps/review/index.html'),
      },
    },
  },
})
