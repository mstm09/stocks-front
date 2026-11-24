import { useNavigate } from 'react-router'
import { Empty, ErrorMessage, Loading } from '@/components/Status'
import { Button } from '@/components/ui/button'
import { OrderSection } from '@/features/orders/OrderSection'
import { type TradeStatus, useTrades } from '@/features/trades/api'
import { AddTradeDialog } from '@/features/trades/TradeDialogs'
import { TradeTable } from '@/features/trades/TradeTable'
import { useUrlParams } from '@/lib/useUrlParams'

const FILTERS: { value: TradeStatus | undefined; label: string }[] = [
  { value: undefined, label: '全部' },
  { value: 'OPEN', label: '保有中' },
  { value: 'CLOSED', label: '決済済み' },
]

/**
 * 売買記録の一覧（/trades?status=OPEN）。上に、注文（指値で仕掛け中）の一覧を出す。
 * `?new=86970` を付けて開くと、その銘柄コードを入れた登録フォームが開く（銘柄詳細から来るとき）。
 */
export function TradesPage() {
  const url = useUrlParams()
  const navigate = useNavigate()
  const status = FILTERS.find((f) => f.value === url.get('status'))?.value
  const newCode = url.get('new') // undefined なら、登録フォームは閉じている

  const { data: trades, isPending, error } = useTrades(status)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold">売買記録</h1>
        <Button className="ml-auto" onClick={() => url.set('new', '-')}>
          売買を登録
        </Button>
      </div>

      <OrderSection />

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">売買</h2>
        <div role="group" aria-label="状態で絞る" className="flex gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.label}
              size="sm"
              variant={f.value === status ? 'default' : 'outline'}
              aria-pressed={f.value === status}
              onClick={() => url.set('status', f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>
      {isPending && <Loading />}
      {error && <ErrorMessage error={error} />}
      {trades &&
        (trades.length > 0 ? (
          <TradeTable trades={trades} />
        ) : (
          <Empty>売買の記録がありません。「売買を登録」から始めます。</Empty>
        ))}

      {newCode !== undefined && (
        <AddTradeDialog
          defaultCode={newCode === '-' ? '' : newCode}
          onClose={() => url.set('new', undefined)}
          onAdded={(trade) => navigate(`/trades/${trade.id}`)}
        />
      )}
    </div>
  )
}
