import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Indicators } from '@/features/stocks/api'
import { indicators, sizing, svgResponse } from '@/test/fixtures'
import { json, mockFetch, renderApp, type SentRequest } from '@/test/render'

const two = [
  indicators(),
  indicators({ code: '72030', name: 'トヨタ自動車', close: 2800, atr: 86.8, atr_pct: 3.1 }),
]

function mockApi(candidates: Indicators[]) {
  return mockFetch((url) => {
    if (url.pathname === '/api/candidates') {
      return json({ as_of_date: '2026-08-14', count: candidates.length, sizing: sizing(), candidates })
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

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear() // 基準額は、ブラウザに覚える
})

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

test('ATRは円で出し、見出しで並べ替えられる', async () => {
  mockApi(two)
  renderApp('/candidates')
  await screen.findByText('日本取引所グループ')

  const toyota = screen.getByText('トヨタ自動車').closest('tr')!
  expect(within(toyota).getByText('86.8')).toBeInTheDocument()
  expect(within(toyota).queryByText('3.1%')).not.toBeInTheDocument()
  // 売買代金が基準以下だった日数は、表には出さない（右の詳細の条件Fに出す）
  expect(screen.queryByRole('columnheader', { name: /代金/ })).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /ATR/ }))
  expect(codesInTable()[0]).not.toBe('7203') // 小さい順。トヨタ（86.8円）は最後
  expect(codesInTable().at(-1)).toBe('7203')
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

test('建てられる株数を出し、0株の行はグレーにする（選んでチャートは見られる）', async () => {
  // 株数は画面で計算する（基準額100万円 × 3% ÷ 2ATR）。APIの max_shares は使わない
  mockApi([
    indicators({ max_shares: 999 }), // ATR 24.3円 → 30,000 ÷ 48.6 = 617 → 600株
    indicators({ code: '72030', name: 'トヨタ自動車', atr: 160 }), // 30,000 ÷ 320 = 93 → 0株
  ])
  renderApp('/candidates')
  await screen.findByText('日本取引所グループ')

  expect(screen.getByLabelText('株数の基準額')).toHaveValue(100)
  // 移動平均の値は、表には出さない（右の詳細とチャートで見る）
  expect(screen.queryByRole('columnheader', { name: /10日|25日|60日|13週|26週/ })).not.toBeInTheDocument()
  expect(screen.getByText(/× 3% ＝ 許容損失 3万円 ÷ 2ATR/)).toBeInTheDocument()
  const jpx = screen.getByText('日本取引所グループ').closest('tr')!
  const toyota = screen.getByText('トヨタ自動車').closest('tr')!
  expect(within(jpx).getByText('600')).toBeInTheDocument()
  expect(jpx).not.toHaveAttribute('data-cannot-open')
  expect(toyota).toHaveAttribute('data-cannot-open', 'true')

  await userEvent.click(toyota)
  expect(toyota).toHaveAttribute('aria-selected', 'true')
  expect(await screen.findByRole('img')).toBeInTheDocument() // チャートは出る

  await userEvent.click(screen.getByRole('button', { name: /株数/ }))
  expect(codesInTable()).toEqual(['7203', '8697']) // 少ない順
})

test('基準額を変えると、すぐ株数とグレーが変わり、次に開いたときも覚えている', async () => {
  mockApi([indicators(), indicators({ code: '72030', name: 'トヨタ自動車', atr: 160 })])
  const { unmount } = renderApp('/candidates')
  await screen.findByText('日本取引所グループ')

  const input = screen.getByLabelText('株数の基準額')
  await userEvent.clear(input)
  expect(screen.getByText('基準額を入れると、建てられる株数を計算します')).toBeInTheDocument()
  await userEvent.type(input, '200')
  // 200万円 × 3% = 6万円。トヨタ 60,000 ÷ 320 = 187 → 100株、JPX 60,000 ÷ 48.6 = 1,234 → 1,200株
  expect(screen.getByText(/許容損失 6万円/)).toBeInTheDocument()
  const toyota = screen.getByText('トヨタ自動車').closest('tr')!
  expect(within(toyota).getByText('100')).toBeInTheDocument()
  expect(toyota).not.toHaveAttribute('data-cannot-open')
  expect(within(screen.getByText('日本取引所グループ').closest('tr')!).getByText('1,200')).toBeInTheDocument()

  unmount()
  renderApp('/candidates') // URLに capital がなくても、前に入れた値を使う
  expect(await screen.findByLabelText('株数の基準額')).toHaveValue(200)
})

test('URLの基準額を使う', async () => {
  mockApi([indicators()])
  renderApp('/candidates?capital=50')
  expect(await screen.findByLabelText('株数の基準額')).toHaveValue(50)
  expect(screen.getByText(/許容損失 1.5万円/)).toBeInTheDocument()
})

const STOPS = {
  code: '86970',
  as_of_date: '2026-08-14',
  entry_price: 1215,
  atr: 24.3,
  range_low: 1239.3,
  range_high: 1263.6,
  lookback_days: 15,
  candidates: [
    { price: 1240, target_multiple: 1, atr_multiple: 1.03, distance: 25, bar_date: '2026-08-05', bar_high: 1239 },
    { price: 1251, target_multiple: 1.5, atr_multiple: 1.48, distance: 36, bar_date: '2026-08-07', bar_high: 1250 },
    { price: 1263, target_multiple: 2, atr_multiple: 1.98, distance: 48, bar_date: '2026-07-30', bar_high: 1262.5 },
  ],
}

test('注文ボタンで、ロスカット候補と株数つきの注文を登録できる', async () => {
  const sent: SentRequest[] = []
  mockFetch((url, req) => {
    if (url.pathname === '/api/candidates') {
      return json({
        as_of_date: '2026-08-14',
        count: 1,
        sizing: sizing(),
        candidates: [indicators({ max_shares: 600 })],
      })
    }
    if (url.pathname === '/api/stocks/86970/stop-candidates') {
      expect(url.searchParams.get('entry_price')).toBe('1215') // 初期値は終値
      return json(STOPS)
    }
    if (url.pathname === '/api/orders' && req.method === 'POST') {
      sent.push(req)
      return json({ id: 7, code: '86970', name: '日本取引所グループ', quantity: 600, order_price: 1215 }, 201)
    }
    if (url.pathname.endsWith('/chart')) return svgResponse()
    return undefined
  })
  renderApp('/candidates')
  await userEvent.click(await screen.findByRole('button', { name: '8697を注文' }))

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByLabelText(/注文価格/)).toHaveValue(1215)
  expect(within(dialog).getByLabelText(/株数/)).toHaveValue(600) // 初期値は建てられる株数
  // ロスカット未入力: 2ATR（48.6円）で計算 → 30,000 ÷ 48.6 = 617 → 600株
  expect(within(dialog).getByTestId('max-shares')).toHaveTextContent('最大 600株')

  await userEvent.click(await within(dialog).findByRole('button', { name: /1.5ATR付近 1,251円/ }))
  expect(within(dialog).getByLabelText(/ロスカット（円）/)).toHaveValue(1251)
  expect(within(dialog).getByLabelText(/ロスカットの根拠/)).toHaveValue(
    '2026-08-07 の陰線の高値 1,250 の1ティック上（1.48ATR）',
  )
  // ロスカットとの差 36円 → 30,000 ÷ 36 = 833 → 800株。600株なら想定損失 21,600円
  expect(within(dialog).getByTestId('max-shares')).toHaveTextContent('最大 800株')
  expect(within(dialog).getByText('想定損失 21,600円')).toBeInTheDocument()

  await userEvent.click(within(dialog).getByRole('button', { name: '注文を登録する' }))
  expect(await screen.findByRole('status')).toHaveTextContent('注文 #7')
  expect(sent[0].body).toMatchObject({
    code: '86970',
    kind: 'MARGIN_SHORT',
    quantity: 600,
    order_price: 1215,
    stop_loss_price: 1251,
    expires_on: null,
  })
})

test('ロスカットが遠すぎて許容損失を超えると、警告する', async () => {
  mockFetch((url) => {
    if (url.pathname === '/api/candidates') {
      return json({ as_of_date: '2026-08-14', count: 1, sizing: sizing(), candidates: [indicators({ max_shares: 600 })] })
    }
    if (url.pathname.endsWith('/stop-candidates')) return json({ ...STOPS, candidates: [] })
    return undefined
  })
  renderApp('/candidates')
  await userEvent.click(await screen.findByRole('button', { name: '8697を注文' }))
  const dialog = await screen.findByRole('dialog')
  expect(await within(dialog).findByText(/候補なし/)).toBeInTheDocument()

  await userEvent.type(within(dialog).getByLabelText(/ロスカット（円）/), '1315') // 差 100円 → 最大300株
  expect(within(dialog).getByTestId('max-shares')).toHaveTextContent(
    '最大 300株（許容損失 30,000円 ÷ ロスカットまで 100円） 想定損失が許容損失を超えています',
  )
})
