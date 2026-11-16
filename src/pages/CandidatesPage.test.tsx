import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Indicators } from '@/features/stocks/api'
import { indicators, svgResponse } from '@/test/fixtures'
import { json, mockFetch, renderApp } from '@/test/render'

const two = [
  indicators(),
  indicators({ code: '72030', name: 'トヨタ自動車', close: 2800, atr_pct: 3.1 }),
]

function mockApi(candidates: Indicators[]) {
  return mockFetch((url) => {
    if (url.pathname === '/api/candidates') {
      return json({ as_of_date: '2026-08-14', count: candidates.length, candidates })
    }
    if (url.pathname.endsWith('/chart')) {
      return svgResponse()
    }
    return undefined
  })
}

/** 表の本体の行（見出しを除く）に出ている銘柄コードを、上から順に返す。 */
function codesInTable() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent)
}

afterEach(() => vi.restoreAllMocks())

test('候補を表で出す', async () => {
  mockApi(two)
  renderApp('/candidates')

  expect(await screen.findByText('日本取引所グループ')).toBeInTheDocument()
  expect(screen.getByText('2026-08-14 時点・2銘柄')).toBeInTheDocument()
  expect(codesInTable()).toEqual(['7203', '8697']) // 既定はコード順
})

test('見出しを押すと、並べ替える', async () => {
  mockApi(two)
  renderApp('/candidates')
  await screen.findByText('日本取引所グループ')

  await userEvent.click(screen.getByRole('button', { name: /終値/ }))
  expect(codesInTable()).toEqual(['8697', '7203']) // 安い順

  await userEvent.click(screen.getByRole('button', { name: /終値/ }))
  expect(codesInTable()).toEqual(['7203', '8697']) // 高い順
})

test('行を選ぶと、チャートと条件の判定を出す', async () => {
  mockApi(two)
  renderApp('/candidates')

  await userEvent.click(await screen.findByText('トヨタ自動車'))

  const detail = screen.getByRole('region', { name: '選択した銘柄' })
  const chart = await within(detail).findByRole('img')
  expect(chart.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  expect(within(detail).getByText('A 日足の並び')).toBeInTheDocument()
  expect(within(detail).getAllByLabelText('合格')).toHaveLength(6) // A〜F
  expect(within(detail).getAllByLabelText('判定なし')).toHaveLength(1) // G
})

test('基準日をURLで指定すると、その日でAPIを呼ぶ', async () => {
  const fetchMock = mockApi(two)
  renderApp('/candidates?as_of=2026-08-01')
  await screen.findByText('日本取引所グループ')

  const request = fetchMock.mock.calls[0][0] as Request
  expect(new URL(request.url).searchParams.get('as_of')).toBe('2026-08-01')
})

test('候補が0件なら、その旨を出す', async () => {
  mockApi([])
  renderApp('/candidates')
  expect(await screen.findByText('この日の候補はありません。')).toBeInTheDocument()
})

test('APIがエラーを返したら、その内容を出す', async () => {
  mockFetch(() => json({ detail: '指標がありません。先に calc-indicators を実行してください' }, 404))
  renderApp('/candidates')
  expect(await screen.findByRole('alert')).toHaveTextContent('指標がありません')
})
