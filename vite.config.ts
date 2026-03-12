import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'zustand/middleware': path.resolve(__dirname, './src/mock-middleware.ts')
    }
  },
  build: {
    // Target Safari 14+ and ES2020 to avoid emitting ES2022 syntax
    // (class static blocks, Object.hasOwn, etc.) that older iPhone Safari
    // versions cannot parse — which would cause a complete black screen.
    target: ['es2020', 'safari14'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
