import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import { resolve } from 'path'
import { execSync } from 'node:child_process'
import manifest from './manifest.json'
import pkg from './package.json'

// Single source of truth for the version is the git tag. A clean build sitting
// exactly on a tag (e.g. v0.4.0) yields "0.4.0"; a dev build N commits past the
// last tag yields "0.4.0.N" so the About box visibly tracks local work. Falls
// back to package.json when git/tags are unavailable (shallow clone, source zip).
function resolveVersion(): string {
  try {
    const desc = execSync('git describe --tags --long --match "v[0-9]*"', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const m = desc.match(/^v(\d+)\.(\d+)\.(\d+)-(\d+)-g[0-9a-f]+$/)
    if (m) {
      const [, major, minor, patch, ahead] = m
      return ahead === '0'
        ? `${major}.${minor}.${patch}`
        : `${major}.${minor}.${patch}.${ahead}`
    }
  } catch {
    // not a git checkout, or no matching tag — fall through to package.json
  }
  return pkg.version
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest: { ...manifest, version: resolveVersion() } }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
