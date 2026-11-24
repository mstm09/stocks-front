import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { formatCode, formatPrice } from '@/lib/format'
import type { Indicators } from './api'
import { ConditionList } from './ConditionList'
import { StockChart } from './StockChart'

type Props = {
  stock: Indicators
  /** 銘柄名を、銘柄詳細へのリンクにするか（候補一覧では true） */
  linkToDetail?: boolean
}

/** 1銘柄のまとめ（銘柄名、終値、チャート、条件の判定）。候補一覧と銘柄詳細で使う。 */
export function StockPanel({ stock, linkToDetail = false }: Props) {
  const name = stock.name ?? '（銘柄名なし）'
  return (
    <section aria-label="選択した銘柄" className="space-y-4 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-muted-foreground">{formatCode(stock.code)}</span>
        <h2 className="text-lg font-semibold">
          {linkToDetail ? (
            <Link
              to={`/stocks/${stock.code}?as_of=${stock.as_of_date}`}
              className="underline-offset-4 hover:underline"
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </h2>
        {(stock.sector33 || stock.market_name) && (
          <span className="text-sm text-muted-foreground">
            {[stock.sector33, stock.market_name].filter(Boolean).join('・')}
          </span>
        )}
        <Badge variant={stock.is_short_candidate ? 'default' : 'secondary'}>
          {stock.is_short_candidate ? '売り建て候補' : '候補ではない'}
        </Badge>
        <span className="ml-auto text-lg font-semibold tabular-nums">
          {formatPrice(stock.close)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">円</span>
        </span>
      </header>
      <StockChart stock={stock} />
      <ConditionList stock={stock} />
    </section>
  )
}
