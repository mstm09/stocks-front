import { Link } from 'react-router'
import { AsOfPicker } from '@/components/AsOfPicker'
import { ErrorMessage, Loading } from '@/components/Status'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type Position, usePortfolio } from '@/features/trades/api'
import { CashSection } from '@/features/trades/CashSection'
import { changeColor, formatCode, formatPct, formatPnl, formatPrice, formatYen } from '@/lib/format'
import { useUrlParams } from '@/lib/useUrlParams'
import { cn } from '@/lib/utils'

/** 口座全体（/portfolio?as_of=2026-08-14）。現金残高、保有中の評価、損益、入出金。 */
export function PortfolioPage() {
  const url = useUrlParams()
  const asOf = url.get('as_of')
  const { data, isPending, error } = usePortfolio(asOf)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="text-xl font-semibold">口座</h1>
        {data && <p className="text-sm text-muted-foreground">{data.as_of_date} 時点</p>}
        <div className="ml-auto">
          <AsOfPicker value={asOf} onChange={(v) => url.set('as_of', v)} />
        </div>
      </div>

      {isPending && <Loading />}
      {error && <ErrorMessage error={error} />}

      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="口座全体" hint="現金 ＋ 現物の評価額 ＋ 信用の含み損益" large>
              {formatYen(data.equity)}
            </Tile>
            <Tile label="損益の合計" hint="確定損益 ＋ 含み損益" color={changeColor(data.total_pnl)} large>
              {formatPnl(data.total_pnl)}
            </Tile>
            <Tile label="確定損益" color={changeColor(data.realized_pnl)}>
              {formatPnl(data.realized_pnl)}
            </Tile>
            <Tile label="含み損益" color={changeColor(data.unrealized_pnl)}>
              {formatPnl(data.unrealized_pnl)}
            </Tile>
            <Tile label="現金残高">{formatYen(data.cash)}</Tile>
            <Tile label="現物の評価額">{formatYen(data.spot_value)}</Tile>
            <Tile label="信用の建玉金額" hint="参考。口座全体には足さない">
              {formatYen(data.margin_exposure)}
            </Tile>
            <Tile label="入金 − 出金">{formatYen(data.net_deposit)}</Tile>
          </dl>

          <section aria-labelledby="positions-heading" className="space-y-2">
            <h2 id="positions-heading" className="font-semibold">
              保有中
            </h2>
            {data.positions.length > 0 ? (
              <PositionTable positions={data.positions} />
            ) : (
              <p className="text-sm text-muted-foreground">保有中の売買はありません。</p>
            )}
            {data.unpriced_codes.length > 0 && (
              <p className="text-sm text-destructive">
                終値がなく、評価できなかった銘柄: {data.unpriced_codes.map(formatCode).join('、')}
              </p>
            )}
          </section>
        </>
      )}

      <CashSection />
    </div>
  )
}

type TileProps = {
  label: string
  hint?: string
  /** 数値の色（値上がりは赤、値下がりは青） */
  color?: string
  large?: boolean
  children: string
}

/** 数値を1つ大きく見せる枠。 */
function Tile({ label, hint, color, large, children }: TileProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 font-semibold tabular-nums', large ? 'text-2xl' : 'text-lg', color)}>
        {children}
        <span className="ml-1 text-xs font-normal text-muted-foreground">円</span>
      </dd>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** 保有中の売買。終値の日を出しているので、いつの値段で評価したかを確かめられる。 */
function PositionTable({ positions }: { positions: Position[] }) {
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
