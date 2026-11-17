import { AsOfPicker } from '@/components/AsOfPicker'
import { Empty, ErrorMessage, Loading } from '@/components/Status'
import { useCandidates } from '@/features/candidates/api'
import { CandidateTable } from '@/features/candidates/CandidateTable'
import { StockPanel } from '@/features/stocks/StockPanel'
import { useUrlParams } from '@/lib/useUrlParams'

/** 売り建て候補の一覧。基準日と選んだ銘柄は、URL（?as_of=2026-08-14&code=86970）に持たせる。 */
export function CandidatesPage() {
  const url = useUrlParams()
  const asOf = url.get('as_of')
  const code = url.get('code')

  const { data, isPending, error } = useCandidates(asOf)
  const selected = data?.candidates.find((c) => c.code === code)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="text-xl font-semibold">売り建て候補</h1>
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.as_of_date} 時点・{data.count}銘柄
          </p>
        )}
        <div className="ml-auto">
          <AsOfPicker value={asOf} onChange={(v) => url.set('as_of', v)} />
        </div>
      </div>

      {isPending && <Loading />}
      {error && <ErrorMessage error={error} />}
      {data && data.count === 0 && <Empty>この日の候補はありません。</Empty>}

      {data && data.count > 0 && (
        // 広い画面では、左に表・右にチャートを並べる。狭い画面では縦に積む。
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
          <CandidateTable
            candidates={data.candidates}
            selectedCode={code}
            onSelect={(c) => url.set('code', c)}
          />
          {/*
            右側は、表をスクロールしても画面の上に固定する（sticky）。
            top-16 は、上のメニュー（高さ3rem、これも固定）の下に少し余白をあけた位置。
            中身が画面より高いときは、右側だけでスクロールできるようにする。
          */}
          <div className="xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto">
            {selected ? (
              <StockPanel stock={selected} linkToDetail />
            ) : (
              <Empty>行を選ぶと、チャートと条件の判定を表示します。</Empty>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
