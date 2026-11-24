import { useState } from 'react'
import { Field } from '@/components/Field'
import { FormDialog } from '@/components/FormDialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Trade } from '@/features/trades/api'
import { today } from '@/lib/date'
import { formatCode, formatPrice } from '@/lib/format'
import { fromNumber, toNumber, toText } from '@/lib/number'
import { type Order, useCancelOrder, useFillOrder, useUpdateOrder } from './api'

// 注文中一覧（売買記録の画面）から開く、約定・変更・取消のフォーム。
// 入力の間違いはAPIが調べて返すので（400）、その文言をフォームの下に出す。

type DialogProps = { order: Order; onClose: () => void }

const title = (o: Order) => `注文 #${o.id}: ${formatCode(o.code)} ${o.name ?? ''}`

/**
 * 約定を登録する。注文の内容で売買記録が1件でき、保有中の一覧に移る。
 * 部分約定は扱わない。一部だけ約定したときは、約定した株数を入れる（残りは取消扱い）。
 */
export function FillOrderDialog({ order, onClose, onFilled }: DialogProps & { onFilled: (trade: Trade) => void }) {
  const [form, setForm] = useState({
    filled_on: today(),
    price: fromNumber(order.order_price),
    quantity: String(order.quantity),
    fee: '',
  })
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const fill = useFillOrder(order.id)
  const quantity = toNumber(form.quantity)

  function submit() {
    fill.mutate(
      {
        filled_on: form.filled_on,
        price: toNumber(form.price),
        quantity,
        fee: toNumber(form.fee) ?? 0,
      },
      { onSuccess: onFilled },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title={`約定を登録: ${title(order)}`}
      description={`${order.kind_label} ${order.quantity}株 × ${formatPrice(order.order_price)}円の注文。登録すると、売買記録ができます。`}
      submitLabel="約定を登録する"
      pending={fill.isPending}
      error={fill.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="fill-date" label="約定日" required>
          <Input id="fill-date" type="date" value={form.filled_on} onChange={set('filled_on')} required />
        </Field>
        <Field htmlFor="fill-price" label="約定価格（円）" hint="空なら注文価格">
          <Input id="fill-price" type="number" step="any" min="0" value={form.price} onChange={set('price')} />
        </Field>
        <Field
          htmlFor="fill-quantity"
          label="約定した株数"
          hint={
            quantity != null && quantity < order.quantity
              ? `残りの ${order.quantity - quantity}株は、取消扱いになります`
              : '一部だけ約定したときは、減らす'
          }
          required
        >
          <Input id="fill-quantity" type="number" min="1" max={order.quantity} value={form.quantity} onChange={set('quantity')} required />
        </Field>
        <Field htmlFor="fill-fee" label="手数料など（円）">
          <Input id="fill-fee" type="number" step="any" min="0" value={form.fee} onChange={set('fee')} />
        </Field>
      </div>
    </FormDialog>
  )
}

/** 注文中の注文を変える。空にした項目は消える（株数と注文価格は消せない）。 */
export function EditOrderDialog({ order, onClose }: DialogProps) {
  const [form, setForm] = useState({
    quantity: String(order.quantity),
    order_price: fromNumber(order.order_price),
    expires_on: order.expires_on ?? '',
    stop_loss_price: fromNumber(order.stop_loss_price),
    stop_loss_reason: order.stop_loss_reason ?? '',
    limit_price: fromNumber(order.limit_price),
    memo: order.memo ?? '',
  })
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const update = useUpdateOrder(order.id)

  function submit() {
    update.mutate(
      {
        quantity: toNumber(form.quantity),
        order_price: toNumber(form.order_price),
        expires_on: form.expires_on || null,
        stop_loss_price: toNumber(form.stop_loss_price),
        stop_loss_reason: toText(form.stop_loss_reason),
        limit_price: toNumber(form.limit_price),
        memo: toText(form.memo),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title={`注文を変える: ${title(order)}`}
      description="空にした項目は、消えます（株数と注文価格は消せません）。"
      submitLabel="保存する"
      pending={update.isPending}
      error={update.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="edit-order-quantity" label="株数" required>
          <Input id="edit-order-quantity" type="number" min="1" value={form.quantity} onChange={set('quantity')} required />
        </Field>
        <Field htmlFor="edit-order-price" label="注文価格（円）" required>
          <Input id="edit-order-price" type="number" step="any" min="0" value={form.order_price} onChange={set('order_price')} required />
        </Field>
        <Field htmlFor="edit-order-stop" label="ロスカット（円）">
          <Input id="edit-order-stop" type="number" step="any" min="0" value={form.stop_loss_price} onChange={set('stop_loss_price')} />
        </Field>
        <Field htmlFor="edit-order-expires" label="有効期限" hint="空なら期限なし">
          <Input id="edit-order-expires" type="date" value={form.expires_on} onChange={set('expires_on')} />
        </Field>
        <Field htmlFor="edit-order-stop-reason" label="ロスカットの根拠" className="col-span-2">
          <Input id="edit-order-stop-reason" value={form.stop_loss_reason} onChange={set('stop_loss_reason')} />
        </Field>
        <Field htmlFor="edit-order-limit" label="利確の指値（円）">
          <Input id="edit-order-limit" type="number" step="any" min="0" value={form.limit_price} onChange={set('limit_price')} />
        </Field>
        <Field htmlFor="edit-order-memo" label="メモ" className="col-span-2">
          <Textarea id="edit-order-memo" rows={2} value={form.memo} onChange={set('memo')} />
        </Field>
      </div>
    </FormDialog>
  )
}

/** 注文を取り消す前の確認。期限切れになった注文も、これで閉じる。 */
export function CancelOrderDialog({ order, onClose }: DialogProps) {
  const [date, setDate] = useState(today())
  const cancel = useCancelOrder(order.id)
  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title={`取り消しますか？ ${title(order)}`}
      description={`${order.kind_label} ${order.quantity}株 × ${formatPrice(order.order_price)}円の注文を「取消」にします。`}
      submitLabel="取り消す"
      destructive
      pending={cancel.isPending}
      error={cancel.error}
      onSubmit={() => cancel.mutate(date, { onSuccess: onClose })}
    >
      <Field htmlFor="cancel-date" label="取消の日" required>
        <Input id="cancel-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-44" />
      </Field>
    </FormDialog>
  )
}
