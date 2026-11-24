import { type ReactNode, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorMessage, Loading } from '@/components/Status'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type Trade, useDeleteExit, useDeleteStopChange, useTrade } from '@/features/trades/api'
import {
  AddExitDialog,
  DeleteTradeDialog,
  EditPlanDialog,
  MoveStopDialog,
  ReviewDialog,
} from '@/features/trades/TradeDialogs'
import { StatusBadge } from '@/features/trades/TradeTable'
import { changeColor, formatCode, formatPnl, formatPrice, formatR, formatYen } from '@/lib/format'
import { cn } from '@/lib/utils'

/** 開いているフォームの種類。null は、どれも開いていない。 */
type DialogName = 'exit' | 'stop' | 'plan' | 'review' | 'delete' | null

/**
 * 売買1件（/trades/12）。決済の登録、ロスカットを動かす（履歴に残る）、指値・メモの変更、
 * 自己採点、削除ができる。
 */
export function TradeDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: trade, isPending, error } = useTrade(id)
  const [dialog, setDialog] = useState<DialogName>(null)
  const close = () => setDialog(null)

  if (isPending) return <Loading />
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorMessage error={error} />
        <Link to="/trades" className="underline underline-offset-4">
          売買記録へ戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="flex items-baseline gap-3 text-xl font-semibold">
          <span className="text-base font-normal text-muted-foreground">#{trade.id}</span>
          <span className="font-mono text-base font-normal text-muted-foreground">
            {formatCode(trade.code)}
          </span>
          <Link to={`/stocks/${trade.code}`} className="hover:underline">
            {trade.name ?? '（銘柄名なし）'}
          </Link>
        </h1>
        <span>{trade.kind_label}</span>
        <StatusBadge trade={trade} />
        <div className="ml-auto flex gap-2">
          {trade.status === 'OPEN' && <Button onClick={() => setDialog('exit')}>決済を登録</Button>}
          {trade.status === 'OPEN' && (
            <Button variant="outline" onClick={() => setDialog('stop')}>
              ロスカットを動かす
            </Button>
          )}
          <Button variant="outline" onClick={() => setDialog('plan')}>
            指値・メモを変える
          </Button>
          <Button variant="outline" onClick={() => setDialog('review')}>
            自己採点
          </Button>
          <Button variant="destructive" onClick={() => setDialog('delete')}>
            消す
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="新規">
          <Item label="約定日">{trade.opened_on}</Item>
          <Item label="株数">
            {trade.quantity}株
            {trade.status === 'OPEN' && `（残り ${trade.remaining_quantity}株）`}
          </Item>
          <Item label="約定価格">{formatPrice(trade.entry_price)}円</Item>
          <Item label="手数料など">{formatYen(trade.entry_fee)}円</Item>
          <Item label="メモ">{trade.memo ?? '-'}</Item>
        </Card>
        <Card title="計画と結果">
          <Item label="ロスカット">
            {trade.stop_loss_price == null ? '-' : `${formatPrice(trade.stop_loss_price)}円`}
            {trade.stop_loss_reason && (
              <span className="ml-2 text-muted-foreground">{trade.stop_loss_reason}</span>
            )}
          </Item>
          {trade.initial_stop_price != null && trade.initial_stop_price !== trade.stop_loss_price && (
            <Item label="最初のロスカット">{formatPrice(trade.initial_stop_price)}円</Item>
          )}
          <Item label="想定損失">
            {trade.risk_amount == null ? '-' : `${formatYen(trade.risk_amount)}円`}
            <span className="ml-2 text-xs text-muted-foreground">最初のロスカットで計算</span>
          </Item>
          {trade.stop_pnl != null && (
            <Item label="ロスカットでの損益">
              <span className={cn('font-medium', changeColor(trade.stop_pnl))}>
                {formatPnl(trade.stop_pnl)}円
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {trade.stop_pnl >= 0 ? '利益を確保できている' : '残りの株が今のロスカットで決済されたとき'}
              </span>
            </Item>
          )}
          <Item label="指値">
            {trade.limit_price == null ? '-' : `${formatPrice(trade.limit_price)}円`}
            {trade.limit_price != null && trade.limit_quantity != null && `（${trade.limit_quantity}株）`}
          </Item>
          <Item label="確定損益">
            <span className={cn('font-semibold', changeColor(trade.realized_pnl))}>
              {trade.exits.length > 0 ? `${formatPnl(trade.realized_pnl)}円` : '-'}
            </span>
          </Item>
          <Item label="R倍数">
            <span className={changeColor(trade.r_multiple)}>{formatR(trade.r_multiple)}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              確定損益 ÷ 想定損失（すべて決済したあと）
            </span>
          </Item>
        </Card>
      </div>

      <section aria-labelledby="stops-heading" className="space-y-2">
        <h2 id="stops-heading" className="font-semibold">
          ロスカットの履歴
        </h2>
        {trade.stop_changes.length > 0 ? (
          <StopTable trade={trade} />
        ) : (
          <p className="text-sm text-muted-foreground">ロスカットは設定していません。</p>
        )}
      </section>

      <section aria-labelledby="exits-heading" className="space-y-2">
        <h2 id="exits-heading" className="font-semibold">
          決済
        </h2>
        {trade.exits.length > 0 ? (
          <ExitTable trade={trade} />
        ) : (
          <p className="text-sm text-muted-foreground">まだ決済していません。</p>
        )}
      </section>

      <section aria-labelledby="review-heading" className="space-y-2">
        <h2 id="review-heading" className="font-semibold">
          自己採点
        </h2>
        {trade.self_score == null && !trade.self_review ? (
          <p className="text-sm text-muted-foreground">まだ採点していません。</p>
        ) : (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-2xl font-semibold tabular-nums">
              {trade.self_score ?? '-'}
              <span className="ml-1 text-sm font-normal text-muted-foreground">点</span>
            </p>
            {trade.self_review && <p className="mt-2 whitespace-pre-wrap">{trade.self_review}</p>}
          </div>
        )}
      </section>

      {dialog === 'exit' && <AddExitDialog trade={trade} onClose={close} />}
      {dialog === 'stop' && <MoveStopDialog trade={trade} onClose={close} />}
      {dialog === 'plan' && <EditPlanDialog trade={trade} onClose={close} />}
      {dialog === 'review' && <ReviewDialog trade={trade} onClose={close} />}
      {dialog === 'delete' && (
        <DeleteTradeDialog trade={trade} onClose={close} onDeleted={() => navigate('/trades')} />
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-sm tabular-nums">{children}</dl>
    </section>
  )
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

/** 決済の一覧。間違えて登録した決済は、「取り消す」で消せる（保有中に戻る）。 */
function ExitTable({ trade }: { trade: Trade }) {
  const remove = useDeleteExit(trade.id)
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table className="tabular-nums">
          <TableHeader className="bg-muted/60 text-xs">
            <TableRow>
              <TableHead className="h-9">約定日</TableHead>
              <TableHead className="h-9 text-right">株数</TableHead>
              <TableHead className="h-9 text-right">約定価格</TableHead>
              <TableHead className="h-9 text-right">費用</TableHead>
              <TableHead className="h-9 text-right">損益</TableHead>
              <TableHead className="h-9">メモ</TableHead>
              <TableHead className="h-9" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {trade.exits.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.closed_on}</TableCell>
                <TableCell className="text-right">{e.quantity}</TableCell>
                <TableCell className="text-right">{formatPrice(e.price)}</TableCell>
                <TableCell className="text-right">{formatYen(e.fee)}</TableCell>
                <TableCell className={cn('text-right font-medium', changeColor(e.pnl))}>
                  {formatPnl(e.pnl)}
                </TableCell>
                <TableCell className="text-muted-foreground">{e.memo ?? ''}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    aria-label={`${e.closed_on} の決済を取り消す`}
                    onClick={() => remove.mutate(e.id)}
                  >
                    取り消す
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {remove.error && <ErrorMessage error={remove.error} />}
    </div>
  )
}

