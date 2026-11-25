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
import { changeColor, formatChange, formatCode, formatPnl, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Trade } from './api'
import { StopPositionBadge } from './StopPositionBadge'
import { stopRangeBasis, stopRangeText } from './stopRange'

/** 状態（保有中 / 決済済み）のしるし。 */
export function StatusBadge({ trade }: { trade: Trade }) {
  return trade.status === 'OPEN' ? (
    <Badge>保有中</Badge>
  ) : (
    <Badge variant="secondary">決済済み</Badge>
  )
}

/**
 * 売買の一覧。約定価格・現在値・今の損益が中心。銘柄名を押すと、1件の画面へ移る。
 * - 現在値: 保有中は最新の終値、決済済みは決済価格の平均
 * - 損益: 保有中は 含み損益 ＋ 一部決済の確定損益、決済済みは 確定損益
 * - ロスカット: 範囲（終値から1〜2ATR）から外れていたら印。範囲はマウスを乗せると出る
 */
export function TradeTable({ trades }: { trades: Trade[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table className="tabular-nums">
        <TableHeader className="bg-muted/60 text-xs">
          <TableRow>
            <TableHead className="h-9">新規の日</TableHead>
            <TableHead className="h-9">銘柄</TableHead>
            <TableHead className="h-9">種類</TableHead>
            <TableHead className="h-9 text-right" title="保有中は残りの株数（全体）">
              株数
            </TableHead>
            <TableHead className="h-9 text-right">約定価格</TableHead>
            <TableHead className="h-9 text-right" title="保有中は最新の終値、決済済みは決済価格の平均">
              現在値
            </TableHead>
            <TableHead className="h-9 text-right" title="保有中は 含み損益 ＋ 一部決済の確定損益、決済済みは 確定損益">
              損益
            </TableHead>
            <TableHead className="h-9 text-right" title="約定価格から現在値までの値動き。利益の向きがプラス">
              損益率
            </TableHead>
            <TableHead className="h-9 text-right" title="今のロスカット。範囲（終値から1〜2ATR）から外れていたら印">
              ロスカット
            </TableHead>
            <TableHead className="h-9">状態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((t) => {
            const open = t.status === 'OPEN'
            const range = stopRangeText(t)
            return (
              <TableRow key={t.id}>
                <TableCell>{t.opened_on}</TableCell>
                <TableCell className="max-w-56 truncate">
                  <span className="mr-2 font-mono text-muted-foreground">{formatCode(t.code)}</span>
                  <Link to={`/trades/${t.id}`} className="hover:underline">
                    {t.name ?? '（銘柄名なし）'}
                  </Link>
                </TableCell>
                <TableCell>{t.kind_label}</TableCell>
                <TableCell className="text-right">
                  {open && t.remaining_quantity !== t.quantity ? (
                    <>
                      {t.remaining_quantity}
                      <span className="text-muted-foreground">（{t.quantity}）</span>
                    </>
                  ) : (
                    t.quantity
                  )}
                </TableCell>
                <TableCell className="text-right">{formatPrice(t.entry_price)}</TableCell>
                <TableCell
                  className="text-right"
                  title={t.current_price_date ? `${t.current_price_date}${open ? ' の終値' : ' に決済'}` : undefined}
                >
                  {formatPrice(t.current_price)}
                </TableCell>
                <TableCell className={cn('text-right font-medium', changeColor(t.current_pnl))}>
                  {formatPnl(t.current_pnl)}
                </TableCell>
                <TableCell className={cn('text-right', changeColor(t.pnl_pct))}>
                  {formatChange(t.pnl_pct)}
                </TableCell>
                <TableCell
                  className="text-right whitespace-nowrap"
                  title={range ? `範囲 ${range}（${stopRangeBasis(t)}）` : undefined}
                >
                  {open ? (
                    <>
                      <StopPositionBadge trade={t} />
                      <span className="ml-1">{formatPrice(t.stop_loss_price)}</span>
                    </>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge trade={t} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
