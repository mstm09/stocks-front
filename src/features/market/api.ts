import { useQuery } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api, unwrap } from '@/lib/api'

export type Period = 'day' | 'week' | 'month'
export type BreadthItem = components['schemas']['BreadthItem']
export type SectorRankItem = components['schemas']['SectorRankItem']

/** 画面で選んだ条件。どのAPIにも同じものを渡す。 */
export type MarketFilter = {
  period: Period
  /** 基準日。undefined は、日足がある最新日 */
  asOf: string | undefined
  /** 市場区分名。undefined は全銘柄 */
  market: string | undefined
}

/** 騰落（GET /market/breadth）。新しい順に count 期間ぶん。 */
export function useBreadth(filter: MarketFilter, count: number) {
  return useQuery({
    queryKey: ['market', 'breadth', filter, count],
    queryFn: async () =>
      unwrap(
        await api.GET('/market/breadth', {
          params: {
            query: { period: filter.period, as_of: filter.asOf, market: filter.market, count },
          },
        }),
      ),
  })
}

/** 33業種の上昇率ランキング（GET /market/sectors）。 */
export function useSectorRanking(filter: MarketFilter) {
  return useQuery({
    queryKey: ['market', 'sectors', filter],
    queryFn: async () =>
      unwrap(
        await api.GET('/market/sectors', {
          params: { query: { period: filter.period, as_of: filter.asOf, market: filter.market } },
        }),
      ),
  })
}

/** 市場区分名の一覧（GET /markets）。絞り込みの選択肢に使う。 */
export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: async () => unwrap(await api.GET('/markets')),
    staleTime: Infinity, // めったに変わらないので、取り直さない
  })
}
