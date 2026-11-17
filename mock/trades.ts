// 売買記録の仮のデータ。登録や決済は、開発サーバーを動かしている間だけ覚えている（再起動で元に戻る）。
// 計算の決まりは、stock-analysis の docs/trades.md と同じ。

import type { components } from '../src/api/schema.d.ts'
import { findStock, LATEST_DATE } from './data.ts'

type Schemas = components['schemas']
type TradeOut = Schemas['TradeOut']
type Kind = Schemas['TradeIn']['kind']

type Exit = { id: number; closed_on: string; quantity: number; price: number; fee: number; memo: string | null }
type Trade = Required<Schemas['TradeIn']> & {
  id: number
  self_score: number | null
  self_review: string | null
  exits: Exit[]
}
type Cash = Schemas['CashOut']

/** 入力の間違い。APIは 400 か 404 と、理由（detail）を返す。 */
export class MockError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const KIND_LABELS: Record<Kind, string> = {
  MARGIN_SHORT: '信用売り',
  MARGIN_LONG: '信用買い',
  SPOT: '現物買い',
}

let nextId = 100
const trades: Trade[] = [
  {
    id: 1, code: '86970', kind: 'MARGIN_SHORT', opened_on: '2026-10-05', quantity: 300,
    entry_price: 1620, entry_fee: 0, stop_loss_price: 1700, stop_loss_reason: '直近の戻り高値の上',
    limit_price: 1450, memo: '60日線で頭を押さえられた', self_score: null, self_review: null,
    exits: [{ id: 1, closed_on: '2026-10-28', quantity: 100, price: 1540, fee: 300, memo: '一部を利益確定' }],
  },
  {
    id: 2, code: '67580', kind: 'MARGIN_SHORT', opened_on: '2026-09-10', quantity: 100,
    entry_price: 3900, entry_fee: 0, stop_loss_price: 4050, stop_loss_reason: '25日線の上',
    limit_price: null, memo: null, self_score: 70, self_review: '損切りは計画どおり。利確が早すぎた',
    exits: [{ id: 2, closed_on: '2026-10-01', quantity: 100, price: 3700, fee: 500, memo: null }],
  },
  {
    id: 3, code: '72030', kind: 'SPOT', opened_on: '2026-08-20', quantity: 100,
    entry_price: 4200, entry_fee: 0, stop_loss_price: 4000, stop_loss_reason: '25日線の下',
    limit_price: null, memo: '上昇トレンドの押し目', self_score: null, self_review: null, exits: [],
  },
]
const cash: Cash[] = [{ id: 1, occurred_on: '2026-08-01', amount: 3_000_000, memo: '入金' }]

const direction = (kind: string) => (kind === 'MARGIN_SHORT' ? -1 : 1)

function toOut(t: Trade): TradeOut {
  const exits = t.exits.map((e) => ({
    ...e,
    pnl: (e.price - t.entry_price) * e.quantity * direction(t.kind) - e.fee,
  }))
  const remaining = t.quantity - exits.reduce((a, e) => a + e.quantity, 0)
  const realized = exits.reduce((a, e) => a + e.pnl, 0) - t.entry_fee
  const risk = t.stop_loss_price == null ? null : Math.abs(t.entry_price - t.stop_loss_price) * t.quantity
  const closed = remaining === 0
  return {
    ...t,
    name: findStock(t.code)?.name ?? null,
    kind_label: KIND_LABELS[t.kind],
    status: closed ? 'CLOSED' : 'OPEN',
    remaining_quantity: remaining,
    closed_on: closed ? exits[exits.length - 1].closed_on : null,
    realized_pnl: realized,
    risk_amount: risk,
    r_multiple: closed && risk ? Math.round((realized / risk) * 100) / 100 : null,
    exits,
  }
}

function find(id: number): Trade {
  const trade = trades.find((t) => t.id === id)
  if (!trade) throw new MockError(404, `売買 ${id} がありません`)
  return trade
}

function checkStop(kind: string, entry: number, stop: number | null | undefined) {
  if (stop == null) return
  if (kind === 'MARGIN_SHORT' ? stop <= entry : stop >= entry) {
    throw new MockError(400, 'ロスカットは、損をする側の価格にしてください（売り建ては新規価格より上、買いは下）')
  }
}

export function listTrades(status: string | null): TradeOut[] {
  return trades.map(toOut).filter((t) => !status || t.status === status)
}

export function getTrade(id: number): TradeOut {
  return toOut(find(id))
}

