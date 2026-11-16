import { useEffect, useState } from 'react'

/**
 * 値の変化が落ち着くのを待ってから返す。
 * 検索欄で1文字打つたびにAPIを呼ばないようにするために使う。
 */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer) // 待っている間に次の値が来たら、前の待ちをやめる
  }, [value, delayMs])
  return debounced
}
