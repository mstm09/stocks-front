import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Trade } from '@/features/trades/api'
import { order, trade } from '@/test/fixtures'
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

    if (url.pathname === '/api/orders') return json([]) // 注文は、下の別のテストで確かめる
    if (url.pathname.endsWith('/stop-candidates')) {
      // 最新の終値 960円・ATR 20円。範囲は 980〜1,000円
      expect(url.searchParams.has('entry_price')).toBe(false) // 注文価格なし＝最新の終値
      return json({
        code: '86970', as_of_date: '2026-08-14', entry_price: 960, atr: 20, range_low: 980, range_high: 1000, lookback_days: 15,
        candidates: [
          { price: 981, target_multiple: 1, atr_multiple: 1.05, distance: 21, bar_date: '2026-08-10', bar_high: 980 },
          { price: 990, target_multiple: 1.5, atr_multiple: 1.5, distance: 30, bar_date: '2026-08-07', bar_high: 989.5 },
          { price: 1000, target_multiple: 2, atr_multiple: 2, distance: 40, bar_date: '2026-08-05', bar_high: 999 },
        ],
      })
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
    if (url.pathname.endsWith('/entry') && request.method === 'PATCH') {
      if (body.quantity === 50) return json({ detail: '株数は、決済済みの株数（100）以上にしてください' }, 400)
      return replace({ ...current, ...body })
    }
    if (url.pathname.endsWith('/stops') && request.method === 'POST') {
      // 本物のAPIと同じく、履歴に1行足し、いちばん新しい行を今のロスカットにする
      const last = current.stop_changes.at(-1)
      const row = { id: 50 + current.stop_changes.length, changed_on: body.changed_on, price: body.price, previous_price: last?.price ?? null, reason: body.reason, memo: body.memo }
      const price = body.price as number | null
      return replace({
        ...current,
        stop_loss_price: price,
        stop_loss_reason: body.reason,
        stop_pnl: price == null ? null : (current.entry_price - price) * current.remaining_quantity,
        stop_changes: [...current.stop_changes, row],
      })
    }
    if (url.pathname.match(/\/stops\/\d+$/) && request.method === 'DELETE') {
      const rest = current.stop_changes.slice(0, -1)
      return replace({ ...current, stop_loss_price: rest.at(-1)?.price ?? null, stop_changes: rest })
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

test('一覧は約定価格・現在値・今の損益が中心。保有中の損益の合計を出し、状態で絞れる', async () => {
  mockTradesApi([
    // 売り建て 1,000円 × 300株、終値 960円 → +12,000円（+4.00%）。ロスカット 1,060円は 2ATR より遠い
    trade({
      current_price: 960, current_price_date: '2026-08-14', unrealized_pnl: 12000, current_pnl: 12000, pnl_pct: 4,
      latest_atr: 20, stop_range_low: 980, stop_range_high: 1000, stop_position: 'FAR', stop_pnl: -18000,
    }),
    // 越えている
    trade({
      id: 3, code: '67580', name: 'ソニーグループ', current_price: 3100, current_price_date: '2026-08-14',
      current_pnl: -3000, pnl_pct: -1, stop_loss_price: 3080, stop_position: 'HIT', stop_pnl: -1000,
      stop_range_low: 3150, stop_range_high: 3200, latest_atr: 50,
    }),
    trade({
      id: 2, name: 'トヨタ自動車', status: 'CLOSED', remaining_quantity: 0, realized_pnl: -6000, r_multiple: -1,
      current_price: 1020, current_price_date: '2026-08-10', current_pnl: -6000, pnl_pct: -2,
      exits: [{ id: 1, closed_on: '2026-08-10', quantity: 300, price: 1020, fee: 0, pnl: -6000, memo: null }],
    }),
  ])
  renderApp('/trades')

  const jpx = (await screen.findByText('日本取引所グループ')).closest('tr')!
  expect(within(jpx).getByText('960')).toHaveAttribute('title', '2026-08-14 の終値')
  expect(within(jpx).getByText('+12,000')).toHaveClass('text-up')
  expect(within(jpx).getByText('+4.00%')).toBeInTheDocument()
  expect(within(jpx).getByText('遠すぎ')).toBeInTheDocument()
  // 範囲の列（基準の終値とATRは、マウスを乗せると）
  expect(within(jpx).getByText('980〜1,000')).toHaveAttribute('title', '2026-08-14 の終値 960円・ATR 20円')
  expect(within(screen.getByText('ソニーグループ').closest('tr')!).getByText('越えている')).toBeInTheDocument()

  const toyota = screen.getByText('トヨタ自動車').closest('tr')!
  expect(within(toyota).getByText('1,020')).toHaveAttribute('title', '2026-08-10 に決済')
  expect(within(toyota).getByText('-6,000')).toHaveClass('text-down')
  expect(within(toyota).getAllByText('-').length).toBeGreaterThanOrEqual(2) // 決済済みはロスカット・範囲なし
  // 番号・R倍数・自己採点は一覧に出さない
  expect(screen.queryByText('-1.00R')).not.toBeInTheDocument()
  expect(screen.queryByRole('columnheader', { name: /番号|R倍数|自己採点/ })).not.toBeInTheDocument()

  // 保有中（決済済みは入らない）: 12,000 − 3,000
  expect(screen.getByRole('status', { name: '保有中の損益の合計' })).toHaveTextContent('保有中の損益の合計（2件）+9,000円')

  await userEvent.click(screen.getByRole('button', { name: '決済済み' }))
  expect(await screen.findByText('トヨタ自動車')).toBeInTheDocument()
  expect(screen.queryByText('日本取引所グループ')).not.toBeInTheDocument()
  expect(screen.queryByRole('status', { name: '保有中の損益の合計' })).not.toBeInTheDocument()
})

test('行のどこを押しても、売買の詳細へ移る（キーボードでも）', async () => {
  mockTradesApi([trade({ current_price: 960, current_pnl: 12000 })])
  const user = userEvent.setup()
  const { unmount } = renderApp('/trades')
  const row = (await screen.findByText('日本取引所グループ')).closest('tr')!
  await user.click(within(row).getByText('+12,000')) // 銘柄名ではなく、損益のところ
  expect(await screen.findByRole('heading', { name: /日本取引所グループ/ })).toBeInTheDocument()
  unmount()

  renderApp('/trades')
  const again = (await screen.findByText('日本取引所グループ')).closest('tr')!
  again.focus()
  await user.keyboard('{Enter}')
  expect(await screen.findByRole('heading', { name: /日本取引所グループ/ })).toBeInTheDocument()
})

test('利益を確保できているロスカットは、範囲から外れていても印を出さない', async () => {
  mockTradesApi([trade({ stop_loss_price: 990, stop_position: 'NEAR', stop_pnl: 3000, current_pnl: 0 })])
  renderApp('/trades')
  const row = (await screen.findByText('日本取引所グループ')).closest('tr')!
  expect(within(row).queryByText('近すぎ')).not.toBeInTheDocument()
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

/** 注文のAPIの代わり。約定すると売買 #20 を作って返す。 */
function mockOrdersApi(initial: ReturnType<typeof order>[]) {
  let orders = [...initial]
  const sent: SentRequest[] = []
  mockFetch((url, request) => {
    if (request.method !== 'GET') sent.push(request)
    const body = request.body as Record<string, never>
    if (url.pathname === '/api/trades') return json([])
    if (url.pathname === '/api/trades/20') return json(trade({ id: 20, quantity: body?.quantity ?? 100 }))
    if (url.pathname === '/api/orders') {
      const status = url.searchParams.get('status')
      return json(orders.filter((o) => !status || o.status === status))
    }
    const id = Number(url.pathname.match(/^\/api\/orders\/(\d+)/)?.[1])
    const current = orders.find((o) => o.id === id)
    if (!current) return undefined
    const replace = (next: ReturnType<typeof order>) => {
      orders = orders.map((o) => (o.id === id ? next : o))
      return json(next)
    }
    if (url.pathname.endsWith('/fill')) {
      replace({ ...current, status: 'FILLED', status_label: '約定', trade_id: 20, resolved_on: body.filled_on })
      return json(trade({ id: 20, quantity: body.quantity }), 201)
    }
    if (url.pathname.endsWith('/cancel')) {
      return replace({ ...current, status: 'CANCELLED', status_label: '取消', resolved_on: body.cancelled_on })
    }
    if (request.method === 'PATCH') return replace({ ...current, ...body })
    return json(current)
  })
  return sent
}

test('注文中の一覧を出し、期限切れはしるしを変える', async () => {
  mockOrdersApi([
    order(),
    order({ id: 6, code: '67580', name: 'ソニーグループ', is_expired: true, expires_on: '2026-11-20' }),
    order({ id: 7, status: 'CANCELLED', status_label: '取消' }),
  ])
  renderApp('/trades')

  const section = await screen.findByRole('region', { name: '注文' })
  expect(await within(section).findByText('ソニーグループ')).toBeInTheDocument()
  const jpx = within(section).getByText('日本取引所グループ').closest('tr')!
  expect(within(jpx).getByText('注文中')).toBeInTheDocument()
  expect(within(jpx).getByText('+2.04%')).toBeInTheDocument()
  expect(within(jpx).getByText('18,000')).toBeInTheDocument()
  const sony = within(section).getByText('ソニーグループ').closest('tr')!
  expect(within(sony).getByText('期限切れ')).toBeInTheDocument()
  expect(within(section).queryByText('#7')).not.toBeInTheDocument() // 取消は、既定では出さない

  await userEvent.click(within(section).getByRole('button', { name: '全部' }))
  const cancelled = (await within(section).findByText('#7')).closest('tr')!
  expect(within(cancelled).getByText('取消')).toBeInTheDocument()
  expect(within(cancelled).queryByRole('button')).not.toBeInTheDocument() // 取消のあとは操作できない
})

test('約定を登録すると、売買記録の画面へ移る', async () => {
  const sent = mockOrdersApi([order()])
  renderApp('/trades')
  await userEvent.click(await screen.findByRole('button', { name: '注文 #5 の約定を登録' }))

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByLabelText(/約定価格/)).toHaveValue(1000) // 初期値は注文価格
  const quantity = within(dialog).getByLabelText(/約定した株数/)
  await userEvent.clear(quantity)
  await userEvent.type(quantity, '100')
  expect(within(dialog).getByText('残りの 200株は、取消扱いになります')).toBeInTheDocument()
  await userEvent.click(within(dialog).getByRole('button', { name: '約定を登録する' }))

  expect(await screen.findByRole('heading', { name: /#20/ })).toBeInTheDocument()
  expect(sent[0]).toMatchObject({ method: 'POST', path: '/api/orders/5/fill', body: { quantity: 100, price: 1000, fee: 0 } })
})

test('注文を変える・取り消す', async () => {
  const sent = mockOrdersApi([order()])
  renderApp('/trades')

  await userEvent.click(await screen.findByRole('button', { name: '注文 #5 を変える' }))
  let dialog = await screen.findByRole('dialog')
  const price = within(dialog).getByLabelText(/注文価格/)
  await userEvent.clear(price)
  await userEvent.type(price, '1010')
  await userEvent.clear(within(dialog).getByLabelText(/有効期限/))
  await userEvent.click(within(dialog).getByRole('button', { name: '保存する' }))
  await waitForDialogToClose()
  expect(sent[0]).toMatchObject({ method: 'PATCH', body: { order_price: 1010, expires_on: null, stop_loss_price: 1060 } })

  await userEvent.click(await screen.findByRole('button', { name: '注文 #5 を取り消す' }))
  dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByRole('button', { name: '取り消す' }))
  await waitForDialogToClose()
  expect(sent[1]).toMatchObject({ method: 'POST', path: '/api/orders/5/cancel' })
  expect(await screen.findByText(/注文中の注文はありません。/)).toBeInTheDocument()
})

const FIRST_STOP = { id: 40, changed_on: '2026-08-03', price: 1060, previous_price: null, reason: '直近の戻り高値の上', memo: null }

test('ロスカットを動かすと、履歴に残り、確保できた損益を出す', async () => {
  const sent = mockTradesApi([trade({ stop_changes: [FIRST_STOP] })])
  const user = userEvent.setup()
  renderApp('/trades/1')

  const history = await screen.findByRole('region', { name: 'ロスカットの履歴' })
  expect(within(history).getByText('1,060円に設定')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'ロスカットを動かす' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'ロスカットを動かす' }))
  await user.type(dialog.getByLabelText(/新しいロスカット/), '980')
  // 売り建て 1,000円 × 300株。980円で決済されると +6,000円
  expect(dialog.getByText('ここで決済されると +6,000円（利益を確保）')).toBeInTheDocument()
  await user.type(dialog.getByLabelText('根拠'), '25日線の上')
  await user.click(dialog.getByRole('button', { name: '記録する' }))

  expect(await within(history).findByText('1,060円 → 980円')).toBeInTheDocument()
  expect(screen.getByText('利益を確保できている')).toBeInTheDocument()
  expect(screen.getByText('最初のロスカット')).toBeInTheDocument() // 想定損失の基準は最初の 1,060円
  expect(sent[0]).toMatchObject({ method: 'POST', path: '/api/trades/1/stops', body: { price: 980, reason: '25日線の上', memo: null } })

  await user.click(within(history).getAllByRole('button', { name: /ロスカットの変更を消す/ })[1])
  await vi.waitFor(() => expect(within(history).queryByText('1,060円 → 980円')).not.toBeInTheDocument())
  expect(sent[1]).toMatchObject({ method: 'DELETE', path: '/api/trades/1/stops/51' })
})

test('ロスカットを動かすときは、今のロスカットより下の候補だけ出す（最新の終値とATRから）', async () => {
  // 売り建て 1,000円・今のロスカット 995円 → 1,000円の候補は、上に動かすことになるので出さない
  mockTradesApi([trade({ stop_loss_price: 995, stop_changes: [{ ...FIRST_STOP, price: 995 }] })])
  const user = userEvent.setup()
  renderApp('/trades/1')
  await user.click(await screen.findByRole('button', { name: 'ロスカットを動かす' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'ロスカットを動かす' }))

  expect(await dialog.findByText(/2026-08-14 の終値 960円・ATR 20円 から/)).toBeInTheDocument()
  expect(dialog.getByRole('button', { name: /1ATR付近 981円/ })).toBeInTheDocument()
  expect(dialog.queryByRole('button', { name: /2ATR付近 1,000円/ })).not.toBeInTheDocument()

  await user.click(dialog.getByRole('button', { name: /1.5ATR付近 990円/ }))
  expect(dialog.getByLabelText(/新しいロスカット/)).toHaveValue(990)
  expect(dialog.getByLabelText('根拠')).toHaveValue('2026-08-07 の陰線の高値 989.5 の1ティック上（終値から1.50ATR）')
  // 売り建て 1,000円 × 300株。990円で決済されると +3,000円
  expect(dialog.getByText('ここで決済されると +3,000円（利益を確保）')).toBeInTheDocument()
})

test('ロスカットを外す', async () => {
  const sent = mockTradesApi([trade({ stop_changes: [FIRST_STOP] })])
  const user = userEvent.setup()
  renderApp('/trades/1')
  await user.click(await screen.findByRole('button', { name: 'ロスカットを動かす' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'ロスカットを動かす' }))
  await user.click(dialog.getByLabelText('ロスカットを外す'))
  expect(dialog.getByLabelText(/新しいロスカット/)).toBeDisabled()
  await user.click(dialog.getByRole('button', { name: '記録する' }))
  expect(await screen.findByText('1,060円 → 外した')).toBeInTheDocument()
  expect(sent[0]).toMatchObject({ body: { price: null } })
})

test('指値の株数を変える（ロスカットはこのフォームでは変えない）', async () => {
  const sent = mockTradesApi([trade()])
  const user = userEvent.setup()
  renderApp('/trades/1')
  await user.click(await screen.findByRole('button', { name: '指値・メモを変える' }))
  const dialog = within(await screen.findByRole('dialog', { name: '指値・メモを変える' }))
  expect(dialog.queryByLabelText(/ロスカット/)).not.toBeInTheDocument()
  await user.type(dialog.getByLabelText('指値の株数'), '100')
  await user.click(dialog.getByRole('button', { name: '保存する' }))
  expect(await screen.findByText('900円（100株）')).toBeInTheDocument()
  expect(sent[0]).toMatchObject({ method: 'PATCH', body: { limit_price: 900, limit_quantity: 100 } })
  expect(sent[0].body).not.toHaveProperty('stop_loss_price')
})

test('修正ボタンで、新規の約定価格を直す（間違いはAPIのエラーを出す）', async () => {
  const sent = mockTradesApi([trade()])
  const user = userEvent.setup()
  renderApp('/trades/1')
  await user.click(await screen.findByRole('button', { name: '修正' }))
  const dialog = within(await screen.findByRole('dialog', { name: '新規の約定を修正' }))
  expect(dialog.getByLabelText(/新規の約定日/)).toHaveValue('2026-08-03')

  const quantity = dialog.getByLabelText(/株数/)
  await user.clear(quantity)
  await user.type(quantity, '50')
  await user.click(dialog.getByRole('button', { name: '修正する' }))
  expect(await dialog.findByText('株数は、決済済みの株数（100）以上にしてください')).toBeInTheDocument()

  await user.clear(quantity)
  await user.type(quantity, '300')
  const price = dialog.getByLabelText(/新規の約定価格/)
  await user.clear(price)
  await user.type(price, '1005')
  await user.click(dialog.getByRole('button', { name: '修正する' }))
  await waitForDialogToClose()
  expect(sent.at(-1)).toMatchObject({
    method: 'PATCH',
    path: '/api/trades/1/entry',
    body: { opened_on: '2026-08-03', quantity: 300, entry_price: 1005 },
  })
})

async function waitForDialogToClose() {
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}
