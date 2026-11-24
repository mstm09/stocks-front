import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Sizing } from './api'

const man = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 })

type Props = {
  /** 基準額を差し替えたあとの前提 */
  sizing: Sizing
  /** 入力欄の文字（万円） */
  capitalText: string
  valid: boolean
  onCapitalChange: (text: string) => void
}

/**
 * 「株数」の列の基準額（万円）の入力欄と、計算の前提の1行。
 * 例: 基準額 [100] 万円 × 3% ＝ 許容損失 3万円 ÷ 2ATR（100株単位で切り捨て）
 */
export function SizingNote({ sizing, capitalText, valid, onCapitalChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Label htmlFor="capital" className="text-muted-foreground">
        株数の基準額
      </Label>
      <Input
        id="capital"
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        value={capitalText}
        onChange={(e) => onCapitalChange(e.target.value)}
        aria-invalid={!valid}
        className="w-24 bg-background text-right"
      />
      <span>万円</span>
      <span className="text-muted-foreground">
        {valid
          ? `× ${sizing.risk_pct}% ＝ 許容損失 ${man.format(sizing.risk_amount / 10_000)}万円 ÷ ${sizing.atr_multiple}ATR（${sizing.lot_size}株単位で切り捨て）`
          : '基準額を入れると、建てられる株数を計算します'}
      </span>
    </div>
  )
}
