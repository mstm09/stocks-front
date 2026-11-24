import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Empty, ErrorMessage, Loading } from '@/components/Status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatChange, formatCode, formatPrice, formatYen } from '@/lib/format'
import { type Order, useOrders } from './api'
import { CancelOrderDialog, EditOrderDialog, FillOrderDialog } from './OrderDialogs'

/** 状態のしるし。注文中で有効期限を過ぎたものは「期限切れ」。 */
export function OrderStatusBadge({ order }: { order: Order }) {
  if (order.status === 'PENDING') {
    return order.is_expired ? <Badge variant="destructive">期限切れ</Badge> : <Badge>注文中</Badge>
  }
  if (order.status === 'FILLED') {
    return (
      <Badge variant="secondary" asChild={order.trade_id != null}>
        {order.trade_id != null ? <Link to={`/trades/${order.trade_id}`}>約定 #{order.trade_id}</Link> : '約定'}
      </Badge>
    )
  }
  return <Badge variant="outline">取消</Badge>
}

type Action = { kind: 'fill' | 'edit' | 'cancel'; order: Order }

/**
 * 注文（指値で仕掛け中）の一覧。売買記録の画面の上に出す。
 * 既定は注文中だけ。「全部」で、約定・取消も見られる。
 * 行ごとに「約定」「変える」「取消」。約定を登録すると、売買記録ができて、その画面へ移る。
 */
export function OrderSection() {
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const { data: orders, isPending, error } = useOrders(showAll ? undefined : 'PENDING')
  const [action, setAction] = useState<Action | null>(null)
  const close = () => setAction(null)

  return (
    <section aria-labelledby="orders-heading" className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="orders-heading" className="text-lg font-semibold">
          注文
        </h2>
        <div role="group" aria-label="注文を絞る" className="flex gap-1">
          <Button size="sm" variant={showAll ? 'outline' : 'default'} aria-pressed={!showAll} onClick={() => setShowAll(false)}>
            注文中
          </Button>
          <Button size="sm" variant={showAll ? 'default' : 'outline'} aria-pressed={showAll} onClick={() => setShowAll(true)}>
            全部
          </Button>
        </div>
      </div>

      {isPending && <Loading />}
      {error && <ErrorMessage error={error} />}
      {orders && orders.length === 0 && (
        <Empty>
          {showAll ? '注文の記録がありません。' : '注文中の注文はありません。'}
          <Link to="/candidates" className="ml-1 underline">
            売り建て候補
          </Link>
          の「注文」から登録します。
        </Empty>
      )}
      {orders && orders.length > 0 && (
        <div className="rounded-lg border bg-card">
          <Table className="tabular-nums">
            <TableHeader className="bg-muted/60 text-xs">
              <TableRow>
                <TableHead className="h-9">番号</TableHead>
                <TableHead className="h-9">注文の日</TableHead>
                <TableHead className="h-9">銘柄</TableHead>
                <TableHead className="h-9">種類</TableHead>
                <TableHead className="h-9 text-right">株数</TableHead>
                <TableHead className="h-9 text-right">注文価格</TableHead>
                <TableHead className="h-9 text-right" title="最新の終値（調整前）">
                  終値
                </TableHead>
                <TableHead className="h-9 text-right" title="終値から注文価格まで。プラスは注文価格が終値より上">
                  注文価格まで
                </TableHead>
                <TableHead className="h-9 text-right">ロスカット</TableHead>
                <TableHead className="h-9 text-right" title="|注文価格 − ロスカット| × 株数">
                  想定損失
                </TableHead>
                <TableHead className="h-9">有効期限</TableHead>
                <TableHead className="h-9">状態</TableHead>
                <TableHead className="h-9">
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>#{o.id}</TableCell>
                  <TableCell>{o.ordered_on}</TableCell>
                  <TableCell className="max-w-56 truncate">
                    <span className="mr-2 font-mono text-muted-foreground">{formatCode(o.code)}</span>
                    <Link to={`/stocks/${o.code}`} className="hover:underline">
                      {o.name ?? '（銘柄名なし）'}
                    </Link>
                  </TableCell>
                  <TableCell>{o.kind_label}</TableCell>
                  <TableCell className="text-right">{o.quantity}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(o.order_price)}</TableCell>
                  <TableCell className="text-right" title={o.price_date ?? undefined}>
                    {formatPrice(o.price)}
                  </TableCell>
                  <TableCell className="text-right">{formatChange(o.to_order_pct)}</TableCell>
                  <TableCell className="text-right">{formatPrice(o.stop_loss_price)}</TableCell>
                  <TableCell className="text-right">{formatYen(o.risk_amount)}</TableCell>
                  <TableCell>{o.expires_on ?? '-'}</TableCell>
                  <TableCell>
                    <OrderStatusBadge order={o} />
                  </TableCell>
                  <TableCell className="py-1">
                    {o.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <Button size="xs" aria-label={`注文 #${o.id} の約定を登録`} onClick={() => setAction({ kind: 'fill', order: o })}>
                          約定
                        </Button>
                        <Button size="xs" variant="outline" aria-label={`注文 #${o.id} を変える`} onClick={() => setAction({ kind: 'edit', order: o })}>
                          変える
                        </Button>
                        <Button size="xs" variant="ghost" aria-label={`注文 #${o.id} を取り消す`} onClick={() => setAction({ kind: 'cancel', order: o })}>
                          取消
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {action?.kind === 'fill' && (
        <FillOrderDialog order={action.order} onClose={close} onFilled={(trade) => navigate(`/trades/${trade.id}`)} />
      )}
      {action?.kind === 'edit' && <EditOrderDialog order={action.order} onClose={close} />}
      {action?.kind === 'cancel' && <CancelOrderDialog order={action.order} onClose={close} />}
    </section>
  )
}
