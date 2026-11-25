// 決算発表予定日の仮のデータ（本物は stock-analysis の earnings.py）。
// 仮のデータの最新日から何日後に決算があるか、で決めておく。

const OFFSETS: Record<string, { days: number; fq: string }> = {
  '86970': { days: 2, fq: '3Q' }, // 強い注意（3日以内）
  '67580': { days: 9, fq: '3Q' }, // 注意（14日以内）
  '68610': { days: 40, fq: '3Q' },
  '99830': { days: 0, fq: 'FY' },
  '72030': { days: 12, fq: '3Q' },
}

/** 基準日から見た、次の決算。仮のデータでは、基準日に関係なく最新日からの日数で決める。 */
export function nextEarnings(code: string, latestDate: string, asOf: string) {
  const o = OFFSETS[code]
  if (!o) return {}
  const date = new Date(`${latestDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + o.days)
  const iso = date.toISOString().slice(0, 10)
  const days = Math.round((date.getTime() - new Date(`${asOf}T00:00:00Z`).getTime()) / 86_400_000)
  if (days < 0) return {}
  return {
    next_earnings_date: iso,
    next_earnings_fq: o.fq,
    earnings_in_days: days,
    earnings_level: days <= 3 ? ('ALERT' as const) : days <= 14 ? ('WARN' as const) : null,
  }
}
