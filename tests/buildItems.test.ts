import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { buildItems } from '../lib/estimate/buildItems'
import { calc } from '../lib/estimate/calc'
import { getAR } from '../lib/estimate/areaRange'
import { getPD } from '../lib/estimate/priceData'
import { getMargin } from '../lib/estimate/margin'
import { fm } from '../lib/utils/format'
import { n2k } from '../lib/utils/numberToKorean'
import type { PriceMatrixRaw } from '../lib/estimate/types'

const matrixPath = resolve(__dirname, '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

describe('getAR (면적대 판별)', () => {
  it('50m² (15평) → 20평이하', () => expect(getAR(50)).toBe('20평이하'))
  it('150m² (45평) → 50평미만', () => expect(getAR(150)).toBe('50평미만'))
  it('200m² (60평) → 50~100평', () => expect(getAR(200)).toBe('50~100평'))
  it('500m² (151평) → 100~200평', () => expect(getAR(500)).toBe('100~200평'))
  it('1000m² (302평) → 200평이상', () => expect(getAR(1000)).toBe('200평이상'))
})

describe('getPD (P매트릭스 조회)', () => {
  it('50평미만/복합/38000 → 11개 또는 12개 항목 (seed 버전에 따라)', () => {
    const pd = getPD(priceMatrix, '50평미만', '복합', 38000)
    // root price_matrix_seed.json은 11개, pvalue seed는 12개 (스카이차 placeholder 포함)
    expect([11, 12]).toContain(pd.length)
  })

  it('바탕정리 mat=300, labor=700', () => {
    const pd = getPD(priceMatrix, '50평미만', '복합', 38000)
    expect(pd[0][0]).toBe(300)
    expect(pd[0][1]).toBe(700)
  })

  it('보간 결과 길이 일관', () => {
    const pd = getPD(priceMatrix, '50평미만', '복합', 38000)
    const pdInterp = getPD(priceMatrix, '50평미만', '복합', 38500)
    expect(pdInterp.length).toBe(pd.length)
  })
})

describe('buildItems (복합)', () => {
  const result = buildItems({
    method: '복합',
    m2: 150,
    pricePerPyeong: 35000,
    priceMatrix,
    options: { ladder: { days: 1 }, waste: { days: 1 } },
  })

  it('공종이 1개 이상 생성됨', () => expect(result.items.length).toBeGreaterThan(0))
  it('소계가 0보다 큼', () => expect(result.calcResult.subtotal).toBeGreaterThan(0))
  it('10만원 단위 절사', () => expect(result.calcResult.grandTotal % 100000).toBe(0))
  it('절사 후 ≤ 절사 전', () => expect(result.calcResult.grandTotal).toBeLessThanOrEqual(result.calcResult.totalBeforeRound))
  it('바탕정리 공종 존재', () => expect(result.items.find(i => i.name === '바탕정리')).toBeDefined())
  it('바탕정리 qty = 150', () => expect(result.items.find(i => i.name === '바탕정리')!.qty).toBe(150))
  it('사다리차 공종 존재', () => expect(result.items.find(i => i.name === '사다리차')).toBeDefined())
  it('사다리차 qty = 1', () => expect(result.items.find(i => i.name === '사다리차')!.qty).toBe(1))
  it('스카이차 옵션 없으면 제외', () => expect(result.items.find(i => i.name === '스카이차')).toBeUndefined())
})

describe('buildItems (우레탄 + 스카이차)', () => {
  const resultU = buildItems({
    method: '우레탄',
    m2: 300,
    pricePerPyeong: 32000,
    priceMatrix,
    options: {
      ladder: { days: 2 },
      sky: { days: 1, unitPrice: 400000 },
      waste: { days: 2 },
    },
  })

  it('우레탄 공종 생성됨', () => expect(resultU.items.length).toBeGreaterThan(0))
  it('우레탄 합계 > 0', () => expect(resultU.calcResult.grandTotal).toBeGreaterThan(0))
  it('스카이차 옵션 있으면 포함', () => expect(resultU.items.find(i => i.name === '스카이차')).toBeDefined())
  it('스카이차 qty = 1', () => expect(resultU.items.find(i => i.name === '스카이차')!.qty).toBe(1))
  it('스카이차 unitPrice 오버라이드는 경비(exp)에 기록 = 400000',
    () => expect(resultU.items.find(i => i.name === '스카이차')!.exp).toBe(400000))
  it('스카이차 labor는 0 유지', () =>
    expect(resultU.items.find(i => i.name === '스카이차')!.labor).toBe(0))
})

describe('장비 컬럼 정확성: 모든 장비 비용은 경비(exp) 컬럼', () => {
  it('사다리차: labor=0, exp>0 (기본단가 fallback)', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
      options: { ladder: { days: 1 } },
    })
    const ladder = items.find(i => i.name === '사다리차')!
    expect(ladder).toBeDefined()
    expect(ladder.labor).toBe(0)
    expect(ladder.exp).toBeGreaterThan(0)
    expect(ladder.labor_amount).toBe(0)
    expect(ladder.exp_amount).toBe(ladder.qty * ladder.exp)
  })

  it('폐기물처리: labor=0, exp>0 (기본단가 fallback)', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
      options: { waste: { days: 1 } },
    })
    const waste = items.find(i => i.name === '폐기물처리')!
    expect(waste).toBeDefined()
    expect(waste.labor).toBe(0)
    expect(waste.exp).toBeGreaterThan(0)
    expect(waste.labor_amount).toBe(0)
  })

  it('스카이차 (우레탄): 사용자 unitPrice 오버라이드는 exp에 반영', () => {
    const { items } = buildItems({
      method: '우레탄', m2: 300, pricePerPyeong: 32000, priceMatrix,
      options: { sky: { days: 1, unitPrice: 400000 } },
    })
    const sky = items.find(i => i.name === '스카이차')!
    expect(sky.exp).toBe(400000)
    expect(sky.labor).toBe(0)
  })

  it('장비 총액 이중계상 방지: labor_amount + exp_amount ≤ qty × max(labor,exp) × 2 (정상은 1배)', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
      options: { ladder: { days: 1 }, waste: { days: 1 } },
    })
    for (const name of ['사다리차', '폐기물처리']) {
      const it = items.find(i => i.name === name)!
      // labor=0, exp>0 이어야 하므로 total = exp_amount
      expect(it.total).toBe(it.exp_amount)
      expect(it.total).toBe(it.qty * it.exp)
    }
  })
})

describe('getMargin', () => {
  it('마진율 범위 정상', () => {
    const result = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
      options: { ladder: { days: 1 }, waste: { days: 1 } },
    })
    const margin = getMargin('복합', 150, result.calcResult.grandTotal)
    expect(margin).toBeGreaterThan(0)
    expect(margin).toBeLessThan(100)
  })
})

describe('n2k (숫자→한국어)', () => {
  it('3900000 → 삼백구십만', () => expect(n2k(3900000)).toBe('삼백구십만'))
  it('0 → 영', () => expect(n2k(0)).toBe('영'))
  it('12345 → 일만이천삼백사십오', () => expect(n2k(12345)).toBe('일만이천삼백사십오'))
})

describe('fm (천단위 콤마)', () => {
  it('3900000 → 3,900,000', () => expect(fm(3900000)).toBe('3,900,000'))
})
