import { describe, it, expect } from 'vitest'
import { calcChipRange, getChipMarginPercent } from '@/lib/estimate/costChips'

describe('calcChipRange', () => {
  it('desktop: costPerM2=12,000 → m² 단가 범위 (step=1000)', () => {
    const chips = calcChipRange(12_000, false)

    // minP = ceil(12000 / (1.09 * 0.6) / 1000) * 1000
    //      = ceil(12000 / 0.654 / 1000) * 1000
    //      = ceil(18348.62 / 1000) * 1000
    //      = ceil(18.349) * 1000
    //      = 19000
    const expectedMin = 19000

    // maxP = ceil(12000 / (1.09 * 0.45) / 1000) * 1000
    //      = ceil(12000 / 0.4905 / 1000) * 1000
    //      = ceil(24464.83 / 1000) * 1000
    //      = ceil(24.465) * 1000
    //      = 25000
    const expectedMax = 25000

    expect(chips[0]).toBe(expectedMin)
    expect(chips[chips.length - 1]).toBe(expectedMax)
    expect(chips.length).toBe((expectedMax - expectedMin) / 1000 + 1)

    // 모든 칩은 1000 단위
    for (let i = 1; i < chips.length; i++) {
      expect(chips[i] - chips[i - 1]).toBe(1000)
    }
  })

  it('mobile: costPerM2=12,000 → step=2000', () => {
    const chips = calcChipRange(12_000, true)

    // minP = ceil(12000 / 0.654 / 2000) * 2000
    //      = ceil(18348.62 / 2000) * 2000
    //      = ceil(9.174) * 2000
    //      = 20000
    const expectedMin = 20000

    // maxP = ceil(12000 / 0.4905 / 2000) * 2000
    //      = ceil(24464.83 / 2000) * 2000
    //      = ceil(12.232) * 2000
    //      = 26000
    const expectedMax = 26000

    expect(chips[0]).toBe(expectedMin)
    expect(chips[chips.length - 1]).toBe(expectedMax)

    // 모든 칩은 2000 단위
    for (let i = 1; i < chips.length; i++) {
      expect(chips[i] - chips[i - 1]).toBe(2000)
    }
  })

  it('costPerM2=0 → 빈 배열', () => {
    expect(calcChipRange(0, false)).toEqual([])
    expect(calcChipRange(0, true)).toEqual([])
  })
})

describe('getChipMarginPercent', () => {
  it('정상 마진율 계산', () => {
    // costPerM2 = 12000, pricePerM2 = 30000
    // revenue = 30000 * 1.09 = 32700
    // margin = (32700 - 12000) / 32700 * 100 = 63.30...
    // Math.round(63.30) = 63
    const result = getChipMarginPercent(30000, 12000)
    expect(result).toBe(63)
  })

  it('pricePerM2=0 → 0', () => {
    expect(getChipMarginPercent(0, 12000)).toBe(0)
  })
})
