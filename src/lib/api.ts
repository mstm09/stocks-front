import createClient from 'openapi-fetch'
import type { paths } from '@/api/schema'

/**
 * APIの場所。
 * - 開発中: `/api`（vite.config.ts のプロキシが stock-analysis へ中継する）
 * - 本番: nginx で同じドメインの `/api` をAPIへ中継する想定
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/**
 * APIを呼ぶための部品。
 * `paths` は OpenAPI から自動で作った型（src/api/schema.d.ts）。
 * これのおかげで、パスの打ち間違いや、返ってくる値の項目名の間違いを、実行前にエディタが教えてくれる。
 */
export const api = createClient<paths>({
  // `/api` を `http://localhost:5173/api` のような完全な形にする
  baseUrl: new URL(API_BASE, window.location.origin).href,
  // 呼ぶたびに、そのときの fetch を使う（テストで fetch を差し替えられるようにするため）
  fetch: (request) => globalThis.fetch(request),
})

// 開発中に API_TOKEN を使うときだけ、.env.local の VITE_API_TOKEN を送る。
// 注意: VITE_ で始まる値はビルド結果に埋め込まれ、ブラウザから見える。本番では nginx 側でヘッダーを付ける。
const token = import.meta.env.VITE_API_TOKEN
if (token) {
  api.use({
    onRequest({ request }) {
      request.headers.set('Authorization', `Bearer ${token}`)
      return request
    },
  })
}

/** APIがエラーを返したときに投げる。画面側は `error.message` を出せばよい。 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * openapi-fetch の結果（data / error / response）から、data だけを取り出す。
 * エラーのときは ApiError を投げる（TanStack Query がそれを受け取って、画面にエラーとして渡す）。
 */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data
  throw new ApiError(result.response.status, errorMessage(result.error, result.response.status))
}

function errorMessage(error: unknown, status: number): string {
  // FastAPIのエラーは { "detail": "..." } の形
  if (typeof error === 'object' && error !== null && 'detail' in error) {
    const detail = (error as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  if (status === 401) return '認証が必要です（API_TOKEN を確認してください）'
  return `APIがエラーを返しました（${status}）`
}
