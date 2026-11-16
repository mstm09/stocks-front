import { formatCode, formatPct, formatPrice, formatZone } from '@/lib/format'
import { type Indicators, useChartImage } from './api'

/** 選んだ銘柄のチャートと、条件ごとの判定。 */
export function CandidateDetail({ stock }: { stock: Indicators }) {
  const chart = useChartImage(stock.code, stock.as_of_date)

  return (
    <section
      aria-label="選択した銘柄"
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
    >
      <header className="flex items-baseline gap-3">
        <span className="font-mono text-slate-500">{formatCode(stock.code)}</span>
        <h2 className="text-lg font-semibold">{stock.name ?? '-'}</h2>
        <span className="ml-auto text-lg font-semibold tabular-nums">
          {formatPrice(stock.close)}
          <span className="ml-1 text-xs font-normal text-slate-500">円</span>
        </span>
      </header>

      {/* 画像の縦横比（10:6）を先に確保して、読み込み前後で画面がずれないようにする */}
      <div className="flex aspect-[10/6] items-center justify-center rounded bg-slate-50">
        {chart.url ? (
          <img src={chart.url} alt={`${stock.name ?? stock.code} のローソク足チャート`} />
        ) : chart.error ? (
          <p className="text-sm text-red-700">{chart.error.message}</p>
        ) : (
          <p className="text-sm text-slate-500">チャートを読み込み中…</p>
        )}
      </div>

      <ul className="space-y-1.5 text-sm">
        <Condition
          id="A"
          label="日足の並び"
          ok={stock.daily_order_ok}
          detail={`60日 ${formatPrice(stock.ma60)} > 25日 ${formatPrice(stock.ma25)} > 10日 ${formatPrice(stock.ma10)}`}
        />
        <Condition id="B" label="日足の向き" ok={stock.daily_down_ok} detail="下向き" />
        <Condition
          id="C"
          label="週足の並び"
          ok={stock.weekly_order_ok}
          detail={`26週 ${formatPrice(stock.wma26)} > 13週 ${formatPrice(stock.wma13)}`}
        />
        <Condition id="D" label="週足の向き" ok={stock.weekly_down_ok} detail="下向き" />
        <Condition
          id="E"
          label="価格帯"
          ok={stock.range_zone == null ? null : stock.range_zone !== 'UPPER'}
          detail={`${formatZone(stock.range_zone)}（${formatPrice(stock.range_low)} 〜 ${formatPrice(stock.range_high)}）`}
        />
        <Condition
          id="F"
          label="売買代金"
          ok={stock.turnover_ok}
          detail={`基準以下 ${stock.turnover_below_days ?? '-'}日`}
        />
        <Condition id="G" label="Tick回数" ok={stock.tick_ok} detail="未契約のため判定なし" />
      </ul>

      <p className="text-sm text-slate-600">
        ATR（1日の値幅の平均）: {formatPrice(stock.atr)}円（{formatPct(stock.atr_pct)}）
      </p>
    </section>
  )
}

type ConditionProps = {
  id: string
  label: string
  /** true=合格 / false=不合格 / null=判定なし */
  ok: boolean | null | undefined
  detail: string
}

function Condition({ id, label, ok, detail }: ConditionProps) {
  const mark = ok == null ? '–' : ok ? '○' : '×'
  const result = ok == null ? '判定なし' : ok ? '合格' : '不合格'
  const color = ok == null ? 'text-slate-400' : ok ? 'text-emerald-600' : 'text-red-600'
  return (
    <li className="flex items-baseline gap-2">
      <span className={`w-4 text-center font-bold ${color}`} aria-label={result}>
        {mark}
      </span>
      <span className="w-24 shrink-0 text-slate-700">
        {id} {label}
      </span>
      <span className="text-slate-500 tabular-nums">{ok == null && id !== 'G' ? '-' : detail}</span>
    </li>
  )
}
