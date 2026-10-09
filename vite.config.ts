import path from 'path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix: also load non-VITE_ vars (e.g. API_PROXY_TARGET) from .env — server-side only.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.API_PROXY_TARGET || 'https://ams-api.sanddata.eu'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // Local dev APIs use a self-signed certificate; only verify TLS for remote targets.
          secure: !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(apiTarget),
        },
      },
    },
  }
})
