import { formatPrice } from '@/lib/format'
import type { Trade } from './api'

/** ロスカットの範囲の文。例「2,100〜2,200円」。範囲がなければ null。 */
export function stopRangeText(trade: Trade): string | null {
  if (trade.stop_range_low == null || trade.stop_range_high == null) return null
  return `${formatPrice(trade.stop_range_low)}〜${formatPrice(trade.stop_range_high)}円`
}

/** 範囲の基準（いつの終値とATRか）。例「11/24 の終値 2,000円・ATR 100円」。 */
export function stopRangeBasis(trade: Trade): string {
  return `${trade.current_price_date} の終値 ${formatPrice(trade.current_price)}円・ATR ${formatPrice(trade.latest_atr)}円`
}
