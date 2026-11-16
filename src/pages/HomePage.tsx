import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

/** ホーム。APIにつながっているかを確かめる（GET /health）。 */
export function HomePage() {
  // useQuery: 「何を取るか（queryKey）」と「どう取るか（queryFn）」を渡すと、
  // 読み込み中（isPending）、失敗（isError）、取れた値（data）を返してくれる。
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => unwrap(await api.GET('/health')),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ホーム</h1>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-500">APIとの接続</h2>
        <p className="mt-2">
          {health.isPending && <span className="text-slate-500">確認中…</span>}
          {health.isError && (
            <span className="text-red-700">
              つながりません。stock-analysis で <code>uv run stock-analysis serve</code>{' '}
              を実行してください。
            </span>
          )}
          {health.isSuccess && (
            <span className="text-emerald-700">つながっています（{health.data.status}）</span>
          )}
        </p>
      </section>
    </div>
  )
}
