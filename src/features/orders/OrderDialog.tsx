import { useState } from 'react'
import { Field } from '@/components/Field'
import { FormDialog } from '@/components/FormDialog'
import { NativeSelect } from '@/components/NativeSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Sizing } from '@/features/candidates/api'
import type { Indicators } from '@/features/stocks/api'
import { KIND_LABELS, type TradeKind } from '@/features/trades/api'
import { today } from '@/lib/date'
import { formatCode, formatPrice, formatShares, formatYen } from '@/lib/format'
import { fromNumber, toNumber, toText } from '@/lib/number'
import { maxShares } from '@/lib/sizing'
import { useDebounced } from '@/lib/useDebounced'
import { cn } from '@/lib/utils'
import { type Order, type StopCandidate, useAddOrder, useStopCandidates } from './api'

type Props = {
  /** 注文する銘柄（候補一覧の1行） */
  stock: Indicators
  /** 建てられる株数の前提（候補一覧の sizing） */
  sizing: Sizing
  /** 候補一覧の基準日。ロスカット候補もこの日の値で探す */
  asOf: string | undefined
  onClose: () => void
  onAdded: (order: Order) => void
}

/**
 * 注文（指値で仕掛け中）を登録する。候補一覧の「注文」ボタンから開く。
 *
 * - 注文価格の初期値は、基準日の終値。
 * - 売り建てなら、ロスカットの候補（1ATR・1.5ATR・2ATR付近の陰線の高値）を出す。押すとロスカット欄に入る。
 * - 株数の横に、基準額の3%ルールで建てられる最大の株数を出す。
 *   ロスカットを入れたら「注文価格とロスカットの差」、入れていなければ「2ATR」で計算する。
 */
