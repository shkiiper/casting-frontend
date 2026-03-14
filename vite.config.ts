import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'  // ← НОВОЕ

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()  // ← НОВОЕ — читает tsconfig.paths автоматически
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
