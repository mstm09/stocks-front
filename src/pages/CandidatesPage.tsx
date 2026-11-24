import { useState } from 'react'
import { Link } from 'react-router'
import { AsOfPicker } from '@/components/AsOfPicker'
import { Empty, ErrorMessage, Loading } from '@/components/Status'
import { useCandidates } from '@/features/candidates/api'
import { CandidateTable } from '@/features/candidates/CandidateTable'
import { SizingNote } from '@/features/candidates/SizingNote'
import { useCapital } from '@/features/candidates/useCapital'
import type { Order } from '@/features/orders/api'
import { OrderDialog } from '@/features/orders/OrderDialog'
import type { Indicators } from '@/features/stocks/api'
import { StockPanel } from '@/features/stocks/StockPanel'
import { formatCode, formatPrice } from '@/lib/format'
import { maxShares, withCapital } from '@/lib/sizing'
import { useUrlParams } from '@/lib/useUrlParams'

/** 売り建て候補の一覧。基準日と選んだ銘柄は、URL（?as_of=2026-08-14&code=86970）に持たせる。 */
export function CandidatesPage() {
  const url = useUrlParams()
  const asOf = url.get('as_of')
  const code = url.get('code')

  const { data, isPending, error } = useCandidates(asOf)
  // 建てられる株数は、画面の基準額（万円）で計算し直す（入力すると、すぐ変わる）
  const capital = useCapital()
  const sizing = data && withCapital(data.sizing, capital.yen)
  const candidates = (data?.candidates ?? []).map((c) => ({
    ...c,
    max_shares: sizing
      ? maxShares(sizing.risk_amount, c.atr == null ? null : c.atr * sizing.atr_multiple, sizing.lot_size)
      : c.max_shares,
  }))
  const selected = candidates.find((c) => c.code === code)
  // 注文ダイアログを開いている銘柄と、登録した注文（「登録しました」を出すため）
  const [ordering, setOrdering] = useState<Indicators | null>(null)
  const [added, setAdded] = useState<Order | null>(null)

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

      {sizing && (
        <SizingNote
          sizing={sizing}
          capitalText={capital.text}
          valid={capital.valid}
          onCapitalChange={capital.change}
        />
      )}
      {added && (
        <p role="status" className="rounded-md border bg-card px-3 py-2 text-sm">
          注文 #{added.id}（{formatCode(added.code)} {added.name} {added.quantity}株 ×{' '}
          {formatPrice(added.order_price)}円）を登録しました。
          <Link to="/trades" className="ml-2 underline">
            売買記録で見る
          </Link>
        </p>
      )}

      {isPending && <Loading />}
      {error && <ErrorMessage error={error} />}
      {data && data.count === 0 && <Empty>この日の候補はありません。</Empty>}

      {data && data.count > 0 && (
        // 広い画面では、左に表・右にチャートを並べる。狭い画面では縦に積む。
        // 表は列が収まる幅（56rem）、チャートは少なくとも 32rem を確保し、残りは半分ずつ分ける。
        // 画面が広いほどチャートが大きくなる。
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(56rem,1fr)_minmax(32rem,1fr)]">
          <CandidateTable
            candidates={candidates}
            selectedCode={code}
            onSelect={(c) => url.set('code', c)}
            onOrder={(stock) => {
              setAdded(null)
              setOrdering(stock)
            }}
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

      {ordering && sizing && (
        <OrderDialog
          stock={ordering}
          sizing={sizing}
          asOf={asOf}
          onClose={() => setOrdering(null)}
          onAdded={(order) => {
            setOrdering(null)
            setAdded(order)
          }}
        />
      )}
    </div>
  )
}
