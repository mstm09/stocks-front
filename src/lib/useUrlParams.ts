import { useSearchParams } from 'react-router'

/**
 * URLの `?as_of=2026-08-14&code=86970` の部分を、読み書きする。
 *
 * 画面の状態（基準日、選んだ銘柄、期間など）をURLに持たせると、
 * 再読み込みしても同じ表示に戻り、URLをメモしておけば後で同じ画面を開ける。
 */
export function useUrlParams() {
  const [params, setParams] = useSearchParams()

  /** 値を読む。なければ undefined。 */
  function get(key: string): string | undefined {
    return params.get(key) ?? undefined
  }

  /** 値を書く。undefined や空文字を渡すと、その項目を消す。 */
  function set(key: string, value: string | undefined) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  return { get, set }
}
