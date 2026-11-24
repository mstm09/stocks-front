import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import type { Trade } from '@/features/trades/api'
import { api, ApiError, unwrap } from '@/lib/api'

type Schemas = components['schemas']
export type Order = Schemas['OrderOut']
export type OrderIn = Schemas['OrderIn']
export type OrderUpdate = Schemas['OrderUpdate']
export type OrderFillIn = Schemas['OrderFillIn']
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED'
export type StopCandidates = Schemas['StopCandidatesOut']
export type StopCandidate = Schemas['StopCandidateOut']

// ---- 読む（useQuery）

/** 注文の一覧（GET /orders）。status を省略すると全部。 */
export function useOrders(status: OrderStatus | undefined) {
  return useQuery({
    queryKey: ['orders', status ?? 'all'],
    queryFn: async () => unwrap(await api.GET('/orders', { params: { query: { status } } })),
  })
}

/**
 * 売り建てのロスカット候補（GET /stocks/{code}/stop-candidates）。
 * 注文価格（entryPrice）が決まっていないあいだは、呼ばない。
 * 注文価格を打ち直しているあいだは、前の候補を出したままにする（表示がちらつかないように）。
 */
export function useStopCandidates(code: string, entryPrice: number | null, asOf: string | undefined) {
  return useQuery({
    queryKey: ['stop-candidates', code, entryPrice, asOf ?? 'latest'],
    queryFn: async () =>
      unwrap(
        await api.GET('/stocks/{code}/stop-candidates', {
          params: { path: { code }, query: { entry_price: entryPrice ?? undefined, as_of: asOf } },
        }),
      ),
    enabled: entryPrice != null && entryPrice > 0,
    placeholderData: keepPreviousData,
  })
}

// ---- 書く（useMutation）
// 書いたあとは、注文・売買・口座全体の「覚えている値」を古いものとして扱い、取り直させる。

function useRefresh() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      [['orders'], ['trades'], ['portfolio']].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    )
}

/** 注文を登録する（POST /orders）。 */
export function useAddOrder() {
  const refresh = useRefresh()
  return useMutation<Order, ApiError, OrderIn>({
    mutationFn: async (body) => unwrap(await api.POST('/orders', { body })),
    onSuccess: refresh,
  })
}

/** 注文中の注文を変える（PATCH /orders/{id}）。 */
export function useUpdateOrder(id: number) {
  const refresh = useRefresh()
  return useMutation<Order, ApiError, OrderUpdate>({
    mutationFn: async (body) =>
      unwrap(await api.PATCH('/orders/{order_id}', { params: { path: { order_id: id } }, body })),
    onSuccess: refresh,
  })
}

/** 約定を登録する（POST /orders/{id}/fill）。作った売買を返す。 */
export function useFillOrder(id: number) {
  const refresh = useRefresh()
  return useMutation<Trade, ApiError, OrderFillIn>({
    mutationFn: async (body) =>
      unwrap(
        await api.POST('/orders/{order_id}/fill', { params: { path: { order_id: id } }, body }),
      ),
    onSuccess: refresh,
  })
}

/** 注文を取り消す（POST /orders/{id}/cancel）。 */
export function useCancelOrder(id: number) {
  const refresh = useRefresh()
  return useMutation<Order, ApiError, string>({
    mutationFn: async (cancelledOn) =>
      unwrap(
        await api.POST('/orders/{order_id}/cancel', {
          params: { path: { order_id: id } },
          body: { cancelled_on: cancelledOn },
        }),
      ),
    onSuccess: refresh,
  })
}

/** 注文を消す（DELETE /orders/{id}）。約定して作った売買は残る。 */
export function useDeleteOrder(id: number) {
  const refresh = useRefresh()
  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const result = await api.DELETE('/orders/{order_id}', { params: { path: { order_id: id } } })
      if (!result.response.ok) unwrap(result)
    },
    onSuccess: refresh,
  })
}
