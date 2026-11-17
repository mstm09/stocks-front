import {
  changeColor,
  formatChange,
  formatCode,
  formatPct,
  formatPnl,
  formatPrice,
  formatYen,
  formatZone,
} from './format'

test('価格は桁区切りで出す', () => {
  expect(formatPrice(1215)).toBe('1,215')
  expect(formatPrice(1249.5)).toBe('1,249.5')
  expect(formatPrice(null)).toBe('-')
})

test('割合は小数1桁で出す', () => {
  expect(formatPct(2)).toBe('2.0%')
  expect(formatPct(undefined)).toBe('-')
})

test('銘柄コードは、末尾が0の5桁なら4桁にする', () => {
  expect(formatCode('86970')).toBe('8697')
  expect(formatCode('130A0')).toBe('130A')
  expect(formatCode('86975')).toBe('86975')
})

test('価格帯は日本語にする', () => {
  expect(formatZone('LOWER')).toBe('下段')
  expect(formatZone(null)).toBe('-')
})

test('騰落率と損益は、符号を付けて出す', () => {
  expect(formatChange(1.254)).toBe('+1.25%')
  expect(formatChange(-0.8)).toBe('-0.80%')
  expect(formatChange(0)).toBe('0.00%')
  expect(formatPnl(27200)).toBe('+27,200')
  expect(formatPnl(-5000.4)).toBe('-5,000')
  expect(formatYen(3000000)).toBe('3,000,000')
})

test('値上がりは赤、値下がりは青', () => {
  expect(changeColor(1)).toBe('text-up')
  expect(changeColor(-1)).toBe('text-down')
  expect(changeColor(0)).toBe('')
})
