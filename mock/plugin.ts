// 仮のAPI。`npm run dev:mock` のとき、開発サーバーが `/api/...` に自分で答える。
// stock-analysis のAPIも、MySQLも、起動しなくてよい。

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { chartSvg, findStock, indicatorsOf, LATEST_DATE, SECTOR17, STOCKS } from './data.ts'
import { breadth, sectors } from './market.ts'
import * as orders from './orders.ts'
import * as trades from './trades.ts'
import { maxShares } from '../src/lib/sizing.ts'

type Result = { status?: number; body?: unknown; svg?: string }

const notFound = (detail: string): Result => ({ status: 404, body: { detail } })

async function readJson(req: IncomingMessage): Promise<never> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return JSON.parse(Buffer.concat(chunks).toString() || '{}') as never
}

/** パスとメソッドから、返す内容を決める。本物の実装は stock-analysis の api/app.py。 */
async function handle(req: IncomingMessage, url: URL): Promise<Result> {
  const method = req.method ?? 'GET'
  const path = url.pathname.replace(/^\/api/, '')
  const query = url.searchParams
  const asOf = query.get('as_of') ?? LATEST_DATE
  const market = query.get('market')
  const period = (query.get('period') ?? 'day') as 'day' | 'week' | 'month'
  let m: RegExpMatchArray | null

  if (path === '/health') return { body: { status: 'ok' } }

  if (path === '/candidates') {
    // 建てられる株数: 基準額（省略時100万円）× 3% ÷ 2ATR を100株単位で切り捨て（本物は settings の sizing）
    const capital = Number(query.get('capital') ?? 1_000_000)
    const sizing = { capital, risk_pct: 3, risk_amount: capital * 0.03, atr_multiple: 2, lot_size: 100 }
    const candidates = STOCKS.map((s) => indicatorsOf(s, asOf))
      .filter((i) => i?.is_short_candidate)
      .map((i) => ({
        ...i!,
        max_shares: maxShares(sizing.risk_amount, i!.atr == null ? null : i!.atr * 2, 100),
      }))
    return { body: { as_of_date: asOf, count: candidates.length, sizing, candidates } }
  }
  if (path === '/stocks') {
    const q = (query.get('q') ?? '').trim()
    const hits = STOCKS.filter((s) => q && (s.code.startsWith(q) || s.name.includes(q)))
    return {
      body: hits.slice(0, Number(query.get('limit') ?? 20)).map((s) => ({
        code: s.code, name: s.name, market_name: s.market, sector33: s.sector,
        sector17: SECTOR17[s.sector] ?? null, is_active: true,
      })),
    }
  }
  if (path === '/markets') return { body: [...new Set(STOCKS.map((s) => s.market))].sort() }

  if ((m = path.match(/^\/stocks\/([^/]+)\/indicators$/))) {
    const stock = findStock(m[1])
    const indicators = stock && indicatorsOf(stock, asOf)
    return indicators ? { body: indicators } : notFound(`${m[1]} の ${asOf} の指標がありません`)
  }
  if ((m = path.match(/^\/stocks\/([^/]+)\/stop-candidates$/))) {
    const entry = query.get('entry_price')
    const result = orders.stopCandidates(m[1], asOf, entry == null ? null : Number(entry))
    return result ? { body: result } : notFound(`${m[1]} の ${asOf} の指標がありません`)
  }
  if ((m = path.match(/^\/stocks\/([^/]+)\/chart$/))) {
    const stock = findStock(m[1])
    const svg = stock && chartSvg(stock, asOf)
    return svg ? { svg } : notFound(`${m[1]} の日足がありません`)
  }

  if (path === '/market/breadth') {
    return { body: breadth(period, asOf, Number(query.get('count') ?? 1), market) }
  }
  if (path === '/market/sectors') {
    const kind = query.get('kind') === '33' ? '33' : '17'
    return { body: sectors(period, asOf, market, kind) }
  }

  if (path === '/trades' && method === 'GET') return { body: trades.listTrades(query.get('status')) }
  if (path === '/trades' && method === 'POST') {
    return { status: 201, body: trades.addTrade(await readJson(req)) }
  }
  if ((m = path.match(/^\/trades\/(\d+)$/))) {
    const id = Number(m[1])
    if (method === 'GET') return { body: trades.getTrade(id) }
    if (method === 'PATCH') return { body: trades.updateTrade(id, await readJson(req)) }
    if (method === 'DELETE') return (trades.deleteTrade(id), { status: 204 })
  }
  if ((m = path.match(/^\/trades\/(\d+)\/exits$/)) && method === 'POST') {
    return { status: 201, body: trades.addExit(Number(m[1]), await readJson(req)) }
  }
  if ((m = path.match(/^\/trades\/(\d+)\/stops$/)) && method === 'POST') {
    return { status: 201, body: trades.addStop(Number(m[1]), await readJson(req)) }
  }
  if ((m = path.match(/^\/trades\/(\d+)\/stops\/(\d+)$/)) && method === 'DELETE') {
    return { body: trades.deleteStop(Number(m[1]), Number(m[2])) }
  }
  if ((m = path.match(/^\/trades\/(\d+)\/exits\/(\d+)$/)) && method === 'DELETE') {
    return { body: trades.deleteExit(Number(m[1]), Number(m[2])) }
  }
  if (path === '/orders' && method === 'GET') return { body: orders.listOrders(query.get('status')) }
  if (path === '/orders' && method === 'POST') {
    return { status: 201, body: orders.addOrder(await readJson(req)) }
  }
  if ((m = path.match(/^\/orders\/(\d+)$/))) {
    const id = Number(m[1])
    if (method === 'GET') return { body: orders.getOrder(id) }
    if (method === 'PATCH') return { body: orders.updateOrder(id, await readJson(req)) }
    if (method === 'DELETE') return (orders.deleteOrder(id), { status: 204 })
  }
  if ((m = path.match(/^\/orders\/(\d+)\/fill$/)) && method === 'POST') {
    return { status: 201, body: orders.fillOrder(Number(m[1]), await readJson(req)) }
  }
  if ((m = path.match(/^\/orders\/(\d+)\/cancel$/)) && method === 'POST') {
    return { body: orders.cancelOrder(Number(m[1]), await readJson(req)) }
  }
  if (path === '/cash' && method === 'GET') return { body: trades.listCash() }
  if (path === '/cash' && method === 'POST') {
    return { status: 201, body: trades.addCash(await readJson(req)) }
  }
  if ((m = path.match(/^\/cash\/(\d+)$/)) && method === 'DELETE') {
    return (trades.deleteCash(Number(m[1])), { status: 204 })
  }
  if (path === '/portfolio') return { body: trades.portfolio(query.get('as_of')) }
  if (path === '/stats') return { body: trades.stats() }

  return notFound(`仮のAPIに ${method} ${path} がありません`)
}

function send(res: ServerResponse, result: Result) {
  res.statusCode = result.status ?? 200
  if (result.svg !== undefined) {
    res.setHeader('Content-Type', 'image/svg+xml')
    res.end(result.svg)
  } else if (result.body !== undefined) {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result.body))
  } else {
    res.end()
  }
}

export function mockApi(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        handle(req, new URL(req.originalUrl ?? req.url ?? '/', 'http://localhost'))
          .catch((e: unknown): Result => {
            if (e instanceof trades.MockError) return { status: e.status, body: { detail: e.message } }
            return { status: 500, body: { detail: String(e) } }
          })
          .then((result) => send(res, result))
      })
    },
  }
}
