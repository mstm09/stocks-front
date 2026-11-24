import { Link } from 'react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { changeColor, formatCode, formatPct, formatPnl, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Position } from './api'

/** 保有中の売買。終値の日を出しているので、いつの値段で評価したかを確かめられる。 */
export function PositionTable({ positions }: { positions: Position[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table className="tabular-nums">
        <TableHeader className="bg-muted/60 text-xs">
          <TableRow>
            <TableHead className="h-9">番号</TableHead>
            <TableHead className="h-9">銘柄</TableHead>
            <TableHead className="h-9">種類</TableHead>
            <TableHead className="h-9 text-right">残りの株数</TableHead>
            <TableHead className="h-9 text-right">新規価格</TableHead>
            <TableHead className="h-9 text-right">終値</TableHead>
            <TableHead className="h-9">終値の日</TableHead>
            <TableHead className="h-9 text-right">含み損益</TableHead>
            <TableHead className="h-9 text-right">ロスカット</TableHead>
            <TableHead
              className="h-9 text-right"
              title="終値からロスカットまでの距離。マイナスは、終値がすでにロスカットを超えている"
            >
              ロスカットまで
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map(({ trade, ...p }) => (
            <TableRow key={trade.id}>
              <TableCell>
                <Link to={`/trades/${trade.id}`} className="underline underline-offset-4">
                  #{trade.id}
                </Link>
              </TableCell>
              <TableCell className="max-w-56 truncate">
                <span className="mr-2 font-mono text-muted-foreground">{formatCode(trade.code)}</span>
                {trade.name ?? '（銘柄名なし）'}
              </TableCell>
              <TableCell>{trade.kind_label}</TableCell>
              <TableCell className="text-right">{trade.remaining_quantity}</TableCell>
              <TableCell className="text-right">{formatPrice(trade.entry_price)}</TableCell>
              <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
              <TableCell className="text-muted-foreground">{p.price_date ?? '-'}</TableCell>
              <TableCell className={cn('text-right font-medium', changeColor(p.unrealized_pnl))}>
                {formatPnl(p.unrealized_pnl)}
              </TableCell>
              <TableCell className="text-right">{formatPrice(trade.stop_loss_price)}</TableCell>
              <TableCell
                className={cn('text-right', p.to_stop_pct != null && p.to_stop_pct < 0 && 'font-semibold text-destructive')}
              >
                {formatPct(p.to_stop_pct)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
