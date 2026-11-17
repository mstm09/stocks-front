import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { changeColor, formatCode, formatPnl, formatPrice, formatR } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Trade } from './api'

/** 状態（保有中 / 決済済み）のしるし。 */
export function StatusBadge({ trade }: { trade: Trade }) {
  return trade.status === 'OPEN' ? (
    <Badge>保有中</Badge>
  ) : (
    <Badge variant="secondary">決済済み</Badge>
  )
}

/** 売買の一覧。番号か銘柄名を押すと、1件の画面へ移る。 */
export function TradeTable({ trades }: { trades: Trade[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table className="tabular-nums">
        <TableHeader className="bg-muted/60 text-xs">
          <TableRow>
            <TableHead className="h-9">番号</TableHead>
            <TableHead className="h-9">新規の日</TableHead>
            <TableHead className="h-9">銘柄</TableHead>
            <TableHead className="h-9">種類</TableHead>
            <TableHead className="h-9 text-right">株数（残り）</TableHead>
            <TableHead className="h-9 text-right">新規価格</TableHead>
            <TableHead className="h-9 text-right">ロスカット</TableHead>
            <TableHead className="h-9">状態</TableHead>
            <TableHead className="h-9 text-right">確定損益</TableHead>
            <TableHead className="h-9 text-right" title="確定損益 ÷ 想定損失（すべて決済したあと）">
              R倍数
            </TableHead>
            <TableHead className="h-9 text-right">自己採点</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <Link to={`/trades/${t.id}`} className="underline underline-offset-4">
                  #{t.id}
                </Link>
              </TableCell>
              <TableCell>{t.opened_on}</TableCell>
              <TableCell className="max-w-56 truncate">
                <span className="mr-2 font-mono text-muted-foreground">{formatCode(t.code)}</span>
                <Link to={`/trades/${t.id}`} className="hover:underline">
                  {t.name ?? '（銘柄名なし）'}
                </Link>
              </TableCell>
              <TableCell>{t.kind_label}</TableCell>
              <TableCell className="text-right">
                {t.quantity}
                {t.status === 'OPEN' && t.remaining_quantity !== t.quantity && (
                  <span className="text-muted-foreground">（{t.remaining_quantity}）</span>
                )}
              </TableCell>
              <TableCell className="text-right">{formatPrice(t.entry_price)}</TableCell>
              <TableCell className="text-right">{formatPrice(t.stop_loss_price)}</TableCell>
              <TableCell>
                <StatusBadge trade={t} />
              </TableCell>
              <TableCell className={cn('text-right font-medium', changeColor(t.realized_pnl))}>
                {t.exits.length > 0 ? formatPnl(t.realized_pnl) : '-'}
              </TableCell>
              <TableCell className={cn('text-right', changeColor(t.r_multiple))}>
                {formatR(t.r_multiple)}
              </TableCell>
              <TableCell className="text-right">
                {t.self_score == null ? '-' : `${t.self_score}点`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
