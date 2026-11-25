import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Props = {
  date: string | null | undefined // 次の決算発表予定日
  fq: string | null | undefined // 決算区分（1Q / 2Q / 3Q / FY）
  days: number | null | undefined // あと何日か（暦日）
  level: string | null | undefined // ALERT（強い注意）/ WARN（注意）/ null
  /** 注意がないとき（まだ先）も、控えめに出すか（詳細画面で使う） */
  showAll?: boolean
  className?: string
}

/**
 * 決算が近いことの印。「決算 11/28（あと3日）」。強い注意は赤、注意は橙。
 * 決算区分と日付は、マウスを乗せると出る。
 */
export function EarningsBadge({ date, fq, days, level, showAll = false, className }: Props) {
  if (!date || days == null) return null
  if (!level && !showAll) return null
  const md = `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
  const text = days === 0 ? `決算 ${md}（今日）` : `決算 ${md}（あと${days}日）`
  const title = `${fq ?? ''}決算の発表予定日 ${date}`
  if (level === 'ALERT') {
    return (
      <Badge title={title} className={cn('bg-red-600 text-white', className)}>
        {text}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      title={title}
      className={cn(
        level === 'WARN'
          ? 'border-amber-500 text-amber-700 dark:text-amber-400'
          : 'font-normal text-muted-foreground',
        className,
      )}
    >
      {level === 'WARN' ? text : `次の${text}`}
    </Badge>
  )
}
