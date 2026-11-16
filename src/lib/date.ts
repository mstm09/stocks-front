/** 今日の日付（端末の時刻で、YYYY-MM-DD）。日付の入力欄の初期値に使う。 */
export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
