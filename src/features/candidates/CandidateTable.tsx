import { useMemo, useState } from 'react'
import { formatCode, formatPrice, formatZone } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Indicators } from '@/features/stocks/api'
import { cn } from '@/lib/utils'

type SortKey = 'code' | 'close' | 'atr' | 'turnover_below_days'
type Sort = { key: SortKey; desc: boolean }

/** 表の列。並べ替えできる列には sortKey を付ける。 */
const COLUMNS: { label: string; title?: string; sortKey?: SortKey; numeric?: boolean }[] = [
  { label: 'コード', sortKey: 'code' },
  { label: '銘柄名' },
  { label: '終値', title: '基準日の調整後終値', sortKey: 'close', numeric: true },
  { label: '10日', title: '日足10日の移動平均', numeric: true },
  { label: '25日', title: '日足25日の移動平均', numeric: true },
  { label: '60日', title: '日足60日の移動平均', numeric: true },
  { label: '13週', title: '週足13週の移動平均', numeric: true },
  { label: '26週', title: '週足26週の移動平均', numeric: true },
  { label: '価格帯', title: '直近の高値〜安値を3等分したときの、現在の位置' },
  { label: 'ATR', title: '1日の値幅の平均（円）', sortKey: 'atr', numeric: true },
  {
    label: '代金不足',
    title: '過去2年で、売買代金が基準以下だった日数',
    sortKey: 'turnover_below_days',
    numeric: true,
  },
]

type Props = {
  candidates: Indicators[]
  selectedCode: string | undefined
  onSelect: (code: string) => void
}

/** 売り建て候補の表。見出しを押すと並べ替え、行を押すと選択する。 */
export function CandidateTable({ candidates, selectedCode, onSelect }: Props) {
  // useState: 画面が覚えておく値。変えると、画面が描き直される。
  const [sort, setSort] = useState<Sort>({ key: 'code', desc: false })

  // useMemo: 並べ替えは、元の一覧か並び順が変わったときだけやり直す。
  const rows = useMemo(() => sortCandidates(candidates, sort), [candidates, sort])

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, desc: !prev.desc } : { key, desc: false }))
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table className="tabular-nums">
        <TableHeader className="bg-muted/60 text-xs">
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead
                key={col.label}
                title={col.title}
                aria-sort={sortState(col.sortKey, sort)}
                className={cn('h-9', col.numeric && 'text-right')}
              >
                {col.sortKey ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.sortKey!)}
                    className="cursor-pointer hover:text-foreground"
                  >
                    {col.label}
                    <span className="ml-1 inline-block w-3 text-muted-foreground">
                      {sort.key === col.sortKey ? (sort.desc ? '▼' : '▲') : ''}
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => {
            const selected = c.code === selectedCode
            return (
              <TableRow
                key={c.code}
                onClick={() => onSelect(c.code)}
                aria-selected={selected}
                data-state={selected ? 'selected' : undefined}
                className="cursor-pointer"
              >
                <TableCell className="font-mono">{formatCode(c.code)}</TableCell>
                <TableCell className="max-w-48 truncate">{c.name ?? '-'}</TableCell>
                <TableCell className="text-right font-medium">{formatPrice(c.close)}</TableCell>
                <TableCell className="text-right">{formatPrice(c.ma10)}</TableCell>
                <TableCell className="text-right">{formatPrice(c.ma25)}</TableCell>
                <TableCell className="text-right">{formatPrice(c.ma60)}</TableCell>
                <TableCell className="text-right">{formatPrice(c.wma13)}</TableCell>
                <TableCell className="text-right">{formatPrice(c.wma26)}</TableCell>
                <TableCell>{formatZone(c.range_zone)}</TableCell>
                <TableCell className="text-right">{formatPrice(c.atr)}</TableCell>
                <TableCell className="text-right">
                  {c.turnover_below_days == null ? '-' : `${c.turnover_below_days}日`}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function sortState(key: SortKey | undefined, sort: Sort) {
  if (!key || key !== sort.key) return undefined
  return sort.desc ? 'descending' : 'ascending'
}

/** 並べ替えた新しい配列を返す（元の配列は変えない）。値がない行は最後に回す。 */
function sortCandidates(candidates: Indicators[], sort: Sort): Indicators[] {
  return [...candidates].sort((a, b) => {
    const x = a[sort.key]
    const y = b[sort.key]
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    const order = typeof x === 'string' ? x.localeCompare(String(y)) : x - Number(y)
    return sort.desc ? -order : order
  })
}
