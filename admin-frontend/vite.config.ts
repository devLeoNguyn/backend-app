import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: 3003,
    proxy: process.env.NODE_ENV === 'development' ? {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3003',
        ws: true
      }
    } : undefined
  },
  build: {
    outDir: '../admin-dist',
    emptyOutDir: true,
  }
})
