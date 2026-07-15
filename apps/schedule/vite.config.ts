import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 3007 },
  envDir: '../../',
  base: '/schedule/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
