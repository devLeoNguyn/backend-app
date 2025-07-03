import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: 'https://backend-app-lou3.onrender.com',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'https://backend-app-lou3.onrender.com',
        ws: true
      }
    }
  },
  build: {
    outDir: '../admin-dist',
    emptyOutDir: true,
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
