import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for itch.io to load assets correctly
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})