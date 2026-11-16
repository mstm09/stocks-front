import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Trade } from '@/features/trades/api'
import { trade } from '@/test/fixtures'
import { json, mockFetch, renderApp, type SentRequest } from '@/test/render'

afterEach(() => vi.restoreAllMocks())

/**
 * 売買記録のAPIの代わり。登録・決済・削除を覚えておき、次の GET に反映する。
 * 画面が送った内容は `sent` に残るので、テストで確かめられる。
 */
function mockTradesApi(initial: Trade[]) {
  let trades = [...initial]
  const sent: SentRequest[] = []
  mockFetch((url, request) => {
    if (request.method !== 'GET') sent.push(request)
    const body = request.body as Record<string, never>
    const id = Number(url.pathname.match(/^\/api\/trades\/(\d+)/)?.[1])
    const current = trades.find((t) => t.id === id)
    const replace = (next: Trade) => {
      trades = trades.map((t) => (t.id === next.id ? next : t))
      return json(next)
    }

    if (url.pathname === '/api/trades' && request.method === 'GET') {
      const status = url.searchParams.get('status')
      return json(trades.filter((t) => !status || t.status === status))
    }
    if (url.pathname === '/api/trades' && request.method === 'POST') {
      if (body.stop_loss_price && body.stop_loss_price < body.entry_price) {
        return json({ detail: 'ロスカットは、新規価格より上にしてください' }, 400)
      }
      const added = trade({ ...body, id: 9, name: '新しい銘柄', remaining_quantity: body.quantity })
      trades.push(added)
      return json(added, 201)
    }
    if (!current) return undefined
    if (url.pathname.endsWith('/exits') && request.method === 'POST') {
      return replace({
        ...current,
        status: 'CLOSED',
        remaining_quantity: 0,
        realized_pnl: 15000,
        exits: [{ id: 1, closed_on: body.closed_on, quantity: 300, price: body.price, fee: body.fee, pnl: 15000, memo: null }],
      })
    }
    if (request.method === 'PATCH') return replace({ ...current, ...body })
    if (request.method === 'DELETE') {
      trades = trades.filter((t) => t.id !== id)
      return new Response(null, { status: 204 })
    }
    return json(current)
  })
  return sent
}

test('売買の一覧を出し、状態で絞れる', async () => {
  mockTradesApi([
    trade(),
    trade({ id: 2, name: 'トヨタ自動車', status: 'CLOSED', remaining_quantity: 0, realized_pnl: -6000, r_multiple: -1, exits: [{ id: 1, closed_on: '2026-08-10', quantity: 300, price: 1020, fee: 0, pnl: -6000, memo: null }] }),
  ])
  renderApp('/trades')

  expect(await screen.findByText('日本取引所グループ')).toBeInTheDocument()
  expect(screen.getByText('-6,000')).toHaveClass('text-down')
  expect(screen.getByText('-1.00R')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: '決済済み' }))
  expect(await screen.findByText('トヨタ自動車')).toBeInTheDocument()
  expect(screen.queryByText('日本取引所グループ')).not.toBeInTheDocument()
})

test('売買を登録すると、その売買の画面へ移る', async () => {
  const sent = mockTradesApi([])
  const user = userEvent.setup()
  renderApp('/trades')

  await user.click(await screen.findByRole('button', { name: '売買を登録' }))
  const dialog = within(await screen.findByRole('dialog', { name: '売買を登録' }))
  await user.type(dialog.getByLabelText(/銘柄コード/), '8697')
  await user.type(dialog.getByLabelText(/約定価格/), '1000')
  await user.type(dialog.getByLabelText(/^ロスカット（円）/), '1060')
  expect(dialog.getByText('想定損失 6,000円')).toBeInTheDocument() // |1000 − 1060| × 100株
  await user.type(dialog.getByLabelText('ロスカットの根拠'), '戻り高値の上')
  await user.click(dialog.getByRole('button', { name: '登録する' }))

  expect(await screen.findByRole('heading', { name: /新しい銘柄/ })).toBeInTheDocument()
  expect(sent[0]).toMatchObject({
    method: 'POST',
    path: '/api/trades',
    body: {
      code: '8697',
      kind: 'MARGIN_SHORT',
      quantity: 100,
      entry_price: 1000,
      entry_fee: 0,
      stop_loss_price: 1060,
      stop_loss_reason: '戻り高値の上',
      limit_price: null, // 空の項目は null で送る
      memo: null,
    },
  })
})

