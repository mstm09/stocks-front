import { Badge } from '@/components/ui/badge'
import type { Trade } from './api'

const LABELS: Record<string, string> = {
  HIT: '越えている',
  NEAR: '近すぎ',
  IN: '範囲内',
  FAR: '遠すぎ',
}

/**
 * 今のロスカットが範囲のどこにあるかの印。
 * - 越えている（終値がロスカットを越えた）は、いつも赤で出す
 * - 近すぎ・遠すぎは、利益を確保できていない（ロスカットで決済されると損）ときだけ出す
 *   （トレイリングで利益側に置いたロスカットは、範囲から外れていてもかまわない）
 * - 範囲内は、`showInRange` のときだけ出す
 */
export function StopPositionBadge({ trade, showInRange = false }: { trade: Trade; showInRange?: boolean }) {
  const pos = trade.stop_position
  if (pos == null) return null
  if (pos === 'HIT') return <Badge variant="destructive">{LABELS.HIT}</Badge>
  const protectedProfit = trade.stop_pnl != null && trade.stop_pnl >= 0
  if (pos === 'IN') return showInRange ? <Badge variant="secondary">{LABELS.IN}</Badge> : null
  if (protectedProfit && !showInRange) return null
  return (
    <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
      {LABELS[pos]}
    </Badge>
  )
}
