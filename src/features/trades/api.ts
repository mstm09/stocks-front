import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api, ApiError, unwrap } from '@/lib/api'

type Schemas = components['schemas']
export type Trade = Schemas['TradeOut']
export type TradeIn = Schemas['TradeIn']
export type TradeUpdate = Schemas['TradeUpdate']
export type ExitIn = Schemas['ExitIn']
export type TradeExit = Schemas['ExitOut']
export type StopChange = Schemas['StopChangeOut']
export type StopChangeIn = Schemas['StopChangeIn']
export type Cash = Schemas['CashOut']
export type CashIn = Schemas['CashIn']
export type Position = Schemas['PositionOut']
export type TradeKind = TradeIn['kind']
export type TradeStatus = 'OPEN' | 'CLOSED'

export const KIND_LABELS: Record<TradeKind, string> = {
  MARGIN_SHORT: '信用売り',
  MARGIN_LONG: '信用買い',
  SPOT: '現物買い',
}

// ---- 読む（useQuery）

/** 売買の一覧（GET /trades）。status を省略すると全部。 */
export function useTrades(status: TradeStatus | undefined) {
  return useQuery({
    queryKey: ['trades', 'list', status ?? 'all'],
    queryFn: async () => unwrap(await api.GET('/trades', { params: { query: { status } } })),
  })
}

/** 売買1件（GET /trades/{id}）。 */
export function useTrade(id: number) {
  return useQuery({
    queryKey: ['trades', 'detail', id],
    queryFn: async () =>
      unwrap(await api.GET('/trades/{trade_id}', { params: { path: { trade_id: id } } })),
  })
}

/** 入出金の一覧（GET /cash）。 */
export function useCash() {
  return useQuery({
    queryKey: ['cash'],
    queryFn: async () => unwrap(await api.GET('/cash')),
  })
}

/** 口座全体（GET /portfolio）。 */
export function usePortfolio(asOf: string | undefined) {
  return useQuery({
    queryKey: ['portfolio', asOf ?? 'today'],
    queryFn: async () => unwrap(await api.GET('/portfolio', { params: { query: { as_of: asOf } } })),
  })
}

// ---- 書く（useMutation）
// 書いたあとは、売買・口座全体・入出金の「覚えている値」を古いものとして扱い、取り直させる。

function useRefresh() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      [['trades'], ['portfolio'], ['cash']].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    )
}

/** 中身を返さないAPI（204）の結果を確かめる。 */
function check(result: { error?: unknown; response: Response }) {
  if (!result.response.ok) unwrap(result)
}

/** 売買を登録する（POST /trades）。 */
export function useAddTrade() {
  const refresh = useRefresh()
  return useMutation<Trade, ApiError, TradeIn>({
    mutationFn: async (body) => unwrap(await api.POST('/trades', { body })),
    onSuccess: refresh,
  })
}

/** ロスカット・指値・メモ・自己採点を変える（PATCH /trades/{id}）。 */
export function useUpdateTrade(id: number) {
  const refresh = useRefresh()
  return useMutation<Trade, ApiError, TradeUpdate>({
    mutationFn: async (body) =>
      unwrap(await api.PATCH('/trades/{trade_id}', { params: { path: { trade_id: id } }, body })),
    onSuccess: refresh,
  })
}

/** 売買を、決済ごと消す（DELETE /trades/{id}）。 */
export function useDeleteTrade(id: number) {
  const refresh = useRefresh()
  return useMutation<void, ApiError, void>({
    mutationFn: async () =>
      check(await api.DELETE('/trades/{trade_id}', { params: { path: { trade_id: id } } })),
    onSuccess: refresh,
  })
}

/** 決済を登録する（POST /trades/{id}/exits）。 */
export function useAddExit(id: number) {
  const refresh = useRefresh()
  return useMutation<Trade, ApiError, ExitIn>({
    mutationFn: async (body) =>
      unwrap(
        await api.POST('/trades/{trade_id}/exits', { params: { path: { trade_id: id } }, body }),
      ),
    onSuccess: refresh,
  })
}

/** 決済を1件消す（DELETE /trades/{id}/exits/{exit_id}）。 */
export function useDeleteExit(id: number) {
  const refresh = useRefresh()
  return useMutation<Trade, ApiError, number>({
    mutationFn: async (exitId) =>
      unwrap(
        await api.DELETE('/trades/{trade_id}/exits/{exit_id}', {
          params: { path: { trade_id: id, exit_id: exitId } },
        }),
      ),
    onSuccess: refresh,
  })
}

/**
 * ロスカットの設定・変更を、履歴に1行足す（POST /trades/{id}/stops）。
 * price を null にすると、ロスカットを外した記録になる。
 */
export function useAddStopChange(id: number) {
  const refresh = useRefresh()
  return useMutation<Trade, ApiError, StopChangeIn>({
    mutationFn: async (body) =>
      unwrap(
        await api.POST('/trades/{trade_id}/stops', { params: { path: { trade_id: id } }, body }),
      ),
    onSuccess: refresh,
  })
}

/** ロスカットの履歴を1行消す（DELETE /trades/{id}/stops/{stop_id}）。登録の間違い用。 */
export function useDeleteStopChange(id: number) {
  const refresh = useRefresh()
  return useMutation<Trade, ApiError, number>({
    mutationFn: async (stopId) =>
      unwrap(
        await api.DELETE('/trades/{trade_id}/stops/{stop_id}', {
          params: { path: { trade_id: id, stop_id: stopId } },
        }),
      ),
    onSuccess: refresh,
  })
}

/** 入出金を登録する（POST /cash）。 */
export function useAddCash() {
  const refresh = useRefresh()
  return useMutation<Cash, ApiError, CashIn>({
    mutationFn: async (body) => unwrap(await api.POST('/cash', { body })),
    onSuccess: refresh,
  })
}

/** 入出金を消す（DELETE /cash/{id}）。 */
export function useDeleteCash() {
  const refresh = useRefresh()
  return useMutation<void, ApiError, number>({
    mutationFn: async (cashId) =>
      check(await api.DELETE('/cash/{cash_id}', { params: { path: { cash_id: cashId } } })),
    onSuccess: refresh,
  })
}
