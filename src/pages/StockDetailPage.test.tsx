import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { indicators, svgResponse } from '@/test/fixtures'
import { json, mockFetch, renderApp } from '@/test/render'

afterEach(() => vi.restoreAllMocks())

function mockApi() {
  return mockFetch((url) => {
    if (url.pathname === '/api/stocks/72030/indicators') {
      return json(
        indicators({
          code: '72030',
          name: 'トヨタ自動車',
          is_short_candidate: false,
          daily_order_ok: false,
          range_zone: 'UPPER',
        }),
      )
    }
    if (url.pathname === '/api/stocks/72030/chart') return svgResponse()
    if (url.pathname === '/api/stocks') {
      return json([
        { code: '72030', name: 'トヨタ自動車', market_name: 'プライム', sector33: '輸送用機器', is_active: true },
      ])
    }
    if (url.pathname.endsWith('/indicators')) {
      return json({ detail: '99990 の 2026-08-14 の指標がありません' }, 404)
    }
    return undefined
  })
}

test('候補でない銘柄も、指標とチャートを出す', async () => {
  mockApi()
  renderApp('/stocks/72030')

  expect(await screen.findByRole('heading', { name: /トヨタ自動車/ })).toBeInTheDocument()
  expect(screen.getByText('候補ではない')).toBeInTheDocument()
  expect(await screen.findByRole('img')).toHaveAttribute('alt', 'トヨタ自動車 のローソク足チャート')

  const panel = screen.getByRole('region', { name: '指標' })
  expect(within(panel).getAllByLabelText('不合格')).toHaveLength(2) // A（並び）と E（価格帯が上段）
  expect(within(panel).getAllByLabelText('合格')).toHaveLength(4)
})

test('基準日をURLで指定すると、その日でAPIを呼ぶ', async () => {
  const fetchMock = mockApi()
  renderApp('/stocks/72030?as_of=2026-08-01')
  await screen.findByRole('heading', { name: /トヨタ自動車/ })

  const urls = fetchMock.mock.calls.map((c) => new URL((c[0] as Request).url))
  const call = urls.find((u) => u.pathname.endsWith('/indicators'))
  expect(call?.searchParams.get('as_of')).toBe('2026-08-01')
})

test('指標がない銘柄は、APIの文言を出す', async () => {
  mockApi()
  renderApp('/stocks/99990')
  expect(await screen.findByRole('alert')).toHaveTextContent('指標がありません')
})

test('検索欄で探して、銘柄詳細へ移る', async () => {
  mockApi()
  renderApp('/')

  await userEvent.type(screen.getByRole('searchbox', { name: '銘柄を探す' }), 'トヨタ')
  await userEvent.click(await screen.findByRole('link', { name: /トヨタ自動車/ }))

  expect(await screen.findByRole('heading', { name: /トヨタ自動車/ })).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: '銘柄を探す' })).toHaveValue('') // 検索欄は空に戻る
})
