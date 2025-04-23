import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; connect-src 'self' https://*.ethers.org https://*.alchemy.com https://*.infura.io https://*.sepolia.org; frame-src 'self' https://*.metamask.io;"
    }
  }
})