test('APIが入力の間違いを返したら、フォームに出す（フォームは閉じない）', async () => {
  mockTradesApi([])
  const user = userEvent.setup()
  renderApp('/trades?new=86970') // 銘柄詳細から来たとき。銘柄コードが入っている

  const dialog = within(await screen.findByRole('dialog', { name: '売買を登録' }))
  expect(dialog.getByLabelText(/銘柄コード/)).toHaveValue('86970')
  await user.type(dialog.getByLabelText(/約定価格/), '1000')
  await user.type(dialog.getByLabelText(/^ロスカット（円）/), '900')
  await user.click(dialog.getByRole('button', { name: '登録する' }))

  expect(await dialog.findByRole('alert')).toHaveTextContent('新規価格より上にしてください')
})

test('決済を登録すると、決済済みになる', async () => {
  const sent = mockTradesApi([trade()])
  const user = userEvent.setup()
  renderApp('/trades/1')

  await user.click(await screen.findByRole('button', { name: '決済を登録' }))
  const dialog = within(await screen.findByRole('dialog', { name: '決済を登録' }))
  await user.type(dialog.getByLabelText(/約定価格/), '950')
  await user.click(dialog.getByRole('button', { name: '登録する' }))

  expect(await screen.findByText('決済済み')).toBeInTheDocument()
  expect(screen.getByText('+15,000円')).toHaveClass('text-up')
  expect(screen.queryByRole('button', { name: '決済を登録' })).not.toBeInTheDocument()
  // 株数を空にすると null（＝残りを全部）で送る
  expect(sent[0]).toMatchObject({ path: '/api/trades/1/exits', body: { price: 950, quantity: null, fee: 0 } })
})

test('自己採点を保存する', async () => {
  const sent = mockTradesApi([trade()])
  const user = userEvent.setup()
  renderApp('/trades/1')

  await user.click(await screen.findByRole('button', { name: '自己採点' }))
  const dialog = within(await screen.findByRole('dialog', { name: '自己採点' }))
  await user.type(dialog.getByLabelText(/点数/), '70')
  await user.type(dialog.getByLabelText('振り返り'), '利確が早すぎた')
  await user.click(dialog.getByRole('button', { name: '保存する' }))

  expect(await screen.findByText('利確が早すぎた')).toBeInTheDocument()
  expect(sent[0]).toMatchObject({ method: 'PATCH', body: { self_score: 70, self_review: '利確が早すぎた' } })
})

test('売買を消すと、確認のあと一覧へ戻る', async () => {
  const sent = mockTradesApi([trade()])
  const user = userEvent.setup()
  renderApp('/trades/1')

  await user.click(await screen.findByRole('button', { name: '消す' }))
  expect(sent).toHaveLength(0) // 確認するまでは、消さない
  const dialog = within(await screen.findByRole('dialog', { name: /売買 #1 を消しますか/ }))
  await user.click(dialog.getByRole('button', { name: '消す' }))

  expect(await screen.findByText(/売買の記録がありません/)).toBeInTheDocument()
  expect(sent[0]).toMatchObject({ method: 'DELETE', path: '/api/trades/1' })
})

test('ない番号の売買は、APIの文言を出す', async () => {
  mockTradesApi([])
  renderApp('/trades/99')
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '売買記録へ戻る' })).toBeInTheDocument()
})
