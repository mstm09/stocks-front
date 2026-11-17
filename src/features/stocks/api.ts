import { useQuery } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api, ApiError, unwrap } from '@/lib/api'

/** 1銘柄の指標。APIの仕様書から作られた型に、短い名前を付ける。 */
export type Indicators = components['schemas']['Indicators']
export type StockSummary = components['schemas']['StockSummary']

/** 1銘柄の指標（GET /stocks/{code}/indicators）。候補でない銘柄も取れる。 */
export function useIndicators(code: string, asOf: string | undefined) {
  return useQuery({
    queryKey: ['indicators', code, asOf ?? 'latest'],
    queryFn: async () =>
      unwrap(
        await api.GET('/stocks/{code}/indicators', {
          params: { path: { code }, query: { as_of: asOf } },
        }),
      ),
  })
}

/** 銘柄の検索（GET /stocks?q=）。コードの前方一致か、銘柄名の部分一致。 */
export function useStockSearch(q: string) {
  const word = q.trim()
  return useQuery({
    queryKey: ['stocks', word],
    queryFn: async () =>
      unwrap(await api.GET('/stocks', { params: { query: { q: word, limit: 10 } } })),
    enabled: word.length > 0, // 空のときは、APIを呼ばない
    staleTime: 5 * 60_000,
  })
}

/**
 * チャート画像（GET /stocks/{code}/chart）を取り、<img src> に渡せる形にする。
 *
 * <img src="/api/..."> と直接書かないのは、<img> は Authorization ヘッダー（トークン）を送れないため。
 * fetch でSVG（文字で書かれた画像）を取り、`data:` で始まるURLに埋め込んで渡す。
 */
export function useChartImage(code: string, asOf: string) {
  const query = useQuery({
    queryKey: ['chart', code, asOf],
    queryFn: async () => {
      const { data, response } = await api.GET('/stocks/{code}/chart', {
        params: { path: { code }, query: { as_of: asOf, format: 'svg' } },
        parseAs: 'text',
      })
      if (!data) throw new ApiError(response.status, 'チャートを取得できませんでした')
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`
    },
    staleTime: Infinity, // 過去の日付のチャートは変わらないので、取り直さない
  })

  return { url: query.data, error: query.error }
}
