/** 入力欄の文字を数値にする。空なら null。 */
export function toNumber(text: string): number | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : Number(trimmed)
}

/** 入力欄の文字を整える。空なら null。 */
export function toText(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/** 数値を、入力欄に入れる文字にする。null は空。 */
export function fromNumber(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}
