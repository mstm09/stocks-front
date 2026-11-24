import type { ReactNode } from 'react'
import { ErrorMessage, Loading } from '@/components/Status'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type StatsRow, usePortfolio, useStats } from '@/features/trades/api'
import { PositionTable } from '@/features/trades/PositionTable'
import { changeColor, formatCode, formatPnl } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * 成績（/stats）。売買記録から、システム開始からの累計と、年ごとの成績を出す。
 * すべて決済した売買を、最後に決済した日の年で集計する。入出金は使わない。
 * 下に、保有中の売買の含み損益を出す（成績には入らない）。
 */
export function StatsPage() {
  const stats = useStats()
  const portfolio = usePortfolio(undefined)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">成績</h1>
        <p className="text-sm text-muted-foreground">
          すべて決済した売買を、最後に決済した日の年で集計します（一部だけ決済した売買は、全部決済した年に入ります）。
        </p>
      </div>

      {stats.isPending && <Loading />}
      {stats.error && <ErrorMessage error={stats.error} />}
      {stats.data && <Total row={stats.data.total} />}
      {stats.data && stats.data.years.length > 0 && <YearTable rows={stats.data.years} />}

      <section aria-labelledby="positions-heading" className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 id="positions-heading" className="font-semibold">
            保有中
          </h2>
          {portfolio.data && portfolio.data.positions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              含み損益の合計{' '}
              <span className={cn('font-medium', changeColor(portfolio.data.unrealized_pnl))}>
                {formatPnl(portfolio.data.unrealized_pnl)}円
              </span>
              （成績には入りません。{portfolio.data.as_of_date} 時点）
            </p>
          )}
        </div>
        {portfolio.isPending && <Loading />}
        {portfolio.error && <ErrorMessage error={portfolio.error} />}
        {portfolio.data &&
          (portfolio.data.positions.length > 0 ? (
            <PositionTable positions={portfolio.data.positions} />
          ) : (
            <p className="text-sm text-muted-foreground">保有中の売買はありません。</p>
          ))}
        {portfolio.data && portfolio.data.unpriced_codes.length > 0 && (
          <p className="text-sm text-destructive">
            終値がなく、評価できなかった銘柄: {portfolio.data.unpriced_codes.map(formatCode).join('、')}
          </p>
        )}
      </section>
    </div>
  )
}

const rate = (v: number | null | undefined) => (v == null ? '-' : `${v.toFixed(1)}%`)
const score = (v: number | null | undefined) => (v == null ? '-' : `${v.toFixed(1)}点`)

/** システム開始からの累計。 */
function Total({ row }: { row: StatsRow }) {
  if (row.trades === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        まだ、すべて決済した売買がありません。決済すると、ここに成績が出ます。
      </p>
    )
  }
  return (
    <section aria-labelledby="total-heading" className="space-y-2">
      <h2 id="total-heading" className="font-semibold">
        累計
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {row.first_date} 〜 {row.last_date}
        </span>
      </h2>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="確定損益" color={changeColor(row.realized_pnl)} large>
          {formatPnl(row.realized_pnl)}
          <Unit>円</Unit>
        </Tile>
        <Tile label="回数" large>
          {row.trades}
          <Unit>回</Unit>
          <Sub>
            勝ち {row.wins}・負け {row.losses}
            {row.evens > 0 && `・引き分け ${row.evens}`}
          </Sub>
        </Tile>
        <Tile label="勝率" hint="勝ち ÷（勝ち ＋ 負け）" large>
          {rate(row.win_rate)}
        </Tile>
        <Tile label="自己採点の平均" hint={`採点した ${row.scored}回の平均`} large>
          {score(row.avg_score)}
        </Tile>
        <Tile label="平均の利益" color={changeColor(row.avg_win)}>
          {formatPnl(row.avg_win)}
          {row.avg_win != null && <Unit>円</Unit>}
        </Tile>
        <Tile label="平均の損失" color={changeColor(row.avg_loss)}>
          {formatPnl(row.avg_loss)}
          {row.avg_loss != null && <Unit>円</Unit>}
        </Tile>
        <Tile label="最大の利益" color={changeColor(row.max_win)}>
          {formatPnl(row.max_win)}
          {row.max_win != null && <Unit>円</Unit>}
        </Tile>
        <Tile label="最大の損失" color={changeColor(row.max_loss)}>
          {formatPnl(row.max_loss)}
          {row.max_loss != null && <Unit>円</Unit>}
        </Tile>
      </dl>
    </section>
  )
}

/** 年ごとの成績（新しい年が上）。 */
function YearTable({ rows }: { rows: StatsRow[] }) {
  return (
    <section aria-labelledby="years-heading" className="space-y-2">
      <h2 id="years-heading" className="font-semibold">
        年ごと
      </h2>
      <div className="rounded-lg border bg-card">
        <Table className="tabular-nums">
          <TableHeader className="bg-muted/60 text-xs">
            <TableRow>
              <TableHead className="h-9">年</TableHead>
              <TableHead className="h-9 text-right">確定損益</TableHead>
              <TableHead className="h-9 text-right">回数</TableHead>
              <TableHead className="h-9 text-right">勝ち・負け</TableHead>
              <TableHead className="h-9 text-right">勝率</TableHead>
              <TableHead className="h-9 text-right">平均の利益</TableHead>
              <TableHead className="h-9 text-right">平均の損失</TableHead>
              <TableHead className="h-9 text-right">最大の利益</TableHead>
              <TableHead className="h-9 text-right">最大の損失</TableHead>
              <TableHead className="h-9 text-right">自己採点</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.year}>
                <TableCell>{r.year}年</TableCell>
                <TableCell className={cn('text-right font-medium', changeColor(r.realized_pnl))}>
                  {formatPnl(r.realized_pnl)}
                </TableCell>
                <TableCell className="text-right">{r.trades}</TableCell>
                <TableCell className="text-right">
                  {r.wins}・{r.losses}
                  {r.evens > 0 && <span className="text-muted-foreground">（分 {r.evens}）</span>}
                </TableCell>
                <TableCell className="text-right">{rate(r.win_rate)}</TableCell>
                <TableCell className={cn('text-right', changeColor(r.avg_win))}>{formatPnl(r.avg_win)}</TableCell>
                <TableCell className={cn('text-right', changeColor(r.avg_loss))}>{formatPnl(r.avg_loss)}</TableCell>
                <TableCell className={cn('text-right', changeColor(r.max_win))}>{formatPnl(r.max_win)}</TableCell>
                <TableCell className={cn('text-right', changeColor(r.max_loss))}>{formatPnl(r.max_loss)}</TableCell>
                <TableCell className="text-right">{score(r.avg_score)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function Unit({ children }: { children: string }) {
  return <span className="ml-1 text-xs font-normal text-muted-foreground">{children}</span>
}

function Sub({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-xs font-normal text-muted-foreground">{children}</span>
}

type TileProps = {
  label: string
  hint?: string
  /** 数値の色（利益は赤、損失は青） */
  color?: string
  large?: boolean
  children: ReactNode
}

/** 数値を1つ大きく見せる枠。 */
function Tile({ label, hint, color, large, children }: TileProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 font-semibold tabular-nums', large ? 'text-2xl' : 'text-lg', color)}>{children}</dd>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
