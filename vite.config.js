import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' supaya bisa dihosting di GitHub Pages (subfolder repo) tanpa pengaturan tambahan
export default defineConfig({ base: './', plugins: [react()] })
