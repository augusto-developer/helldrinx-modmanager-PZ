import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'build', // Serve assets from the 'build' folder (like builder_cat.png)
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    open: false, // Desativa abertura automática do navegador
  }
})
