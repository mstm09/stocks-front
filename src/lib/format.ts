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
