import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: false,
    port: 3005,
    host: '0.0.0.0',
  },
  build: {
    chunkSizeWarningLimit: 1000, // 1000kb
  },
})
