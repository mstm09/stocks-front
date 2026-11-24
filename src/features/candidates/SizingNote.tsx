import { Link } from 'react-router'
import { formatYen } from '@/lib/format'
import type { Sizing } from './api'

/**
 * 「株数」の列の計算の前提を、表の上に小さく出す。
 * 例: 口座全体 1,000,000円 × 3% = 許容損失 30,000円 ÷ 2ATR（100株単位）
 */
export function SizingNote({ sizing }: { sizing: Sizing }) {
  if (sizing.equity <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        口座全体が0円のため、建てられる株数はすべて0株です。
        <Link to="/portfolio" className="underline">
          入出金を登録
        </Link>
        すると計算します。
      </p>
    )
  }
  return (
    <p className="text-sm text-muted-foreground">
      株数 ＝ 口座全体 {formatYen(sizing.equity)}円 × {sizing.risk_pct}% ＝ 許容損失{' '}
      {formatYen(sizing.risk_amount)}円 ÷ {sizing.atr_multiple}ATR（{sizing.lot_size}
      株単位で切り捨て。{sizing.equity_date} 時点）
    </p>
  )
}
