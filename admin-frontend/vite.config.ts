import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: 3003
  },
  build: {
    outDir: '../admin-dist',
    emptyOutDir: true,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.VITE_API_URL': '"https://backend-app-lou3.onrender.com"'
  }
})
