import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { trade } from '@/test/fixtures'
import { json, mockFetch, renderApp, type SentRequest } from '@/test/render'

afterEach(() => vi.restoreAllMocks())

function mockApi() {
  const sent: SentRequest[] = []
  const cash = [{ id: 1, occurred_on: '2026-08-01', amount: 3_000_000, memo: '入金' }]
  mockFetch((url, request) => {
    if (request.method !== 'GET') sent.push(request)
    if (url.pathname === '/api/portfolio') {
      return json({
        as_of_date: url.searchParams.get('as_of') ?? '2026-08-14',
        equity: 3_012_000,
        cash: 3_000_000,
        spot_value: 0,
        margin_exposure: 300_000,
        net_deposit: 3_000_000,
        total_pnl: 12_000,
        realized_pnl: 0,
        unrealized_pnl: 12_000,
        positions: [
          { trade: trade(), price: 960, price_date: '2026-08-14', market_value: 288_000, unrealized_pnl: 12_000, to_stop_pct: 10.4 },
          { trade: trade({ id: 2, name: 'ロスカット超え', code: '72030' }), price: 1070, price_date: '2026-08-14', market_value: 321_000, unrealized_pnl: -21_000, to_stop_pct: -0.9 },
        ],
        unpriced_codes: ['99990'],
      })
    }
    if (url.pathname === '/api/cash' && request.method === 'POST') {
      const row = { id: 2, ...(request.body as object) }
      cash.push(row as (typeof cash)[number])
      return json(row, 201)
    }
    if (url.pathname === '/api/cash') return json(cash)
    return undefined
  })
  return sent
}

test('口座全体と、保有中の売買を出す', async () => {
  mockApi()
  renderApp('/portfolio')

  expect(await screen.findByText('3,012,000')).toBeInTheDocument()
  const positions = within(screen.getByRole('region', { name: '保有中' }))
  expect(positions.getByText('+12,000')).toHaveClass('text-up')
  expect(positions.getByText('-21,000')).toHaveClass('text-down')
  // 終値がロスカットを超えている売買は、目立たせる
  expect(positions.getByText('-0.9%')).toHaveClass('text-destructive')
  expect(screen.getByText('終値がなく、評価できなかった銘柄: 9999')).toBeInTheDocument()
})

test('出金は、マイナスの金額で送る', async () => {
  const sent = mockApi()
  const user = userEvent.setup()
  renderApp('/portfolio')

  await user.click(await screen.findByRole('button', { name: '入出金を登録' }))
  const dialog = within(await screen.findByRole('dialog', { name: '入出金を登録' }))
  await user.selectOptions(dialog.getByLabelText(/入金・出金/), '出金')
  await user.type(dialog.getByLabelText(/金額/), '50000')
  await user.type(dialog.getByLabelText('メモ'), '生活費')
  await user.click(dialog.getByRole('button', { name: '登録する' }))

  expect(await screen.findByText('-50,000')).toBeInTheDocument()
  expect(sent[0]).toMatchObject({ path: '/api/cash', body: { amount: -50000, memo: '生活費' } })
})
