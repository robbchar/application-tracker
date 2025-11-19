import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Use the classic JSX runtime to avoid relying on `react/jsx-dev-runtime`,
      // which can be problematic with some bundler configurations.
      jsxRuntime: 'classic',
    }),
  ],
})
