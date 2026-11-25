import { useNavigate } from 'react-router'
import { Empty, ErrorMessage, Loading } from '@/components/Status'
import { Button } from '@/components/ui/button'
import { OrderSection } from '@/features/orders/OrderSection'
import { type Trade, type TradeStatus, useTrades } from '@/features/trades/api'
import { AddTradeDialog } from '@/features/trades/TradeDialogs'
import { TradeTable } from '@/features/trades/TradeTable'
import { changeColor, formatPnl } from '@/lib/format'
import { useUrlParams } from '@/lib/useUrlParams'
import { cn } from '@/lib/utils'

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
      {trades && <OpenTotal trades={trades} />}
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

/**
 * 保有中の損益の合計（含み損益 ＋ 一部決済の確定損益）。保有中の売買がなければ出さない。
 * 終値がなく損益を出せない売買は、合計に入れずに件数を出す。
 */
function OpenTotal({ trades }: { trades: Trade[] }) {
  const open = trades.filter((t) => t.status === 'OPEN')
  if (open.length === 0) return null
  const priced = open.filter((t) => t.current_pnl != null)
  const total = priced.reduce((sum, t) => sum + (t.current_pnl ?? 0), 0)
  return (
    <div
      role="status"
      aria-label="保有中の損益の合計"
      className="flex flex-wrap items-baseline gap-x-3 rounded-lg border bg-card px-4 py-3"
    >
      <span className="text-sm text-muted-foreground">保有中の損益の合計（{open.length}件）</span>
      <span className={cn('text-2xl font-semibold tabular-nums', changeColor(total))}>
        {formatPnl(total)}
        <span className="ml-1 text-xs font-normal text-muted-foreground">円</span>
      </span>
      {priced.length < open.length && (
        <span className="text-xs text-destructive">
          終値がない {open.length - priced.length}件は、合計に入っていません
        </span>
      )}
    </div>
  )
}