export function addTrade(body: Schemas['TradeIn']): TradeOut {
  // 銘柄コードは4桁でも受け付けて、5桁にそろえる
  const code = body.code.length === 4 ? `${body.code}0` : body.code
  checkStop(body.kind, body.entry_price, body.stop_loss_price)
  const trade: Trade = {
    entry_fee: 0, stop_loss_price: null, stop_loss_reason: null, limit_price: null, memo: null,
    ...body, code, id: nextId++, self_score: null, self_review: null, exits: [],
  }
  trades.push(trade)
  return toOut(trade)
}

export function updateTrade(id: number, body: Schemas['TradeUpdate']): TradeOut {
  const trade = find(id)
  if ('stop_loss_price' in body) checkStop(trade.kind, trade.entry_price, body.stop_loss_price)
  const { entry_fee, ...rest } = body
  Object.assign(trade, rest)
  if (entry_fee != null) trade.entry_fee = entry_fee
  return toOut(trade)
}

export function deleteTrade(id: number): void {
  trades.splice(trades.indexOf(find(id)), 1)
}

export function addExit(id: number, body: Schemas['ExitIn']): TradeOut {
  const trade = find(id)
  const remaining = toOut(trade).remaining_quantity
  const quantity = body.quantity ?? remaining
  if (remaining === 0) throw new MockError(400, 'すでに、すべて決済しています')
  if (quantity > remaining) throw new MockError(400, `決済する株数が、残りの株数（${remaining}株）を超えています`)
  if (body.closed_on < trade.opened_on) throw new MockError(400, '決済の日が、新規の日より前です')
  trade.exits.push({
    id: nextId++, closed_on: body.closed_on, quantity, price: body.price, fee: body.fee ?? 0, memo: body.memo ?? null,
  })
  return toOut(trade)
}

export function deleteExit(id: number, exitId: number): TradeOut {
  const trade = find(id)
  const index = trade.exits.findIndex((e) => e.id === exitId)
  if (index < 0) throw new MockError(404, `売買 ${id} に、決済 ${exitId} がありません`)
  trade.exits.splice(index, 1)
  return toOut(trade)
}

export function listCash(): Cash[] {
  return cash
}

export function addCash(body: Schemas['CashIn']): Cash {
  if (body.amount === 0) throw new MockError(400, '金額は、0以外にしてください')
  const row = { memo: null, ...body, id: nextId++ }
  cash.push(row)
  return row
}

export function deleteCash(id: number): void {
  const index = cash.findIndex((c) => c.id === id)
  if (index < 0) throw new MockError(404, `入出金 ${id} がありません`)
  cash.splice(index, 1)
}

export function portfolio(asOf: string | null): Schemas['PortfolioOut'] {
  const day = asOf ?? LATEST_DATE
  const all = trades.map(toOut)
  const positions = all
    .filter((t) => t.status === 'OPEN')
    .map((trade) => {
      const bar = findStock(trade.code)?.bars.filter((b) => b.date <= day).at(-1)
      if (!bar) return { trade, price: null, price_date: null, market_value: null, unrealized_pnl: null, to_stop_pct: null }
      const dir = direction(trade.kind)
      const stop = trade.stop_loss_price
      return {
        trade,
        price: bar.close,
        price_date: bar.date,
        market_value: bar.close * trade.remaining_quantity,
        unrealized_pnl: (bar.close - trade.entry_price) * trade.remaining_quantity * dir,
        to_stop_pct: stop == null ? null : Math.round(((bar.close - stop) / bar.close) * dir * 1000) / 10,
      }
    })
  const netDeposit = cash.reduce((a, c) => a + c.amount, 0)
  const realized = all.reduce((a, t) => a + t.realized_pnl, 0)
  const unrealized = positions.reduce((a, p) => a + (p.unrealized_pnl ?? 0), 0)
  const spot = positions.filter((p) => p.trade.kind === 'SPOT')
  const spotCost = spot.reduce((a, p) => a + p.trade.entry_price * p.trade.remaining_quantity, 0)
  return {
    as_of_date: day,
    equity: netDeposit + realized + unrealized,
    cash: netDeposit + realized - spotCost,
    spot_value: spot.reduce((a, p) => a + (p.market_value ?? p.trade.entry_price * p.trade.remaining_quantity), 0),
    margin_exposure: positions
      .filter((p) => p.trade.kind !== 'SPOT')
      .reduce((a, p) => a + p.trade.entry_price * p.trade.remaining_quantity, 0),
    net_deposit: netDeposit,
    total_pnl: realized + unrealized,
    realized_pnl: realized,
    unrealized_pnl: unrealized,
    positions,
    unpriced_codes: positions.filter((p) => p.price == null).map((p) => p.trade.code),
  }
}
