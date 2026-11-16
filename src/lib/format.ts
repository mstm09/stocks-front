// 数値や銘柄コードを、画面に出す文字に直す関数。

const yen = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 })

/** 価格。1,215 や 1,249.5 のように出す。値がなければ「-」。 */
export function formatPrice(value: number | null | undefined): string {
  return value == null ? '-' : yen.format(value)
}

/** 割合（%）。2.0% のように出す。 */
export function formatPct(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toFixed(1)}%`
}

/** 銘柄コード。APIは5桁（86970）で返すので、よく見る4桁（8697）にする。 */
export function formatCode(code: string): string {
  return code.length === 5 && code.endsWith('0') ? code.slice(0, 4) : code
}

const ZONE_LABELS: Record<string, string> = { UPPER: '上段', MIDDLE: '中段', LOWER: '下段' }

/** 価格帯。UPPER / MIDDLE / LOWER を、上段 / 中段 / 下段にする。 */
export function formatZone(zone: string | null | undefined): string {
  return zone == null ? '-' : (ZONE_LABELS[zone] ?? zone)
}

/** 騰落率（%）。+1.25% / -0.80% のように、符号を付けて出す。 */
export function formatChange(value: number | null | undefined): string {
  if (value == null) return '-'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

/** 値上がりは赤、値下がりは青（日本の株価の色）。0や値なしは色なし。 */
export function changeColor(value: number | null | undefined): string {
  if (value == null || value === 0) return ''
  return value > 0 ? 'text-up' : 'text-down'
}

const integer = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 })

/** 金額（円）。3,000,000 のように、小数なしで出す。 */
export function formatYen(value: number | null | undefined): string {
  return value == null ? '-' : integer.format(value)
}

/** 損益（円）。+27,200 / -5,000 のように、符号を付けて出す。 */
export function formatPnl(value: number | null | undefined): string {
  if (value == null) return '-'
  return `${value > 0 ? '+' : ''}${integer.format(value)}`
}

/** 想定損失の何倍か。+2.00R なら、取ったリスクの2倍の利益。-1.00R なら、計画どおりのロスカット。 */
export function formatR(value: number | null | undefined): string {
  return value == null ? '-' : `${value > 0 ? '+' : ''}${value.toFixed(2)}R`
}
