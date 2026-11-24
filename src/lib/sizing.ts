// 建てられる株数（1回の損失を、口座全体の決めた%までにする）。
// 計算の決まりは stock-analysis の docs/orders.md §3（risk/sizing.py）と同じ。

/**
 * 許容損失に収まる株数を、単元株数（100株）単位で切り捨てて返す。
 * 1株あたりの損失が分からない（null や 0 以下）ときは null。許容損失が0以下なら0。
 *
 * 例: 許容損失 30,000円・1株あたり 200円（2ATR） → 150株 → 100株
 */
export function maxShares(
  riskAmount: number,
  lossPerShare: number | null | undefined,
  lotSize: number,
): number | null {
  if (lossPerShare == null || lossPerShare <= 0) return null
  if (riskAmount <= 0) return 0
  // 30000 ÷ 0.1 が 299999.99… になるような、小数の誤差で1単元減らないよう、少しだけ足す
  const shares = Math.floor(riskAmount / lossPerShare + 1e-9)
  return Math.floor(shares / lotSize) * lotSize
}
