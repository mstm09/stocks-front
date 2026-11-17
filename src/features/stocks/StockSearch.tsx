import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Input } from '@/components/ui/input'
import { formatCode } from '@/lib/format'
import { useDebounced } from '@/lib/useDebounced'
import { useStockSearch } from './api'

/** 銘柄コードか銘柄名で探して、銘柄詳細へ移る検索欄。上のメニューに置く。 */
export function StockSearch() {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: results, isFetching } = useStockSearch(useDebounced(text))

  function go(code: string) {
    setText('')
    setOpen(false)
    navigate(`/stocks/${code}`)
  }

  // Enter を押したら、いちばん上の結果へ移る
  function submit(e: FormEvent) {
    e.preventDefault()
    if (results?.[0]) go(results[0].code)
  }

  const showList = open && text.trim() !== ''

  return (
    <form
      role="search"
      onSubmit={submit}
      // 検索欄と結果の外にフォーカスが移ったら、結果を閉じる
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
      className="relative w-64"
    >
      <Input
        type="search"
        aria-label="銘柄を探す"
        placeholder="銘柄コード・銘柄名"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {showList && (
        <div className="absolute top-full z-20 mt-1 w-80 rounded-lg border bg-popover p-1 text-sm shadow-md">
          {results && results.length > 0 ? (
            <ul>
              {results.map((s) => (
                <li key={s.code}>
                  <Link
                    to={`/stocks/${s.code}`}
                    onClick={() => go(s.code)}
                    className="flex items-baseline gap-2 rounded-md px-2 py-1.5 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span className="w-12 shrink-0 font-mono text-muted-foreground">
                      {formatCode(s.code)}
                    </span>
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {s.is_active ? s.market_name : '上場廃止'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-1.5 text-muted-foreground">
              {results && !isFetching ? '見つかりません' : '探しています…'}
            </p>
          )}
        </div>
      )}
    </form>
  )
}
