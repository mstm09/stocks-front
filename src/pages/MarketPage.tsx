import { AsOfPicker } from '@/components/AsOfPicker'
import { NativeSelect } from '@/components/NativeSelect'
import { Empty, ErrorMessage, Loading } from '@/components/Status'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  type MarketFilter,
  type Period,
  useBreadth,
  useMarkets,
  useSectorRanking,
} from '@/features/market/api'
import { BreadthTable } from '@/features/market/BreadthTable'
import { SectorTable } from '@/features/market/SectorTable'
import { useUrlParams } from '@/lib/useUrlParams'

const PERIODS: { value: Period; label: string; compare: string }[] = [
  { value: 'day', label: '日', compare: '前日比' },
  { value: 'week', label: '週', compare: '前週末比' },
  { value: 'month', label: '月', compare: '前月末比' },
]

/** 騰落の表に出す期間の数 */
const BREADTH_COUNT = 10

/**
 * 市場全体の動き（/market?period=week&market=プライム&as_of=2026-08-14）。
 * 騰落（値上がり・値下がりの銘柄数）と、33業種の上昇率ランキングを出す。
 */
export function MarketPage() {
  const url = useUrlParams()
  const period = PERIODS.find((p) => p.value === url.get('period')) ?? PERIODS[0]
  const filter: MarketFilter = {
    period: period.value,
    asOf: url.get('as_of'),
    market: url.get('market'),
  }

  const markets = useMarkets()
  const breadth = useBreadth(filter, BREADTH_COUNT)
  const sectors = useSectorRanking(filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="text-xl font-semibold">市場</h1>
        {breadth.data && (
          <p className="text-sm text-muted-foreground">
            {breadth.data.as_of_date} 時点・{period.compare}・{filter.market ?? '全銘柄'}
          </p>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-4">
          <div role="group" aria-label="期間" className="flex gap-1">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={p.value === period.value ? 'default' : 'outline'}
                aria-pressed={p.value === period.value}
                onClick={() => url.set('period', p.value === 'day' ? undefined : p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="market" className="text-muted-foreground">
              市場区分
            </Label>
            <NativeSelect
              id="market"
              value={filter.market ?? ''}
              onChange={(e) => url.set('market', e.target.value || undefined)}
            >
              <option value="">全銘柄</option>
              {/* URLで指定した市場区分が一覧にまだ（または もう）なくても、選択肢に出す */}
              {[...new Set([...(markets.data ?? []), ...(filter.market ? [filter.market] : [])])].map(
                (name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ),
              )}
            </NativeSelect>
          </div>
          <AsOfPicker value={filter.asOf} onChange={(v) => url.set('as_of', v)} />
        </div>
      </div>

      <section aria-labelledby="breadth-heading" className="space-y-2">
        <h2 id="breadth-heading" className="font-semibold">
          騰落
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            値上がり・値下がりの銘柄数（{period.compare}）
          </span>
        </h2>
        {breadth.isPending && <Loading />}
        {breadth.error && <ErrorMessage error={breadth.error} />}
        {breadth.data &&
          (breadth.data.items.length > 0 ? (
            <BreadthTable items={breadth.data.items} />
          ) : (
            <Empty>この条件に合う日足がありません。</Empty>
          ))}
      </section>

      <section aria-labelledby="sectors-heading" className="space-y-2">
        <h2 id="sectors-heading" className="font-semibold">
          33業種の上昇率ランキング
          {sectors.data?.base_date && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {sectors.data.base_date} → {sectors.data.end_date}
            </span>
          )}
        </h2>
        {sectors.isPending && <Loading />}
        {sectors.error && <ErrorMessage error={sectors.error} />}
        {sectors.data &&
          (sectors.data.sectors.length > 0 ? (
            <>
              <SectorTable sectors={sectors.data.sectors} />
              <p className="text-xs text-muted-foreground">
                上昇率は所属銘柄の単純平均で、東証の業種別株価指数（時価総額で重み付け）とは一致しません。
              </p>
            </>
          ) : (
            <Empty>この条件に合う日足がありません。</Empty>
          ))}
      </section>
    </div>
  )
}
