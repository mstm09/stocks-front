import { useState } from 'react'
import { Field } from '@/components/Field'
import { FormDialog } from '@/components/FormDialog'
import { NativeSelect } from '@/components/NativeSelect'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { today } from '@/lib/date'
import { type StopCandidate, useTrailingStopCandidates } from '@/features/orders/api'
import { StopCandidateButtons } from '@/features/orders/OrderDialog'
import { formatPnl, formatPrice, formatYen } from '@/lib/format'
import { fromNumber, toNumber, toText } from '@/lib/number'
import {
  KIND_LABELS,
  type Trade,
  type TradeKind,
  useAddExit,
  useAddStopChange,
  useAddTrade,
  useCorrectEntry,
  useDeleteTrade,
  useUpdateTrade,
} from './api'

// 売買記録の入力フォーム。どれも、画面の上に重ねて出す（FormDialog）。
// 入力中の値は useState で持ち、送信するときに数値へ直してAPIへ送る。
// 入力の間違いはAPIが調べて返すので（400）、その文言をフォームの下に出す。

type DialogProps = { onClose: () => void }

/** 売買（新規の約定）を登録する。 */
export function AddTradeDialog({
  defaultCode = '',
  onClose,
  onAdded,
}: DialogProps & { defaultCode?: string; onAdded: (trade: Trade) => void }) {
  const [form, setForm] = useState({
    code: defaultCode,
    kind: 'MARGIN_SHORT' as TradeKind,
    opened_on: today(),
    quantity: '100',
    entry_price: '',
    entry_fee: '',
    stop_loss_price: '',
    stop_loss_reason: '',
    limit_price: '',
    limit_quantity: '',
    memo: '',
  })
  // 1項目だけを書き換える（ほかの項目はそのまま）
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const add = useAddTrade()

  // ロスカットまで行ったときに失う金額。入力のたびに計算し直して見せる
  const [price, stop, quantity] = [form.entry_price, form.stop_loss_price, form.quantity].map(toNumber)
  const risk = price && stop && quantity ? Math.abs(price - stop) * quantity : null

  function submit() {
    add.mutate(
      {
        code: form.code.trim(),
        kind: form.kind,
        opened_on: form.opened_on,
        quantity: toNumber(form.quantity) ?? 0,
        entry_price: toNumber(form.entry_price) ?? 0,
        entry_fee: toNumber(form.entry_fee) ?? 0,
        stop_loss_price: toNumber(form.stop_loss_price),
        stop_loss_reason: toText(form.stop_loss_reason),
        limit_price: toNumber(form.limit_price),
        limit_quantity: toNumber(form.limit_quantity),
        memo: toText(form.memo),
      },
      { onSuccess: onAdded },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title="売買を登録"
      description="新規の約定を1回ぶん登録します。株数・価格・日付・種類は、あとから変えられません。"
      submitLabel="登録する"
      pending={add.isPending}
      error={add.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="trade-code" label="銘柄コード" hint="4桁か5桁" required>
          <Input id="trade-code" value={form.code} onChange={set('code')} required />
        </Field>
        <Field htmlFor="trade-kind" label="種類" required>
          <NativeSelect id="trade-kind" value={form.kind} onChange={set('kind')} className="w-full">
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field htmlFor="trade-date" label="約定日" required>
          <Input id="trade-date" type="date" value={form.opened_on} onChange={set('opened_on')} required />
        </Field>
        <Field htmlFor="trade-quantity" label="株数" required>
          <Input id="trade-quantity" type="number" min="1" value={form.quantity} onChange={set('quantity')} required />
        </Field>
        <Field htmlFor="trade-price" label="約定価格（円）" required>
          <Input id="trade-price" type="number" step="any" min="0" value={form.entry_price} onChange={set('entry_price')} required />
        </Field>
        <Field htmlFor="trade-fee" label="手数料など（円）">
          <Input id="trade-fee" type="number" step="any" min="0" value={form.entry_fee} onChange={set('entry_fee')} />
        </Field>
        <Field
          htmlFor="trade-stop"
          label="ロスカット（円）"
          hint={risk == null ? '売り建ては約定価格より上、買いは下' : `想定損失 ${formatYen(risk)}円`}
        >
          <Input id="trade-stop" type="number" step="any" min="0" value={form.stop_loss_price} onChange={set('stop_loss_price')} />
        </Field>
        <Field htmlFor="trade-limit" label="指値（円）" hint="利益確定などの注文価格">
          <Input id="trade-limit" type="number" step="any" min="0" value={form.limit_price} onChange={set('limit_price')} />
        </Field>
        <Field htmlFor="trade-limit-quantity" label="指値の株数" hint="空なら全部">
          <Input id="trade-limit-quantity" type="number" min="1" value={form.limit_quantity} onChange={set('limit_quantity')} />
        </Field>
        <Field htmlFor="trade-stop-reason" label="ロスカットの根拠" className="col-span-2">
          <Input id="trade-stop-reason" value={form.stop_loss_reason} onChange={set('stop_loss_reason')} />
        </Field>
        <Field htmlFor="trade-memo" label="メモ（売買の理由など）" className="col-span-2">
          <Textarea id="trade-memo" rows={2} value={form.memo} onChange={set('memo')} />
        </Field>
      </div>
    </FormDialog>
  )
}

/** 決済（約定）を登録する。何回かに分けて決済できる。 */
export function AddExitDialog({ trade, onClose }: DialogProps & { trade: Trade }) {
  const [form, setForm] = useState({ closed_on: today(), price: '', quantity: '', fee: '', memo: '' })
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const add = useAddExit(trade.id)

  function submit() {
    add.mutate(
      {
        closed_on: form.closed_on,
        price: toNumber(form.price) ?? 0,
        quantity: toNumber(form.quantity),
        fee: toNumber(form.fee) ?? 0,
        memo: toText(form.memo),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title="決済を登録"
      description={`残り ${trade.remaining_quantity}株（新規 ${trade.entry_price}円）`}
      submitLabel="登録する"
      pending={add.isPending}
      error={add.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="exit-date" label="約定日" required>
          <Input id="exit-date" type="date" value={form.closed_on} onChange={set('closed_on')} required />
        </Field>
        <Field htmlFor="exit-price" label="約定価格（円）" required>
          <Input id="exit-price" type="number" step="any" min="0" value={form.price} onChange={set('price')} required />
        </Field>
        <Field htmlFor="exit-quantity" label="株数" hint="空なら、残りを全部決済">
          <Input
            id="exit-quantity"
            type="number"
            min="1"
            max={trade.remaining_quantity}
            placeholder={String(trade.remaining_quantity)}
            value={form.quantity}
            onChange={set('quantity')}
          />
        </Field>
        <Field htmlFor="exit-fee" label="費用（円）" hint="手数料・金利・貸株料など">
          <Input id="exit-fee" type="number" step="any" min="0" value={form.fee} onChange={set('fee')} />
        </Field>
        <Field htmlFor="exit-memo" label="メモ" className="col-span-2">
          <Input id="exit-memo" value={form.memo} onChange={set('memo')} />
        </Field>
      </div>
    </FormDialog>
  )
}

/**
 * 新規の約定（日・株数・価格）の登録の間違いを直す。
 * 決済・ロスカットの履歴・自己採点は残り、損益などは直した値で計算し直される。
 */
export function FixEntryDialog({ trade, onClose }: DialogProps & { trade: Trade }) {
  const [form, setForm] = useState({
    opened_on: trade.opened_on,
    quantity: String(trade.quantity),
    entry_price: fromNumber(trade.entry_price),
  })
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const fix = useCorrectEntry(trade.id)

  function submit() {
    fix.mutate(
      {
        opened_on: form.opened_on,
        quantity: toNumber(form.quantity),
        entry_price: toNumber(form.entry_price),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title="新規の約定を修正"
      description="登録の間違いを直します。決済・ロスカットの履歴・自己採点は残り、損益は直した値で計算し直します。"
      submitLabel="修正する"
      pending={fix.isPending}
      error={fix.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-3 gap-3">
        <Field htmlFor="fix-date" label="新規の約定日" required>
          <Input id="fix-date" type="date" value={form.opened_on} onChange={set('opened_on')} required />
        </Field>
        <Field htmlFor="fix-quantity" label="株数" required>
          <Input id="fix-quantity" type="number" min="1" value={form.quantity} onChange={set('quantity')} required />
        </Field>
        <Field htmlFor="fix-price" label="新規の約定価格（円）" required>
          <Input id="fix-price" type="number" step="any" min="0" value={form.entry_price} onChange={set('entry_price')} required />
        </Field>
      </div>
    </FormDialog>
  )
}

/**
 * 指値（と株数）・メモ・新規の費用を変える。
 * ロスカットは履歴で持つので、ここでは変えない（「ロスカットを動かす」から）。
 */
export function EditPlanDialog({ trade, onClose }: DialogProps & { trade: Trade }) {
  const [form, setForm] = useState({
    limit_price: fromNumber(trade.limit_price),
    limit_quantity: fromNumber(trade.limit_quantity),
    memo: trade.memo ?? '',
    entry_fee: fromNumber(trade.entry_fee),
  })
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const update = useUpdateTrade(trade.id)

  function submit() {
    update.mutate(
      {
        // null を送ると、その項目が消える
        limit_price: toNumber(form.limit_price),
        limit_quantity: toNumber(form.limit_quantity),
        memo: toText(form.memo),
        entry_fee: toNumber(form.entry_fee) ?? 0,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title="指値・メモを変える"
      description="空にした項目は、消えます。ロスカットは「ロスカットを動かす」から変えます（履歴に残ります）。"
      submitLabel="保存する"
      pending={update.isPending}
      error={update.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="plan-limit" label="指値（円）">
          <Input id="plan-limit" type="number" step="any" min="0" value={form.limit_price} onChange={set('limit_price')} />
        </Field>
        <Field htmlFor="plan-limit-quantity" label="指値の株数" hint="空なら残り全部">
          <Input id="plan-limit-quantity" type="number" min="1" value={form.limit_quantity} onChange={set('limit_quantity')} />
        </Field>
        <Field htmlFor="plan-memo" label="メモ" className="col-span-2">
          <Textarea id="plan-memo" rows={2} value={form.memo} onChange={set('memo')} />
        </Field>
        <Field htmlFor="plan-fee" label="新規の手数料など（円）">
          <Input id="plan-fee" type="number" step="any" min="0" value={form.entry_fee} onChange={set('entry_fee')} />
        </Field>
      </div>
    </FormDialog>
  )
}

/**
 * ロスカットを動かす（手動のトレイリングストップ）。履歴に1行足す。
 * 最初のロスカットだけは損をする側に限る。そのあとは、建値より利益側にも置ける。
 */
export function MoveStopDialog({ trade, onClose }: DialogProps & { trade: Trade }) {
  const [form, setForm] = useState({ changed_on: today(), price: '', reason: '', memo: '' })
  const [remove, setRemove] = useState(false)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const add = useAddStopChange(trade.id)

  // 候補: 最新の終値と最新のATRから（新規のときと同じ考え方）。売り建てで、保有中のときだけ。
  // 有利な方向にしか動かさないので、今のロスカットより下（売り建て）の候補だけ出す。
  const isShort = trade.kind === 'MARGIN_SHORT'
  const stops = useTrailingStopCandidates(trade.code, isShort)
  const current = trade.stop_loss_price
  const candidates = stops.data?.candidates.filter((c) => current == null || c.price < current)

  function pick(c: StopCandidate) {
    setRemove(false)
    setForm((prev) => ({
      ...prev,
      price: String(c.price),
      reason: `${c.bar_date} の陰線の高値 ${formatPrice(c.bar_high)} の1ティック上（終値から${c.atr_multiple.toFixed(2)}ATR）`,
    }))
  }

  // 動かしたあとのロスカットで、残りの株が決済されたときの損益（費用は含まない）
  const price = toNumber(form.price)
  const direction = trade.kind === 'MARGIN_SHORT' ? -1 : 1
  const pnl = remove || price == null ? null : (price - trade.entry_price) * trade.remaining_quantity * direction

  function submit() {
    add.mutate(
      {
        changed_on: form.changed_on,
        price: remove ? null : price,
        reason: toText(form.reason),
        memo: toText(form.memo),
      },
      { onSuccess: onClose },
    )
  }

  const now = trade.stop_loss_price == null ? 'なし' : `${formatPrice(trade.stop_loss_price)}円`
  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title="ロスカットを動かす"
      description={`今のロスカット: ${now}（新規 ${formatPrice(trade.entry_price)}円・残り ${trade.remaining_quantity}株）。変更は履歴に残ります。`}
      submitLabel="記録する"
      pending={add.isPending}
      error={add.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="stop-date" label="変えた日" required>
          <Input id="stop-date" type="date" value={form.changed_on} onChange={set('changed_on')} required />
        </Field>
        <Field
          htmlFor="stop-price"
          label="新しいロスカット（円）"
          hint={pnl == null ? undefined : `ここで決済されると ${formatPnl(pnl)}円${pnl >= 0 ? '（利益を確保）' : ''}`}
          required={!remove}
        >
          <Input id="stop-price" type="number" step="any" min="0" value={form.price} onChange={set('price')} required={!remove} disabled={remove} />
        </Field>
        <div className="col-span-2 space-y-1.5">
          <p className="text-sm font-medium">
            ロスカット位置の候補
            {stops.data?.entry_price != null && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {stops.data.as_of_date} の終値 {formatPrice(stops.data.entry_price)}円・ATR{' '}
                {formatPrice(stops.data.atr)}円 から
              </span>
            )}
          </p>
          <StopCandidateButtons
            isShort={isShort}
            loading={stops.isFetching && !stops.data}
            error={stops.error}
            candidates={candidates}
            lookbackDays={stops.data?.lookback_days}
            selected={price}
            onPick={pick}
            emptyText="候補なし（今のロスカットより下に、1〜2ATRの陰線の高値がありません。今のロスカットのまま）"
          />
        </div>
        {trade.stop_loss_price != null && (
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remove} onChange={(e) => setRemove(e.target.checked)} />
            ロスカットを外す
          </label>
        )}
        <Field htmlFor="stop-reason" label="根拠" className="col-span-2">
          <Input id="stop-reason" value={form.reason} onChange={set('reason')} />
        </Field>
        <Field htmlFor="stop-memo" label="メモ" className="col-span-2">
          <Input id="stop-memo" value={form.memo} onChange={set('memo')} />
        </Field>
      </div>
    </FormDialog>
  )
}

/** 自己採点（0〜100点）と、振り返りのコメントを書く。 */
export function ReviewDialog({ trade, onClose }: DialogProps & { trade: Trade }) {
  const [score, setScore] = useState(fromNumber(trade.self_score))
  const [review, setReview] = useState(trade.self_review ?? '')
  const update = useUpdateTrade(trade.id)

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title="自己採点"
      submitLabel="保存する"
      pending={update.isPending}
      error={update.error}
      onSubmit={() =>
        update.mutate(
          { self_score: toNumber(score), self_review: toText(review) },
          { onSuccess: onClose },
        )
      }
    >
      <Field htmlFor="review-score" label="点数（0〜100）">
        <Input id="review-score" type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} className="w-28" />
      </Field>
      <Field htmlFor="review-comment" label="振り返り" hint="計画どおりだったか。次に変えること。">
        <Textarea id="review-comment" rows={4} value={review} onChange={(e) => setReview(e.target.value)} />
      </Field>
    </FormDialog>
  )
}

/** 売買を、決済ごと消す前の確認。 */
export function DeleteTradeDialog({
  trade,
  onClose,
  onDeleted,
}: DialogProps & { trade: Trade; onDeleted: () => void }) {
  const remove = useDeleteTrade(trade.id)
  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title={`売買 #${trade.id} を消しますか？`}
      description="決済の記録ごと消えます。元に戻せません（登録の間違いを直すための操作です）。"
      submitLabel="消す"
      destructive
      pending={remove.isPending}
      error={remove.error}
      onSubmit={() => remove.mutate(undefined, { onSuccess: onDeleted })}
    />
  )
}
