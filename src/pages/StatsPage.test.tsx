import { screen, within } from '@testing-library/react'
import { trade } from '@/test/fixtures'
import { json, mockFetch, renderApp } from '@/test/render'

afterEach(() => vi.restoreAllMocks())

const row = (over: object) => ({
  year: null, first_date: '2026-11-10', last_date: '2027-03-05', trades: 5, wins: 3, losses: 1, evens: 1,
  win_rate: 75, realized_pnl: 15_300, avg_win: 6_100, avg_loss: -3_000, max_win: 9_800, max_loss: -3_000,
  avg_score: 60, scored: 2, ...over,
})

function mockApi(stats: unknown) {
  mockFetch((url) => {
    if (url.pathname === '/api/stats') return json(stats)
    if (url.pathname === '/api/portfolio') {
      return json({
        as_of_date: '2026-11-24', equity: 0, cash: 0, spot_value: 0, margin_exposure: 0, net_deposit: 0,
        total_pnl: 12_000, realized_pnl: 0, unrealized_pnl: 12_000,
        positions: [
          { trade: trade(), price: 960, price_date: '2026-11-24', market_value: 288_000, unrealized_pnl: 12_000, to_stop_pct: 10.4 },
        ],
        unpriced_codes: [],
      })
    }
    return undefined
  })
}

test('累計と年ごとの成績、保有中の含み損益を出す（入出金は出さない）', async () => {
  mockApi({
    total: row({}),
    years: [
      row({ year: 2027, trades: 3, wins: 2, losses: 0, evens: 1, realized_pnl: 13_300, win_rate: 100, avg_loss: null, max_loss: null, avg_score: null, scored: 0 }),
      row({ year: 2026, trades: 2, wins: 1, losses: 1, evens: 0, realized_pnl: 2_000, win_rate: 50 }),
    ],
    open_trades: 1,
  })
  renderApp('/stats')

  const total = within(await screen.findByRole('region', { name: /累計/ }))
  expect(total.getByText('+15,300')).toHaveClass('text-up')
  expect(total.getByText('勝ち 3・負け 1・引き分け 1')).toBeInTheDocument()
  expect(total.getByText('75.0%')).toBeInTheDocument()
  expect(total.getByText('60.0点')).toBeInTheDocument()
  expect(total.getAllByText('-3,000')).toHaveLength(2) // 平均の損失と最大の損失
  expect(total.getAllByText('-3,000')[0]).toHaveClass('text-down')

  const years = within(screen.getByRole('region', { name: '年ごと' }))
  const rows = years.getAllByRole('row').slice(1)
  expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['2027年', '2026年'])
  expect(within(rows[0]).getByText('+13,300')).toBeInTheDocument()
  expect(within(rows[1]).getByText('50.0%')).toBeInTheDocument()

  const positions = within(screen.getByRole('region', { name: '保有中' }))
  expect(positions.getAllByText('+12,000').length).toBeGreaterThan(0)
  expect(screen.queryByText(/入出金|現金残高|口座全体/)).not.toBeInTheDocument()
})

test('決済した売買がないときは、その旨を出す', async () => {
  mockApi({ total: row({ trades: 0, wins: 0, losses: 0, evens: 0, win_rate: null }), years: [], open_trades: 0 })
  renderApp('/stats')
  expect(await screen.findByText(/まだ、すべて決済した売買がありません/)).toBeInTheDocument()
})

test('前の「口座」のURLは、成績の画面へ移す', async () => {
  mockApi({ total: row({ trades: 0 }), years: [], open_trades: 0 })
  renderApp('/portfolio')
  expect(await screen.findByRole('heading', { name: '成績', level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '成績' })).toHaveAttribute('aria-current', 'page')
})
