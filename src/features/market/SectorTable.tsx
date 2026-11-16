import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { changeColor, formatChange } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SectorRankItem } from './api'

/** 33業種の上昇率ランキング。上昇率の高い順。 */
export function SectorTable({ sectors }: { sectors: SectorRankItem[] }) {
  // 棒の長さは、いちばん大きく動いた業種を100%にする
  const max = Math.max(...sectors.map((s) => Math.abs(s.change_pct)), 0.01)

  return (
    <div className="rounded-lg border bg-card">
      <Table className="tabular-nums">
        <TableHeader className="bg-muted/60 text-xs">
          <TableRow>
            <TableHead className="h-9 w-12 text-right">順位</TableHead>
            <TableHead className="h-9">業種</TableHead>
            <TableHead className="h-9 text-right" title="所属銘柄の騰落率の単純平均">
              上昇率
            </TableHead>
            <TableHead className="h-9 w-1/4" />
            <TableHead
              className="h-9 text-right"
              title="所属銘柄の騰落率の中央値。少数の銘柄に引っぱられていないかを確かめる"
            >
              中央値
            </TableHead>
            <TableHead className="h-9 text-right">値上がり</TableHead>
            <TableHead className="h-9 text-right">値下がり</TableHead>
            <TableHead className="h-9 text-right">銘柄数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sectors.map((s) => (
            <TableRow key={s.sector33}>
              <TableCell className="text-right text-muted-foreground">{s.rank}</TableCell>
              <TableCell>{s.sector33}</TableCell>
              <TableCell className={cn('text-right font-medium', changeColor(s.change_pct))}>
                {formatChange(s.change_pct)}
              </TableCell>
              <TableCell>
                <ChangeBar value={s.change_pct} max={max} />
              </TableCell>
              <TableCell className={cn('text-right', changeColor(s.median_pct))}>
                {formatChange(s.median_pct)}
              </TableCell>
              <TableCell className="text-right">{s.up}</TableCell>
              <TableCell className="text-right">{s.down}</TableCell>
              <TableCell className="text-right text-muted-foreground">{s.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** 真ん中を0にして、上昇は右へ赤、下落は左へ青の棒を伸ばす。数値の列を補う飾りなので、読み上げない。 */
function ChangeBar({ value, max }: { value: number; max: number }) {
  const width = `${(Math.abs(value) / max) * 50}%`
  return (
    <div aria-hidden className="relative h-2.5 rounded-full bg-muted">
      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
      <div
        className={cn('absolute inset-y-0 rounded-full', value >= 0 ? 'left-1/2 bg-up' : 'right-1/2 bg-down')}
        style={{ width }}
      />
    </div>
  )
}
