/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApi } from './mock/plugin'

// APIの場所。開発中は、手元で動かしている stock-analysis（uv run stock-analysis serve）につなぐ。
const API_TARGET = process.env.API_TARGET ?? 'http://127.0.0.1:8000'

// `npm run dev:mock` のときは、APIの代わりに仮のデータで答える（mock/）
const USE_MOCK = process.env.MOCK === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(USE_MOCK ? [mockApi()] : [])],
  resolve: {
    // `@/lib/api` のように、src からの位置で import できるようにする
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // 画面からは `/api/...` を呼ぶ。開発サーバーが `/api` を外してAPIへ中継する。
    // ブラウザから見ると同じ場所（localhost:5173）なので、CORSの設定がいらない。
    proxy: USE_MOCK ? undefined : {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
