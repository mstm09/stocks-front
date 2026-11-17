import { useState } from 'react'
import { Field } from '@/components/Field'
import { FormDialog } from '@/components/FormDialog'
import { NativeSelect } from '@/components/NativeSelect'
import { ErrorMessage, Loading } from '@/components/Status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { today } from '@/lib/date'
import { formatPnl } from '@/lib/format'
import { toNumber, toText } from '@/lib/number'
import { useAddCash, useCash, useDeleteCash } from './api'

/** 入出金の一覧と、登録。口座全体の金額は、ここの合計と損益から計算される。 */
export function CashSection() {
  const { data: rows, isPending, error } = useCash()
  const remove = useDeleteCash()
  const [adding, setAdding] = useState(false)

  return (
    <section aria-labelledby="cash-heading" className="space-y-2">
      <div className="flex items-center gap-4">
        <h2 id="cash-heading" className="font-semibold">
          入出金
        </h2>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          入出金を登録
        </Button>
      </div>
      {isPending && <Loading />}
      {error && <ErrorMessage error={error} />}
      {remove.error && <ErrorMessage error={remove.error} />}
      {rows &&
        (rows.length > 0 ? (
          <div className="max-w-2xl rounded-lg border bg-card">
            <Table className="tabular-nums">
              <TableHeader className="bg-muted/60 text-xs">
                <TableRow>
                  <TableHead className="h-9">日付</TableHead>
                  <TableHead className="h-9 text-right">金額</TableHead>
                  <TableHead className="h-9">メモ</TableHead>
                  <TableHead className="h-9" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.occurred_on}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPnl(c.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.memo ?? ''}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={remove.isPending}
                        aria-label={`${c.occurred_on} の入出金を取り消す`}
                        onClick={() => remove.mutate(c.id)}
                      >
                        取り消す
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            入出金がありません。最初に、口座の残高を入金として登録します（登録しないと、現金残高がマイナスに見えます）。
          </p>
        ))}
      {adding && <AddCashDialog onClose={() => setAdding(false)} />}
    </section>
  )
}

function AddCashDialog({ onClose }: { onClose: () => void }) {
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const add = useAddCash()

  function submit() {
    // APIには、入金をプラス、出金をマイナスで送る
    const value = Math.abs(toNumber(amount) ?? 0) * (direction === 'in' ? 1 : -1)
    add.mutate({ occurred_on: date, amount: value, memo: toText(memo) }, { onSuccess: onClose })
  }

  return (
    <FormDialog
      open
      onOpenChange={onClose}
      title="入出金を登録"
      submitLabel="登録する"
      pending={add.isPending}
      error={add.error}
      onSubmit={submit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="cash-direction" label="入金・出金" required>
          <NativeSelect
            id="cash-direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'in' | 'out')}
            className="w-full"
          >
            <option value="in">入金</option>
            <option value="out">出金</option>
          </NativeSelect>
        </Field>
        <Field htmlFor="cash-date" label="日付" required>
          <Input id="cash-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field htmlFor="cash-amount" label="金額（円）" required>
          <Input id="cash-amount" type="number" step="any" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field htmlFor="cash-memo" label="メモ">
          <Input id="cash-memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
      </div>
    </FormDialog>
  )
}
