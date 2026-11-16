// 仮のデータ。`npm run dev:mock` のときだけ使う（本番のファイルには入らない）。
// 毎回同じ値になるように、決まった種から作った乱数で株価を作る。

import type { components } from '../src/api/schema.d.ts'

type Schemas = components['schemas']
export type Indicators = Schemas['Indicators']
export type StockSummary = Schemas['StockSummary']

/** 仮のデータの最新日（金曜日）。 */
export const LATEST_DATE = '2026-11-13'
const DAYS = 320

type Trend = 'down' | 'up' | 'flat'

type Seed = { code: string; name: string; market: string; sector: string; base: number; trend: Trend }

const SEEDS: Seed[] = [
  { code: '86970', name: '日本取引所グループ', market: 'プライム', sector: 'その他金融業', base: 1500, trend: 'down' },
  { code: '72030', name: 'トヨタ自動車', market: 'プライム', sector: '輸送用機器', base: 2900, trend: 'up' },
  { code: '67580', name: 'ソニーグループ', market: 'プライム', sector: '電気機器', base: 3400, trend: 'down' },
  { code: '79740', name: '任天堂', market: 'プライム', sector: 'その他製品', base: 9800, trend: 'flat' },
  { code: '68610', name: 'キーエンス', market: 'プライム', sector: '電気機器', base: 61000, trend: 'down' },
  { code: '80580', name: '三菱商事', market: 'プライム', sector: '卸売業', base: 2700, trend: 'up' },
  { code: '99830', name: 'ファーストリテイリング', market: 'プライム', sector: '小売業', base: 46000, trend: 'down' },
  { code: '65010', name: '日立製作所', market: 'プライム', sector: '電気機器', base: 3900, trend: 'up' },
  { code: '40630', name: '信越化学工業', market: 'プライム', sector: '化学', base: 5600, trend: 'down' },
  { code: '60980', name: 'リクルートホールディングス', market: 'プライム', sector: 'サービス業', base: 8700, trend: 'down' },
  { code: '94330', name: 'KDDI', market: 'プライム', sector: '情報・通信業', base: 2500, trend: 'flat' },
  { code: '83060', name: '三菱UFJフィナンシャル・グループ', market: 'プライム', sector: '銀行業', base: 1900, trend: 'up' },
  { code: '45020', name: '武田薬品工業', market: 'プライム', sector: '医薬品', base: 4300, trend: 'down' },
  { code: '54010', name: '日本製鉄', market: 'プライム', sector: '鉄鋼', base: 3200, trend: 'down' },
  { code: '91010', name: '日本郵船', market: 'プライム', sector: '海運業', base: 5100, trend: 'flat' },
  { code: '25930', name: '伊藤園', market: 'スタンダード', sector: '食料品', base: 3300, trend: 'up' },
  { code: '70130', name: 'IHI運搬機械（仮）', market: 'スタンダード', sector: '機械', base: 1200, trend: 'down' },
  { code: '130A0', name: 'グロース銘柄サンプル（とても長い銘柄名の表示確認用）', market: 'グロース', sector: '情報・通信業', base: 800, trend: 'down' },
]