/** ロスカットの履歴（古い順）。いちばん下が今のロスカット。間違えて登録した行は消せる。 */
function StopTable({ trade }: { trade: Trade }) {
  const remove = useDeleteStopChange(trade.id)
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table className="tabular-nums">
          <TableHeader className="bg-muted/60 text-xs">
            <TableRow>
              <TableHead className="h-9">日付</TableHead>
              <TableHead className="h-9">変更</TableHead>
              <TableHead className="h-9">根拠</TableHead>
              <TableHead className="h-9">メモ</TableHead>
              <TableHead className="h-9" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {trade.stop_changes.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell>{s.changed_on}</TableCell>
                <TableCell>
                  {i === 0
                    ? `${formatPrice(s.price)}円に設定`
                    : s.price == null
                      ? `${formatPrice(s.previous_price)}円 → 外した`
                      : `${formatPrice(s.previous_price)}円 → ${formatPrice(s.price)}円`}
                </TableCell>
                <TableCell>{s.reason ?? ''}</TableCell>
                <TableCell className="text-muted-foreground">{s.memo ?? ''}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    aria-label={`${s.changed_on} のロスカットの変更を消す`}
                    onClick={() => remove.mutate(s.id)}
                  >
                    消す
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {remove.error && <ErrorMessage error={remove.error} />}
    </div>
  )
}
