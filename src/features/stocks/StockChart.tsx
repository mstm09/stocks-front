import { type Indicators, useChartImage } from './api'

/** ローソク足チャート（日足・移動平均線つき）。画像はバックエンドが作る。 */
export function StockChart({ stock }: { stock: Indicators }) {
  const chart = useChartImage(stock.code, stock.as_of_date)

  return (
    // 画像の縦横比（10:6）を先に確保して、読み込み前後で画面がずれないようにする
    <div className="flex aspect-[10/6] items-center justify-center overflow-hidden rounded-md bg-muted/40">
      {chart.url ? (
        <img
          src={chart.url}
          alt={`${stock.name ?? stock.code} のローソク足チャート`}
          className="size-full object-contain"
        />
      ) : chart.error ? (
        <p className="text-sm text-destructive">{chart.error.message}</p>
      ) : (
        <p className="text-sm text-muted-foreground">チャートを読み込み中…</p>
      )}
    </div>
  )
}