/** 種から、0以上1未満の乱数を順に返す関数を作る（mulberry32）。 */
function random(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 最新日からさかのぼって、平日だけを古い順に並べる。 */
function businessDays(latest: string, count: number): string[] {
  const days: string[] = []
  const d = new Date(`${latest}T00:00:00Z`)
  while (days.length < count) {
    const w = d.getUTCDay()
    if (w !== 0 && w !== 6) days.unshift(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return days
}

export const TRADING_DAYS = businessDays(LATEST_DATE, DAYS)

export type Bar = { date: string; open: number; high: number; low: number; close: number }

export type MockStock = Seed & { bars: Bar[] }

function makeBars(seed: Seed, index: number): Bar[] {
  const rand = random(1000 + index)
  const half = Math.floor(DAYS / 2)
  let noise = 0
  return TRADING_DAYS.map((date, i) => {
    let trend: number
    if (seed.trend === 'down') {
      // 前半は上がり、後半は下がり続ける（売り建て候補になる形）
      trend = i < half ? 1 + (0.5 * i) / half : 1.5 - (0.62 * (i - half)) / (DAYS - half)
    } else if (seed.trend === 'up') {
      trend = 1 + (0.6 * i) / DAYS
    } else {
      trend = 1 + 0.05 * Math.sin(i / 25)
    }
    noise += (rand() - 0.5) * 0.004
    const close = seed.base * (trend + noise)
    const open = close * (1 + (rand() - 0.5) * 0.012)
    const high = Math.max(open, close) * (1 + rand() * 0.008)
    const low = Math.min(open, close) * (1 - rand() * 0.008)
    const round = (v: number) => Math.round(v * 10) / 10
    return { date, open: round(open), high: round(high), low: round(low), close: round(close) }
  })
}

export const STOCKS: MockStock[] = SEEDS.map((s, i) => ({ ...s, bars: makeBars(s, i) }))

export function findStock(code: string): MockStock | undefined {
  return STOCKS.find((s) => s.code === code)
}

/** 基準日以前の日足だけを返す。 */
function barsUntil(stock: MockStock, asOf: string): Bar[] {
  return stock.bars.filter((b) => b.date <= asOf)
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** 終値の、最後から offset 日ずらした n 日の平均。足りなければ null。 */
export function movingAverage(closes: number[], n: number, offset = 0): number | null {
  const end = closes.length - offset
  return end < n ? null : mean(closes.slice(end - n, end))
}

const round2 = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100)

/** 1銘柄の指標。本物の判定（stock-analysis の judge.py）を、仮のデータ向けに簡単にしたもの。 */
export function indicatorsOf(stock: MockStock, asOf: string): Indicators | undefined {
  const bars = barsUntil(stock, asOf)
  if (bars.length < 140 || bars[bars.length - 1].date !== asOf) return undefined
  const closes = bars.map((b) => b.close)
  const close = closes[closes.length - 1]
  const ma = (n: number, offset = 0) => movingAverage(closes, n, offset)
  const [ma10, ma25, ma60] = [ma(10), ma(25), ma(60)]
  // 週足は、5営業日を1週とみなして近似する
  const [wma13, wma26] = [ma(65), ma(130)]
  const rangeHigh = Math.max(...bars.map((b) => b.high))
  const rangeLow = Math.min(...bars.map((b) => b.low))
  const position = (close - rangeLow) / (rangeHigh - rangeLow)
  const zone = position > 2 / 3 ? 'UPPER' : position > 1 / 3 ? 'MIDDLE' : 'LOWER'
  const dailyOrder = ma60! > ma25! && ma25! > ma10!
  const dailyDown = ma25! < ma(25, 1)! && ma60! < ma(60, 1)!
  const weeklyOrder = wma26! > wma13!
  const weeklyDown = wma13! < ma(65, 5)! && wma26! < ma(130, 5)!
  const atr = mean(bars.slice(-20).map((b) => b.high - b.low))
  // グロースの銘柄だけ、売買代金が足りない日が多いことにする
  const turnoverBelowDays = stock.market === 'グロース' ? 12 : stock.code.charCodeAt(1) % 4
  const turnoverOk = turnoverBelowDays <= 5
  return {
    code: stock.code,
    name: stock.name,
    as_of_date: asOf,
    close,
    ma10: round2(ma10),
    ma25: round2(ma25),
    ma60: round2(ma60),
    wma13: round2(wma13),
    wma26: round2(wma26),
    range_high: rangeHigh,
    range_low: rangeLow,
    range_zone: zone,
    daily_order_ok: dailyOrder,
    daily_down_ok: dailyDown,
    weekly_order_ok: weeklyOrder,
    weekly_down_ok: weeklyDown,
    turnover_below_days: turnoverBelowDays,
    turnover_ok: turnoverOk,
    tick_ok: null,
    is_short_candidate:
      dailyOrder && dailyDown && weeklyOrder && weeklyDown && zone !== 'UPPER' && turnoverOk,
    atr: round2(atr),
    atr_pct: round2((atr / close) * 100),
    chart_url: `/stocks/${stock.code}/chart?as_of=${asOf}`,
  }
}

/** ローソク足チャート（SVG）。本物はバックエンドが matplotlib で描く。これは形だけ似せたもの。 */
export function chartSvg(stock: MockStock, asOf: string): string | undefined {
  const all = barsUntil(stock, asOf)
  if (all.length === 0) return undefined
  const closes = all.map((b) => b.close)
  const bars = all.slice(-120)
  const first = all.length - bars.length
  const [w, h, left, right, top, bottom] = [1000, 600, 20, 70, 40, 40]
  const max = Math.max(...bars.map((b) => b.high))
  const min = Math.min(...bars.map((b) => b.low))
  const x = (i: number) => left + ((i + 0.5) * (w - left - right)) / bars.length
  const y = (v: number) => top + ((max - v) * (h - top - bottom)) / (max - min)
  const candle = (b: Bar, i: number) => {
    const color = b.close >= b.open ? 'red' : 'blue'
    const bodyTop = y(Math.max(b.open, b.close))
    const bodyHeight = Math.max(1, Math.abs(y(b.open) - y(b.close)))
    return (
      `<line x1="${x(i)}" x2="${x(i)}" y1="${y(b.high)}" y2="${y(b.low)}" stroke="${color}"/>` +
      `<rect x="${x(i) - 2.5}" y="${bodyTop}" width="5" height="${bodyHeight}" fill="${color}"/>`
    )
  }
  const line = (n: number, color: string) => {
    const points = bars
      .map((_, i) => {
        const end = first + i + 1
        return end < n ? null : `${x(i)},${y(mean(closes.slice(end - n, end)))}`
      })
      .filter(Boolean)
      .join(' ')
    return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/>`
  }
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => {
    const v = min + (max - min) * r
    return (
      `<line x1="${left}" x2="${w - right}" y1="${y(v)}" y2="${y(v)}" stroke="#e5e7eb"/>` +
      `<text x="${w - right + 8}" y="${y(v) + 4}" font-size="13" fill="#555">${Math.round(v)}</text>`
    )
  })
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="sans-serif">` +
    `<rect width="${w}" height="${h}" fill="white"/>` +
    `<text x="${w / 2}" y="24" text-anchor="middle" font-size="15" font-weight="bold">` +
    `${stock.code} ${stock.name}  ${asOf}（仮のデータ）</text>` +
    ticks.join('') +
    line(60, 'purple') +
    line(25, 'green') +
    line(10, 'orange') +
    bars.map(candle).join('') +
    `</svg>`
  )
}
