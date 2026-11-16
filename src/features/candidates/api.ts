import { useQuery } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api, ApiError, unwrap } from '@/lib/api'

/** 1銘柄の指標。APIの仕様書から作られた型に、短い名前を付ける。 */
export type Indicators = components['schemas']['Indicators']

/** 売り建て候補の一覧（GET /candidates）。asOf を省略すると、最新日。 */
export function useCandidates(asOf: string | undefined) {
  return useQuery({
    // queryKey が変わると（＝基準日を変えると）、自動で取り直す
    queryKey: ['candidates', asOf ?? 'latest'],
    queryFn: async () =>
      unwrap(await api.GET('/candidates', { params: { query: { as_of: asOf } } })),
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
