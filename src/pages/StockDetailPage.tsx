import { Link, useParams } from 'react-router'
import { AsOfPicker } from '@/components/AsOfPicker'
import { ErrorMessage, Loading } from '@/components/Status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useIndicators } from '@/features/stocks/api'
import { ConditionList } from '@/features/stocks/ConditionList'
import { StockChart } from '@/features/stocks/StockChart'
import { formatCode, formatPrice } from '@/lib/format'
import { useUrlParams } from '@/lib/useUrlParams'

/** 1銘柄の詳細（/stocks/86970?as_of=2026-08-14）。売り建て候補でない銘柄も見られる。 */
export function StockDetailPage() {
  // useParams: URLの `/stocks/:code` の `:code` の部分を取る
  const { code = '' } = useParams()
  const url = useUrlParams()
  const asOf = url.get('as_of')

  const { data: stock, isPending, error } = useIndicators(code, asOf)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <h1 className="flex items-baseline gap-3 text-xl font-semibold">
          <span className="font-mono text-base font-normal text-muted-foreground">
            {formatCode(code)}
          </span>
          {stock ? (stock.name ?? '（銘柄名なし）') : '銘柄詳細'}
        </h1>
        {stock && (
          <>
            <Badge variant={stock.is_short_candidate ? 'default' : 'secondary'}>
              {stock.is_short_candidate ? '売り建て候補' : '候補ではない'}
            </Badge>
            <p className="text-sm text-muted-foreground">{stock.as_of_date} 時点</p>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-4">
          <AsOfPicker value={asOf} onChange={(v) => url.set('as_of', v)} />
          {/* asChild: Button の見た目を、中の Link（画面を移るリンク）に付ける */}
          <Button asChild variant="outline">
            <Link to={`/trades?new=${code}`}>この銘柄の売買を登録</Link>
          </Button>
        </div>
      </div>

      {isPending && <Loading />}
      {error && <ErrorMessage error={error} />}

      {stock && (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-label="チャート" className="rounded-lg border bg-card p-4">
            <StockChart stock={stock} />
          </section>
          <section aria-label="指標" className="space-y-4 rounded-lg border bg-card p-4">
            <p className="text-2xl font-semibold tabular-nums">
              {formatPrice(stock.close)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                円（調整後の終値）
              </span>
            </p>
            <ConditionList stock={stock} />
          </section>
        </div>
      )}
    </div>
  )
}
