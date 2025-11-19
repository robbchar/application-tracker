import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react({
      // Use the classic JSX runtime to avoid relying on `react/jsx-dev-runtime`,
      // which can be problematic with some bundler configurations.
      jsxRuntime: 'classic',
    }),
  ],
})
