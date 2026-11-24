// 仮のデータから、騰落と業種ランキングを計算する（本物は stock-analysis の market/stats.py）。

import type { components } from '../src/api/schema.d.ts'
import { SECTOR17, STOCKS, TRADING_DAYS, type MockStock } from './data.ts'

type Schemas = components['schemas']
type Period = 'day' | 'week' | 'month'
type Span = { start_date: string; end_date: string; base_date: string }

/** その日が属する期間の名前（同じ名前の日は、同じ週・同じ月）。 */
function groupKey(date: string, period: Period): string {
  if (period === 'day') return date
  if (period === 'month') return date.slice(0, 7)
  // 週は月曜はじまり。その週の月曜の日付を名前にする
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** 基準日までの期間を、新しい順に返す。 */
function spans(period: Period, asOf: string): Span[] {
  const groups: string[][] = []
  let lastKey = ''
  for (const date of TRADING_DAYS.filter((d) => d <= asOf)) {
    const key = groupKey(date, period)
    if (key !== lastKey) groups.push([])
    groups[groups.length - 1].push(date)
    lastKey = key
  }
  const result: Span[] = []
  for (let i = groups.length - 1; i >= 1; i--) {
    const prev = groups[i - 1]
    result.push({
      start_date: groups[i][0],
      end_date: groups[i][groups[i].length - 1],
      base_date: prev[prev.length - 1],
    })
  }
  return result
}

function changePct(stock: MockStock, span: Span): number | undefined {
  const base = stock.bars.find((b) => b.date === span.base_date)
  const end = stock.bars.find((b) => b.date === span.end_date)
  return base && end ? (end.close / base.close - 1) * 100 : undefined
}

function targets(market: string | null): MockStock[] {
  return market ? STOCKS.filter((s) => s.market === market) : STOCKS
}

function count(changes: number[]) {
  return {
    up: changes.filter((c) => c > 0).length,
    down: changes.filter((c) => c < 0).length,
    unchanged: changes.filter((c) => c === 0).length,
    total: changes.length,
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100

export function breadth(
  period: Period,
  asOf: string,
  n: number,
  market: string | null,
): Schemas['BreadthList'] {
  const items = spans(period, asOf)
    .slice(0, n)
    .map((span) => {
      const c = count(
        targets(market)
          .map((s) => changePct(s, span))
          .filter((v) => v !== undefined),
      )
      return { period, ...span, ...c, ratio: c.down ? round2(c.up / c.down) : null }
    })
  return { period, as_of_date: asOf, market, items }
}

export function sectors(
  period: Period,
  asOf: string,
  market: string | null,
  kind: '17' | '33',
): Schemas['SectorRanking'] {
  const span = spans(period, asOf)[0]
  if (!span) return { period, kind, as_of_date: asOf, market, sectors: [] }
  const bySector = new Map<string, number[]>()
  for (const stock of targets(market)) {
    const change = changePct(stock, span)
    if (change === undefined) continue
    const sector = kind === '17' ? (SECTOR17[stock.sector] ?? stock.sector) : stock.sector
    bySector.set(sector, [...(bySector.get(sector) ?? []), change])
  }
  const ranked = [...bySector.entries()]
    .map(([sector, changes]) => {
      const sorted = [...changes].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      return {
        sector,
        change_pct: round2(changes.reduce((a, b) => a + b, 0) / changes.length),
        median_pct: round2(median),
        ...count(changes),
      }
    })
    .sort((a, b) => b.change_pct - a.change_pct)
    .map((s, i) => ({ rank: i + 1, ...s }))
  return { period, kind, as_of_date: asOf, market, ...span, sectors: ranked }
}
