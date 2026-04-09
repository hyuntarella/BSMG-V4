import { describe, it, expect } from 'vitest'
import { calcTableTier } from '@/lib/estimate/tableLayout'

describe('calcTableTier', () => {
  // Tier 1: 1~15행
  it('11행 → tier 1', () => {
    const t = calcTableTier(11)
    expect(t.tier).toBe(1)
    expect(t.rowHeight).toBe(28)
    expect(t.fontClass).toBe('text-sm')
    expect(t.paddingClass).toBe('py-1')
    expect(t.showOverflowWarning).toBe(false)
  })

  it('15행 → tier 1 (상한 경계)', () => {
    const t = calcTableTier(15)
    expect(t.tier).toBe(1)
    expect(t.rowHeight).toBe(28)
  })

  it('1행 → tier 1 (최소)', () => {
    const t = calcTableTier(1)
    expect(t.tier).toBe(1)
  })

  it('0행 → tier 1 (빈 테이블)', () => {
    const t = calcTableTier(0)
    expect(t.tier).toBe(1)
  })

  // Tier 2: 16~18행
  it('16행 → tier 2 (하한 경계)', () => {
    const t = calcTableTier(16)
    expect(t.tier).toBe(2)
    expect(t.rowHeight).toBe(24)
    expect(t.fontClass).toBe('text-sm')
    expect(t.paddingClass).toBe('py-0.5')
    expect(t.showOverflowWarning).toBe(false)
  })

  it('18행 → tier 2 (상한 경계)', () => {
    const t = calcTableTier(18)
    expect(t.tier).toBe(2)
    expect(t.rowHeight).toBe(24)
  })

  // Tier 3: 19~20행
  it('19행 → tier 3 (하한 경계)', () => {
    const t = calcTableTier(19)
    expect(t.tier).toBe(3)
    expect(t.rowHeight).toBe(22)
    expect(t.fontClass).toBe('text-xs')
    expect(t.paddingClass).toBe('py-0')
    expect(t.showOverflowWarning).toBe(false)
  })

  it('20행 → tier 3 (상한 경계)', () => {
    const t = calcTableTier(20)
    expect(t.tier).toBe(3)
    expect(t.rowHeight).toBe(22)
    expect(t.showOverflowWarning).toBe(false)
  })

  // Tier 4: 21행+
  it('21행 → tier 4 + 경고', () => {
    const t = calcTableTier(21)
    expect(t.tier).toBe(4)
    expect(t.rowHeight).toBe(22)
    expect(t.fontClass).toBe('text-xs')
    expect(t.paddingClass).toBe('py-0')
    expect(t.showOverflowWarning).toBe(true)
  })

  it('25행 → tier 4', () => {
    const t = calcTableTier(25)
    expect(t.tier).toBe(4)
    expect(t.showOverflowWarning).toBe(true)
  })

  // 헤더 높이 비례 축소
  it('tier별 headerHeight 비례 축소', () => {
    expect(calcTableTier(10).headerHeight).toBe(30)
    expect(calcTableTier(17).headerHeight).toBe(28)
    expect(calcTableTier(19).headerHeight).toBe(26)
    expect(calcTableTier(22).headerHeight).toBe(26)
  })

  // A4 픽셀 검증
  it('A4 1000px 내 적합성 (tier 1: 15행)', () => {
    const t = calcTableTier(15)
    const bodyH = 15 * t.rowHeight // 420
    const footerH = 5 * t.rowHeight // 140
    const total = bodyH + t.headerHeight + footerH // 590
    expect(total).toBeLessThan(1000)
  })

  it('A4 1000px 내 적합성 (tier 2: 18행)', () => {
    const t = calcTableTier(18)
    const bodyH = 18 * t.rowHeight
    const footerH = 5 * t.rowHeight
    const total = bodyH + t.headerHeight + footerH
    expect(total).toBeLessThan(1000)
  })

  it('A4 1000px 내 적합성 (tier 3: 20행)', () => {
    const t = calcTableTier(20)
    const bodyH = 20 * t.rowHeight
    const footerH = 5 * t.rowHeight
    const total = bodyH + t.headerHeight + footerH
    expect(total).toBeLessThan(1000)
  })
})
