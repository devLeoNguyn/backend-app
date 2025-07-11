import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: 5173, // Admin frontend port
    proxy: process.env.NODE_ENV === 'development' ? {
      '/api': {
        target: 'http://localhost:3003', // Backend server port
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:3003', // Backend server port
        ws: true,
        changeOrigin: true
      }
    } : undefined
  },
  build: {
    outDir: '../admin-dist',
    emptyOutDir: true,
  }
})
