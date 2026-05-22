// vite.config.promo.ts
// Promo screenshot/visual site — independent build, no crxjs.
//
// Two non-default knobs make `/` work cleanly both in dev and in builds:
//   - `root: 'src/promo'` — the promo subapp's index.html lives here, so
//     `pnpm dev:promo` serves it at `/` (and `dist-promo/index.html` lands
//     at the build root, not under `dist-promo/src/promo/`).
//   - `base: './'` — emit relative asset paths (`./assets/...`), so the
//     built `dist-promo/index.html` opens straight from a `file://` URL
//     without needing a static server.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/promo'),
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: resolve(__dirname, 'dist-promo'),
    emptyOutDir: true,
  },
})
