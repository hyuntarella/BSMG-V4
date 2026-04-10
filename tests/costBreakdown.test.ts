import { describe, it, expect } from 'vitest'
import {
  getCostBreakdown,
  getAdjustedCost,
  getMarginDisplay,
  findPriceForMargin,
  pricePerM2ToPyeong,
} from '../lib/estimate/costBreakdown'
import { LABOR_COST_PER_PUM } from '../lib/estimate/constants'

describe('getCostBreakdown', () => {
  const c30 = getCostBreakdown(30)

  it('30평 하도 = 80000', () => expect(c30.hado).toBe(80000))
  it('30평 중도 = 500000', () => expect(c30.jungdo15).toBe(500000))
  it('30평 상도 = 120000', () => expect(c30.sangdo).toBe(120000))
  it('30평 시트 = 620000', () => expect(c30.sheet).toBe(620000))
  it('30평 경비 = 350000', () => expect(c30.misc).toBe(350000))
  it('30평 품수 = 6', () => expect(c30.pum).toBe(6))
  it('30평 인건비 = 6×220000', () => expect(c30.labor).toBe(6 * LABOR_COST_PER_PUM))

  it('30평 재료비소계', () => {
    const materialTotal = 80000 + 500000 + 120000 + 620000
    expect(c30.materialTotal).toBe(materialTotal)
  })

  it('30평 총원가', () => {
    const materialTotal = 80000 + 500000 + 120000 + 620000
    expect(c30.total).toBe(materialTotal + c30.labor + 350000)
  })

  it('50평 하도 = 170000', () => expect(getCostBreakdown(50).hado).toBe(170000))
  it('50평 품수 = 7', () => expect(getCostBreakdown(50).pum).toBe(7))
  it('100평 하도 = 320000', () => expect(getCostBreakdown(100).hado).toBe(320000))
  it('100평 중도 = 1500000', () => expect(getCostBreakdown(100).jungdo15).toBe(1500000))

  it('40평 하도 보간 = 125000', () => expect(getCostBreakdown(40).hado).toBe(125000))
  it('40평 중도 보간 = 650000', () => expect(getCostBreakdown(40).jungdo15).toBe(650000))

  it('20평 → 30평 값', () => expect(getCostBreakdown(20).hado).toBe(80000))
  it('150평 → 100평 값', () => expect(getCostBreakdown(150).hado).toBe(320000))
})

describe('getAdjustedCost', () => {
  const c30 = getCostBreakdown(30)
  const adj30 = getAdjustedCost(30)

  it('30평 인상후 하도 = 96000', () => expect(adj30.hado).toBe(Math.round(80000 * 1.2)))
  it('30평 인상후 중도 = 600000', () => expect(adj30.jungdo15).toBe(Math.round(500000 * 1.2)))
  it('인건비 변화 없음', () => expect(adj30.labor).toBe(c30.labor))
  it('경비 변화 없음', () => expect(adj30.misc).toBe(c30.misc))
  it('총원가 증가', () => expect(adj30.total).toBeGreaterThan(c30.total))
})

describe('getMarginDisplay', () => {
  const margin = getMarginDisplay(50000, 50)

  it('마진 포맷 정상', () => expect(margin.formatted).toMatch(/\d+% \(인상 전 \d+%\)/))
  it('인상전 마진 ≥ 현 마진', () => expect(margin.beforeIncrease).toBeGreaterThanOrEqual(margin.current))
})

describe('findPriceForMargin', () => {
  it('마진50% 평단가 > 0', () => expect(findPriceForMargin(50, 50)).toBeGreaterThan(0))
  it('1000원 단위', () => expect(findPriceForMargin(50, 50) % 1000).toBe(0))

  it('역산 후 마진 ≥ 50%', () => {
    const price50 = findPriceForMargin(50, 50)
    const verify50 = getMarginDisplay(price50, 50)
    expect(verify50.current).toBeGreaterThanOrEqual(50)
  })

  it('마진30% 평단가 > 0', () => expect(findPriceForMargin(30, 100)).toBeGreaterThan(0))

  it('역산 후 마진 ≥ 30%', () => {
    const price30 = findPriceForMargin(30, 100)
    const verify30 = getMarginDisplay(price30, 100)
    expect(verify30.current).toBeGreaterThanOrEqual(30)
  })

  it('마진100% → 0', () => expect(findPriceForMargin(100, 50)).toBe(0))
})

describe('pricePerM2ToPyeong', () => {
  it('㎡→평 단가 > 0', () => expect(pricePerM2ToPyeong(30000, 165.3)).toBeGreaterThan(0))

  it('계산 정확', () => {
    const ppyeong = pricePerM2ToPyeong(30000, 165.3)
    const expected = Math.round((30000 * 165.3) / (165.3 / 3.306))
    expect(ppyeong).toBe(expected)
  })
})
