// vite.config.promo.ts
// Promo screenshot/visual site — independent build.
// Does NOT use crxjs. Outputs to dist-promo/ (physically isolated from extension dist/).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist-promo',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/promo/index.html'),
    },
  },
})
