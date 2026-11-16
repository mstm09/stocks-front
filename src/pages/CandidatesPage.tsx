import { useSearchParams } from 'react-router'
import { useCandidates } from '@/features/candidates/api'
import { CandidateDetail } from '@/features/candidates/CandidateDetail'
import { CandidateTable } from '@/features/candidates/CandidateTable'

/**
 * 売り建て候補の一覧。
 * 基準日と選んだ銘柄は、URL（?as_of=2026-08-14&code=86970）に持たせる。
 * こうすると、再読み込みしても同じ表示に戻り、URLをメモしておけば後で同じ画面を開ける。
 */
export function CandidatesPage() {
  const [params, setParams] = useSearchParams()
  const asOf = params.get('as_of') ?? undefined
  const code = params.get('code') ?? undefined

  const { data, isPending, error } = useCandidates(asOf)

  function setParam(key: string, value: string | undefined) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  const selected = data?.candidates.find((c) => c.code === code)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="text-xl font-semibold">売り建て候補</h1>
        {data && (
          <p className="text-sm text-slate-600">
            {data.as_of_date} 時点・{data.count}銘柄
          </p>
        )}
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          基準日
          <input
            type="date"
            value={asOf ?? ''}
            onChange={(e) => setParam('as_of', e.target.value || undefined)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
          />
          {asOf && (
            <button
              type="button"
              onClick={() => setParam('as_of', undefined)}
              className="cursor-pointer text-blue-700 underline"
            >
              最新に戻す
            </button>
          )}
        </label>
      </div>

      {isPending && <p className="text-slate-500">読み込み中…</p>}

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error.message}
        </p>
      )}

      {data && data.count === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-slate-600">
          この日の候補はありません。
        </p>
      )}

      {data && data.count > 0 && (
        // 広い画面では、左に表・右にチャートを並べる。狭い画面では縦に積む。
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
          <div className="max-h-[calc(100vh-10rem)] overflow-auto">
            <CandidateTable
              candidates={data.candidates}
              selectedCode={code}
              onSelect={(c) => setParam('code', c)}
            />
          </div>
          {selected ? (
            <CandidateDetail stock={selected} />
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              行を選ぶと、チャートと条件の判定を表示します。
            </p>
          )}
        </div>
      )}
    </div>
  )
}
