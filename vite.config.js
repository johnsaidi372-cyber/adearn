import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow access through the Cloudflare quick tunnel hostname.
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
