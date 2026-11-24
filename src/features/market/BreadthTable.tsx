import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { BreadthItem } from './api'

/** 比率の色。1より大きい（値上がりが多い）は赤、小さいは青、ちょうど1は色なし。 */
function ratioColor(ratio: number | null | undefined): string | undefined {
  if (ratio == null || ratio === 1) return undefined
  return ratio > 1 ? 'text-up' : 'text-down'
}

/** 騰落の表。1行が1期間。値上がり・変わらず・値下がりの割合を、横棒でも出す。 */
export function BreadthTable({ items }: { items: BreadthItem[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table className="tabular-nums">
        <TableHeader className="bg-muted/60 text-xs">
          <TableRow>
            <TableHead className="h-9">期間の最終日</TableHead>
            <TableHead className="h-9">比べる日</TableHead>
            <TableHead className="h-9 text-right">値上がり</TableHead>
            <TableHead className="h-9 text-right">値下がり</TableHead>
            <TableHead className="h-9 text-right">変わらず</TableHead>
            <TableHead className="h-9 w-1/3">割合</TableHead>
            <TableHead
              className="h-9 text-right"
              title="値上がり ÷ 値下がり。1 で均衡、1より大きいと値上がりが多い"
            >
              比率
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((b) => (
            <TableRow key={b.end_date}>
              <TableCell>{b.end_date}</TableCell>
              <TableCell className="text-muted-foreground">{b.base_date}</TableCell>
              <TableCell className="text-right text-up">{b.up}</TableCell>
              <TableCell className="text-right text-down">{b.down}</TableCell>
              <TableCell className="text-right text-muted-foreground">{b.unchanged}</TableCell>
              <TableCell>
                <BreadthBar item={b} />
              </TableCell>
              <TableCell className={cn('text-right font-medium', ratioColor(b.ratio))}>
                {b.ratio == null ? '-' : b.ratio.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** 値上がり（赤）・変わらず（灰）・値下がり（青）の割合を、1本の横棒で出す。 */
function BreadthBar({ item }: { item: BreadthItem }) {
  if (item.total === 0) return null
  const pct = (n: number) => `${(n / item.total) * 100}%`
  return (
    <div
      role="img"
      aria-label={`値上がり ${item.up}、変わらず ${item.unchanged}、値下がり ${item.down}`}
      className="flex h-2.5 overflow-hidden rounded-full bg-muted"
    >
      <div className="bg-up" style={{ width: pct(item.up) }} />
      <div className="bg-muted-foreground/30" style={{ width: pct(item.unchanged) }} />
      <div className="bg-down" style={{ width: pct(item.down) }} />
    </div>
  )
}
