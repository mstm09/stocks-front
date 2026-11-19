import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { json, mockFetch, renderApp } from '@/test/render'

afterEach(() => vi.restoreAllMocks())

function mockApi() {
  return mockFetch((url) => {
    const period = url.searchParams.get('period') ?? 'day'
    const market = url.searchParams.get('market')
    if (url.pathname === '/api/markets') return json(['グロース', 'プライム'])
    if (url.pathname === '/api/market/breadth') {
      return json({
        period,
        as_of_date: '2026-08-14',
        market,
        items: [
          {
            period, start_date: '2026-08-14', end_date: '2026-08-14', base_date: '2026-08-13',
            up: 2103, down: 1650, unchanged: 201, total: 3954, ratio: 127.5,
          },
          {
            period, start_date: '2026-08-13', end_date: '2026-08-13', base_date: '2026-08-12',
            up: 900, down: 0, unchanged: 10, total: 910, ratio: null,
          },
        ],
      })
    }
    if (url.pathname === '/api/market/sectors') {
      return json({
        period,
        as_of_date: '2026-08-14',
        market,
        start_date: '2026-08-14',
        end_date: '2026-08-14',
        base_date: '2026-08-13',
        sectors: [
          { rank: 1, sector: '海運業', change_pct: 1.254, median_pct: 0.9, up: 8, down: 2, unchanged: 0, total: 10 },
          { rank: 2, sector: '銀行業', change_pct: -0.8, median_pct: -0.5, up: 20, down: 60, unchanged: 2, total: 82 },
        ],
      })
    }
    return undefined
  })
}

/** その見出しの区画（section）を返す。 */
function section(name: RegExp) {
  return screen.getByRole('region', { name })
}

test('騰落と業種ランキングを出す', async () => {
  mockApi()
  renderApp('/market')

  const breadth = within(section(/騰落/))
  expect(await breadth.findByText('2103')).toBeInTheDocument()
  expect(breadth.getByText('127.5')).toBeInTheDocument()
  expect(breadth.getByRole('img', { name: '値上がり 2103、変わらず 201、値下がり 1650' })).toBeInTheDocument()
  // 値下がりが0の期間は、比率を出さない
  expect(within(breadth.getAllByRole('row')[2]).getByText('-')).toBeInTheDocument()

  const sectors = within(section(/業種別/))
  expect(await sectors.findByText('海運業')).toBeInTheDocument()
  expect(sectors.getByText('+1.25%')).toHaveClass('text-up')
  expect(sectors.getByText('-0.80%')).toHaveClass('text-down')
  expect(screen.getByText('2026-08-14 時点・前日比・全銘柄')).toBeInTheDocument()
})

test('期間と市場区分を変えると、その条件でAPIを呼ぶ', async () => {
  const fetchMock = mockApi()
  renderApp('/market')
  await screen.findByText('海運業')

  await userEvent.click(screen.getByRole('button', { name: '週' }))
  await userEvent.selectOptions(await screen.findByLabelText('市場区分'), 'プライム')

  expect(await screen.findByText('2026-08-14 時点・前週末比・プライム')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '週' })).toHaveAttribute('aria-pressed', 'true')
  const last = fetchMock.mock.calls
    .map((c) => new URL((c[0] as Request).url))
    .filter((u) => u.pathname === '/api/market/sectors')
    .at(-1)
  expect(last?.searchParams.get('period')).toBe('week')
  expect(last?.searchParams.get('market')).toBe('プライム')
})

test('業種は17業種が既定で、33業種に切り替えられる', async () => {
  const fetchMock = mockApi()
  renderApp('/market')
  await screen.findByText('海運業')

  const sectorCalls = () =>
    fetchMock.mock.calls
      .map((c) => new URL((c[0] as Request).url))
      .filter((u) => u.pathname === '/api/market/sectors')
  expect(screen.getByText(/業種別の上昇率ランキング（17業種）/)).toBeInTheDocument()
  expect(sectorCalls().at(-1)?.searchParams.get('kind')).toBe('17')

  await userEvent.click(screen.getByRole('button', { name: '33業種' }))
  expect(await screen.findByText(/業種別の上昇率ランキング（33業種）/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '33業種' })).toHaveAttribute('aria-pressed', 'true')
  expect(sectorCalls().at(-1)?.searchParams.get('kind')).toBe('33')
})

test('日足がないときは、APIの文言を出す', async () => {
  mockFetch((url) =>
    url.pathname.startsWith('/api/market/')
      ? json({ detail: '日足がありません。先に import-daily を実行してください' }, 404)
      : json([]),
  )
  renderApp('/market')
  expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('日足がありません')
})
