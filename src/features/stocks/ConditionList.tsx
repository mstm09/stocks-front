import { formatPct, formatPrice, formatZone } from '@/lib/format'
import type { Indicators } from './api'

/** 売り建て候補の条件A〜Gの判定と、その根拠の数値。条件の意味は stock-analysis の docs/indicators.md。 */
export function ConditionList({ stock }: { stock: Indicators }) {
  return (
    <div className="space-y-3">
      <ul className="space-y-1.5 text-sm">
        <Condition
          id="A"
          label="日足の並び"
          ok={stock.daily_order_ok}
          criterion="60日 > 25日 > 10日"
          detail={`60日 ${formatPrice(stock.ma60)}・25日 ${formatPrice(stock.ma25)}・10日 ${formatPrice(stock.ma10)}`}
        />
        <Condition id="B" label="日足の向き" ok={stock.daily_down_ok}
          criterion="25日・60日が前日より低い"
        />
        <Condition
          id="C"
          label="週足の並び"
          ok={stock.weekly_order_ok}
          criterion="26週 > 13週"
          detail={`26週 ${formatPrice(stock.wma26)}・13週 ${formatPrice(stock.wma13)}`}
        />
        <Condition id="D" label="週足の向き" ok={stock.weekly_down_ok}
          criterion="13週・26週が前週より低い"
        />
        <Condition
          id="E"
          label="価格帯"
          ok={stock.range_zone == null ? null : stock.range_zone !== 'UPPER'}
          criterion="中段か下段"
          detail={`${formatZone(stock.range_zone)}（${formatPrice(stock.range_low)} 〜 ${formatPrice(stock.range_high)}）`}
        />
        <Condition
          id="F"
          label="売買代金"
          ok={stock.turnover_ok}
          criterion="基準以下が5日以内"
          detail={`基準以下 ${stock.turnover_below_days ?? '-'}日`}
        />
        <Condition id="G" label="Tick回数" ok={stock.tick_ok} criterion="未契約のため判定なし" />
      </ul>
      <p className="text-sm text-muted-foreground">
        ATR（1日の値幅の平均）: {formatPrice(stock.atr)}円（{formatPct(stock.atr_pct)}）
      </p>
    </div>
  )
}

type ConditionProps = {
  id: string
  label: string
  /** true=合格 / false=不合格 / null=判定なし */
  ok: boolean | null | undefined
  /** 合格の条件（満たしていなくても、同じ文を出す） */
  criterion: string
  /** 実際の数値 */
  detail?: string
}

function Condition({ id, label, ok, criterion, detail }: ConditionProps) {
  const mark = ok == null ? '–' : ok ? '○' : '×'
  const result = ok == null ? '判定なし' : ok ? '合格' : '不合格'
  const color = ok == null ? 'text-muted-foreground' : ok ? 'text-emerald-600' : 'text-destructive'
  return (
    <li className="flex items-baseline gap-2">
      <span className={`w-4 text-center font-bold ${color}`} aria-label={result}>
        {mark}
      </span>
      <span className="w-24 shrink-0">
        {id} {label}
      </span>
      <span className="text-muted-foreground">
        {criterion}
        {detail && <span className="mt-0.5 block text-xs tabular-nums">{detail}</span>}
      </span>
    </li>
  )
}
