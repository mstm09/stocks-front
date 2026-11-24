import type { Indicators } from '@/features/stocks/api'

/** テスト用の指標。変えたい項目だけ渡す。 */
export function indicators(over: Partial<Indicators> = {}): Indicators {
  return {
    code: '86970',
    name: '日本取引所グループ',
    as_of_date: '2026-08-14',
    close: 1215,
    ma10: 1231,
    ma25: 1249.5,
    ma60: 1259.8,
    wma13: 1290.2,
    wma26: 1410.7,
    range_high: 1560,
    range_low: 1205,
    range_zone: 'LOWER',
    daily_order_ok: true,
    daily_down_ok: true,
    weekly_order_ok: true,
    weekly_down_ok: true,
    turnover_below_days: 0,
    turnover_ok: true,
    tick_ok: null,
    is_short_candidate: true,
    atr: 24.3,
    atr_pct: 2,
    chart_url: '/stocks/86970/chart?as_of=2026-08-14',
    ...over,
  }
}

type Sizing = import('@/features/candidates/api').Sizing

/** テスト用の、建てられる株数の前提（口座全体 100万円 × 3%）。 */
export function sizing(over: Partial<Sizing> = {}): Sizing {
  return {
    equity: 1_000_000,
    equity_date: '2026-08-14',
    risk_pct: 3,
    risk_amount: 30_000,
    atr_multiple: 2,
    lot_size: 100,
    ...over,
  }
}

export function svgResponse() {
  return new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
}

type Trade = import('@/features/trades/api').Trade

/** テスト用の売買（信用売り・保有中）。変えたい項目だけ渡す。 */
export function trade(over: Partial<Trade> = {}): Trade {
  return {
    id: 1,
    code: '86970',
    name: '日本取引所グループ',
    kind: 'MARGIN_SHORT',
    kind_label: '信用売り',
    opened_on: '2026-08-03',
    quantity: 300,
    entry_price: 1000,
    entry_fee: 0,
    stop_loss_price: 1060,
    stop_loss_reason: '直近の戻り高値の上',
    initial_stop_price: 1060,
    limit_price: 900,
    limit_quantity: null,
    memo: '60日線で頭を押さえられた',
    self_score: null,
    self_review: null,
    status: 'OPEN',
    remaining_quantity: 300,
    closed_on: null,
    realized_pnl: 0,
    risk_amount: 18000,
    r_multiple: null,
    stop_pnl: -18000,
    exits: [],
    stop_changes: [],
    ...over,
  }
}

type Order = import('@/features/orders/api').Order

/** テスト用の注文（信用売り・注文中）。変えたい項目だけ渡す。 */
export function order(over: Partial<Order> = {}): Order {
  return {
    id: 5,
    code: '86970',
    name: '日本取引所グループ',
    kind: 'MARGIN_SHORT',
    kind_label: '信用売り',
    ordered_on: '2026-11-24',
    quantity: 300,
    order_price: 1000,
    expires_on: '2026-11-28',
    stop_loss_price: 1060,
    stop_loss_reason: '陰線の高値の1ティック上',
    limit_price: null,
    limit_quantity: null,
    memo: null,
    status: 'PENDING',
    status_label: '注文中',
    is_expired: false,
    resolved_on: null,
    trade_id: null,
    risk_amount: 18000,
    price: 980,
    price_date: '2026-11-24',
    to_order_pct: 2.04,
    ...over,
  }
}
