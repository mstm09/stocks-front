// 注文（指値で仕掛け中）とロスカット候補の仮のデータ。開発サーバーを動かしている間だけ覚えている。
// 決まりは stock-analysis の docs/orders.md と同じ（呼値は通常のテーブルだけ）。

import type { components } from '../src/api/schema.d.ts'
import { findStock, indicatorsOf, LATEST_DATE } from './data.ts'
import { addTrade, getTrade, MockError } from './trades.ts'

type Schemas = components['schemas']
type OrderOut = Schemas['OrderOut']
type Order = Omit<OrderOut, 'name' | 'kind_label' | 'status_label' | 'is_expired' | 'risk_amount' | 'price' | 'price_date' | 'to_order_pct'>

const KIND_LABELS: Record<string, string> = { MARGIN_SHORT: '信用売り', MARGIN_LONG: '信用買い', SPOT: '現物買い' }
const STATUS_LABELS: Record<string, string> = { PENDING: '注文中', FILLED: '約定', CANCELLED: '取消' }

let nextId = 500
const orders: Order[] = [
  {
    id: 1, code: '67580', kind: 'MARGIN_SHORT', ordered_on: '2026-11-12', quantity: 200, order_price: 3080,
    expires_on: '2026-11-20', stop_loss_price: 3160, stop_loss_reason: '陰線の高値の1ティック上',
    limit_price: null, limit_quantity: null, memo: '戻り売り', status: 'PENDING', resolved_on: null, trade_id: null,
  },
]

function toOut(o: Order): OrderOut {
  const pending = o.status === 'PENDING'
  const bar = pending ? findStock(o.code)?.bars.at(-1) : undefined
  return {
    ...o,
    name: findStock(o.code)?.name ?? null,
    kind_label: KIND_LABELS[o.kind],
    status_label: STATUS_LABELS[o.status],
    is_expired: pending && o.expires_on != null && o.expires_on < LATEST_DATE,
    risk_amount: o.stop_loss_price == null ? null : Math.abs(o.order_price - o.stop_loss_price) * o.quantity,
    price: bar?.close ?? null,
    price_date: bar?.date ?? null,
    to_order_pct: bar ? Math.round(((o.order_price - bar.close) / bar.close) * 10000) / 100 : null,
  }
}

function find(id: number): Order {
  const order = orders.find((o) => o.id === id)
  if (!order) throw new MockError(404, `注文 ${id} がありません`)
  return order
}

function pending(id: number): Order {
  const order = find(id)
  if (order.status !== 'PENDING') throw new MockError(400, `注文 ${id} は、すでに${STATUS_LABELS[order.status]}です`)
  return order
}

function checkStop(kind: string, price: number, stop: number | null | undefined) {
  if (stop == null) return
  if (kind === 'MARGIN_SHORT' ? stop <= price : stop >= price) {
    throw new MockError(400, 'ロスカットは、損をする側の価格にしてください（売り建ては注文価格より上、買いは下）')
  }
}

export function listOrders(status: string | null): OrderOut[] {
  return orders.filter((o) => !status || o.status === status).map(toOut)
}

export function getOrder(id: number): OrderOut {
  return toOut(find(id))
}

export function addOrder(body: Schemas['OrderIn']): OrderOut {
  const code = body.code.length === 4 ? `${body.code}0` : body.code
  checkStop(body.kind, body.order_price, body.stop_loss_price)
  const order: Order = {
    expires_on: null, stop_loss_price: null, stop_loss_reason: null, limit_price: null, limit_quantity: null, memo: null,
    ...body, code, id: nextId++, status: 'PENDING', resolved_on: null, trade_id: null,
  }
  orders.push(order)
  return toOut(order)
}

export function updateOrder(id: number, body: Schemas['OrderUpdate']): OrderOut {
  const order = pending(id)
  const merged = { ...order, ...body }
  checkStop(merged.kind, merged.order_price, merged.stop_loss_price)
  Object.assign(order, merged)
  return toOut(order)
}

export function fillOrder(id: number, body: Schemas['OrderFillIn']): Schemas['TradeOut'] {
  const order = pending(id)
  const quantity = body.quantity ?? order.quantity
  if (quantity > order.quantity) throw new MockError(400, `約定の株数は、1〜${order.quantity}（注文の株数）で指定してください`)
  if (body.filled_on < order.ordered_on) throw new MockError(400, '約定日が、注文した日より前です')
  const trade = addTrade({
    code: order.code, kind: order.kind as Schemas['TradeIn']['kind'], opened_on: body.filled_on, quantity,
    entry_price: body.price ?? order.order_price, entry_fee: body.fee ?? 0,
    stop_loss_price: order.stop_loss_price, stop_loss_reason: order.stop_loss_reason,
    limit_price: order.limit_price, limit_quantity: null, memo: order.memo,
  })
  Object.assign(order, { status: 'FILLED', resolved_on: body.filled_on, trade_id: trade.id })
  return getTrade(trade.id)
}

export function cancelOrder(id: number, body: Schemas['OrderCancelIn']): OrderOut {
  const order = pending(id)
  Object.assign(order, { status: 'CANCELLED', resolved_on: body.cancelled_on ?? LATEST_DATE })
  return toOut(order)
}

export function deleteOrder(id: number): void {
  orders.splice(orders.indexOf(find(id)), 1)
}

/** 通常の呼値のテーブル（3,000円以下は1円、5,000円以下は5円…）で、高値より1つ上の価格。 */
function nextTickAbove(price: number): number {
  const table: [number, number][] = [[3000, 1], [5000, 5], [30000, 10], [50000, 50], [Infinity, 100]]
  const tick = (p: number) => table.find(([upper]) => p <= upper)![1]
  const t = tick(price)
  let above = Math.floor(price / t) * t + t
  const t2 = tick(above)
  if (t2 !== t) above = Math.ceil(above / t2) * t2
  return above
}

export function stopCandidates(code: string, asOf: string, entry: number | null): Schemas['StopCandidatesOut'] | null {
  const stock = findStock(code)
  const ind = stock && indicatorsOf(stock, asOf)
  if (!stock || !ind) return null
  const atr = ind.atr!
  const entryPrice = entry ?? ind.close!
  const [low, high] = [entryPrice + atr, entryPrice + 2 * atr]
  const bars = stock.bars.filter((b) => b.date <= asOf).slice(-15)
  const found = new Map<number, (typeof bars)[number]>()
  for (const b of bars) if (b.close < b.open) found.set(nextTickAbove(b.high), b)
  const pool = [...found.keys()].filter((p) => p >= low && p <= high)
  const picked: [number, number][] = []
  for (const target of [1, 1.5, 2]) {
    const left = pool.filter((p) => !picked.some(([x]) => x === p))
    if (left.length === 0) break
    const goal = entryPrice + atr * target
    left.sort((a, b) => Math.abs(a - goal) - Math.abs(b - goal) || a - b)
    picked.push([left[0], target])
  }
  return {
    code, as_of_date: asOf, entry_price: entryPrice, atr, range_low: low, range_high: high, lookback_days: 15,
    candidates: picked
      .sort((a, b) => a[0] - b[0])
      .map(([p, target]) => ({
        price: p, target_multiple: target, atr_multiple: Math.round(((p - entryPrice) / atr) * 100) / 100,
        distance: p - entryPrice, bar_date: found.get(p)!.date, bar_high: found.get(p)!.high,
      })),
  }
}
