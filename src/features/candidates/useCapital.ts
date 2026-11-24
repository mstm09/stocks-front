import { useState } from 'react'
import { useUrlParams } from '@/lib/useUrlParams'

const STORAGE_KEY = 'stocks-front.capital'
export const DEFAULT_CAPITAL_MAN = 100 // 万円

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // ブラウザの設定で使えないときもある
  }
}

function store(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // 覚えられなくても、表示には困らない
  }
}

/**
 * 建てられる株数の「基準額」（万円）。入力欄の文字と、計算に使う円の値を返す。
 *
 * - 最初の値は、URL（?capital=100）→ 前に入れた値（ブラウザに覚えたもの）→ 100万円 の順。
 * - 正しい値（0より大きい数）を入れたときだけ、URLとブラウザに覚える。
 *   入力の途中（空など）は、許容損失0円として計算する。
 */
export function useCapital() {
  const url = useUrlParams()
  const [text, setText] = useState(
    () => url.get('capital') ?? readStored() ?? String(DEFAULT_CAPITAL_MAN),
  )
  const man = Number(text)
  const valid = text.trim() !== '' && Number.isFinite(man) && man > 0

  function change(next: string) {
    setText(next)
    const n = Number(next)
    if (next.trim() !== '' && Number.isFinite(n) && n > 0) {
      url.set('capital', next.trim())
      store(next.trim())
    }
  }

  return { text, change, valid, yen: valid ? man * 10_000 : 0 }
}