export function OrderDialog({ stock, sizing, asOf, onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    kind: 'MARGIN_SHORT' as TradeKind,
    ordered_on: today(),
    quantity: String(stock.max_shares ? stock.max_shares : sizing.lot_size),
    order_price: fromNumber(stock.close),
    expires_on: '',
    stop_loss_price: '',
    stop_loss_reason: '',
    limit_price: '',
    memo: '',
  })
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const add = useAddOrder()
  const isShort = form.kind === 'MARGIN_SHORT'
  const [price, stop, quantity] = [form.order_price, form.stop_loss_price, form.quantity].map(
    toNumber,
  )

  // 注文価格を打っている途中で、1文字ごとにAPIを呼ばないよう、少し待ってから探す
  const searchPrice = useDebounced(price, 400)
  const stops = useStopCandidates(stock.code, isShort ? searchPrice : null, asOf)

  // 建てられる株数。1株あたりの損失は、ロスカットがあればその差、なければ 2ATR
  const byStop = price != null && stop != null && stop !== price
  const lossPerShare = byStop
    ? Math.abs(price - stop)
    : stock.atr == null
      ? null
      : stock.atr * sizing.atr_multiple
  const max = maxShares(sizing.risk_amount, lossPerShare, sizing.lot_size)
  const risk = byStop && quantity ? Math.abs(price - stop) * quantity : null
  const overRisk = risk != null && risk > sizing.risk_amount

  function pick(c: StopCandidate) {
    setForm((prev) => ({
      ...prev,
      stop_loss_price: String(c.price),
      stop_loss_reason: `${c.bar_date} の陰線の高値 ${formatPrice(c.bar_high)} の1ティック上（${c.atr_multiple.toFixed(2)}ATR）`,
    }))
  }

  function submit() {
    add.mutate(
      {
        code: stock.code,
        kind: form.kind,
        ordered_on: form.ordered_on,
        quantity: quantity ?? 0,
        order_price: price ?? 0,
        expires_on: form.expires_on || null,
        stop_loss_price: stop,
        stop_loss_reason: toText(form.stop_loss_reason),
        limit_price: toNumber(form.limit_price),
        memo: toText(form.memo),
      },
      { onSuccess: onAdded },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title={`注文を登録: ${formatCode(stock.code)} ${stock.name ?? ''}`}
      description="指値で仕掛けている注文を記録します。約定したら、売買記録の画面で「約定」を登録します。"
      submitLabel="注文を登録する"
      pending={add.isPending}
      error={add.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="order-kind" label="種類" required>
          <NativeSelect id="order-kind" value={form.kind} onChange={set('kind')} className="w-full">
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field htmlFor="order-date" label="注文した日" required>
          <Input id="order-date" type="date" value={form.ordered_on} onChange={set('ordered_on')} required />
        </Field>
        <Field
          htmlFor="order-price"
          label="注文価格（円）"
          hint={`基準日の終値 ${formatPrice(stock.close)}円・ATR ${formatPrice(stock.atr)}円`}
          required
        >
          <Input id="order-price" type="number" step="any" min="0" value={form.order_price} onChange={set('order_price')} required />
        </Field>
        <Field htmlFor="order-expires" label="有効期限" hint="空なら期限なし">
          <Input id="order-expires" type="date" value={form.expires_on} onChange={set('expires_on')} />
        </Field>

        <div className="col-span-2 space-y-1.5">
          <p className="text-sm font-medium">ロスカットの候補</p>
          <StopCandidateButtons
            isShort={isShort}
            loading={stops.isFetching && !stops.data}
            error={stops.error}
            candidates={stops.data?.candidates}
            lookbackDays={stops.data?.lookback_days}
            selected={stop}
            onPick={pick}
          />
        </div>

        <Field
          htmlFor="order-stop"
          label="ロスカット（円）"
          hint={risk == null ? '売り建ては注文価格より上、買いは下' : `想定損失 ${formatYen(risk)}円`}
        >
          <Input id="order-stop" type="number" step="any" min="0" value={form.stop_loss_price} onChange={set('stop_loss_price')} />
        </Field>
        <Field htmlFor="order-quantity" label="株数" required>
          <Input id="order-quantity" type="number" min={sizing.lot_size} step={sizing.lot_size} value={form.quantity} onChange={set('quantity')} required />
          <p data-testid="max-shares" className={cn('text-xs', max === 0 || overRisk ? 'text-destructive' : 'text-muted-foreground')}>
            {max == null
              ? 'ATRがないため、建てられる株数は計算できません'
              : max === 0
                ? '基準額の3%ルールでは建てられません（0株）'
                : `最大 ${formatShares(max)}株（許容損失 ${formatYen(sizing.risk_amount)}円 ÷ ${
                    byStop ? 'ロスカットまで' : `${sizing.atr_multiple}ATR`
                  } ${formatPrice(lossPerShare)}円）`}
            {overRisk && ' 想定損失が許容損失を超えています'}
          </p>
        </Field>
        <Field htmlFor="order-stop-reason" label="ロスカットの根拠" className="col-span-2">
          <Input id="order-stop-reason" value={form.stop_loss_reason} onChange={set('stop_loss_reason')} />
        </Field>
        <Field htmlFor="order-limit" label="利確の指値（円）" hint="約定後の売買記録の「指値」になる">
          <Input id="order-limit" type="number" step="any" min="0" value={form.limit_price} onChange={set('limit_price')} />
        </Field>
        <Field htmlFor="order-memo" label="メモ（注文の理由など）" className="col-span-2">
          <Textarea id="order-memo" rows={2} value={form.memo} onChange={set('memo')} />
        </Field>
      </div>
    </FormDialog>
  )
}

const TARGET_LABELS: Record<string, string> = { '1': '1ATR付近', '1.5': '1.5ATR付近', '2': '2ATR付近' }

/** ロスカットの候補を、押せるボタンで並べる。 */
function StopCandidateButtons(props: {
  isShort: boolean
  loading: boolean
  error: Error | null
  candidates: StopCandidate[] | undefined
  lookbackDays: number | undefined
  selected: number | null
  onPick: (c: StopCandidate) => void
}) {
  const note = (text: string) => <p className="text-sm text-muted-foreground">{text}</p>
  if (!props.isShort) return note('ロスカットの候補は、売り建てのときだけ出します。')
  if (props.error) return <p className="text-sm text-destructive">{props.error.message}</p>
  if (props.loading || !props.candidates) return note('探しています…')
  if (props.candidates.length === 0) return note('候補なし（1〜2ATRの範囲に、陰線の高値がありません）')
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {props.candidates.map((c) => (
          <Button
            key={c.price}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={props.selected === c.price}
            onClick={() => props.onPick(c)}
            className="h-auto flex-col items-start gap-0 py-1 aria-pressed:border-primary aria-pressed:bg-muted"
          >
            <span>
              {TARGET_LABELS[String(c.target_multiple)] ?? `${c.target_multiple}ATR付近`}{' '}
              <span className="font-semibold">{formatPrice(c.price)}円</span>
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {c.bar_date}・{c.atr_multiple.toFixed(2)}ATR
            </span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        直近{props.lookbackDays}営業日の陰線の高値＋1ティック。押すとロスカット欄に入ります。
      </p>
    </div>
  )
}
