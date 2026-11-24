import { maxShares } from './sizing'

test('口座の3%ルールで、100株単位に切り捨てる', () => {
  expect(maxShares(30_000, 200, 100)).toBe(100) // ATR 100円 → 2ATR 200円 → 150株 → 100株
  expect(maxShares(30_000, 60, 100)).toBe(500) // ATR 30円 → 2ATR 60円 → ちょうど500株
  expect(maxShares(30_000, 400, 100)).toBe(0) // 75株 → 建てられない
  expect(maxShares(30_000, 0.1, 100)).toBe(300_000) // 小数の誤差で減らない
})

test('分からないときは null、口座が0円なら0', () => {
  expect(maxShares(30_000, null, 100)).toBeNull()
  expect(maxShares(30_000, 0, 100)).toBeNull()
  expect(maxShares(0, 60, 100)).toBe(0)
})
