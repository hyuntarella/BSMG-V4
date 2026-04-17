import { describe, it, expect } from 'vitest'
import { toDetailSheet } from '@/lib/estimate/pdf/detailMapper'
import type { Estimate, EstimateItem, EstimateSheet } from '@/lib/estimate/types'

function makeItem(overrides: Partial<EstimateItem> = {}): EstimateItem {
  return {
    sort_order: 0,
    name: '바탕정리',
    spec: '',
    unit: 'm2',
    qty: 270,
    mat: 800,
    labor: 1_200,
    exp: 0,
    mat_amount: 216_000,
    labor_amount: 324_000,
    exp_amount: 0,
    total: 540_000,
    is_base: true,
    is_equipment: false,
    is_fixed_qty: false,
    ...overrides,
  }
}

function makeSheet(overrides: Partial<EstimateSheet> = {}): EstimateSheet {
  return {
    type: '복합',
    title: '3.8mm',
    plan: '제 1안',
    price_per_pyeong: 85_000,
    warranty_years: 5,
    warranty_bond: 3,
    grand_total: 18_400_000,
    sort_order: 0,
    items: [makeItem()],
    ...overrides,
  }
}

function makeEstimate(overrides: Partial<Estimate> = {}): Estimate {
  return {
    status: 'draft',
    date: '2026-04-17',
    customer_name: '홍길동',
    site_name: '옥상',
    m2: 270,
    wall_m2: 0,
    sheets: [makeSheet()],
    ...overrides,
  }
}

describe('toDetailSheet', () => {
  it('Case 1 — 기본 매핑 (공사명 조립 + 단일 item + warranty note)', () => {
    const estimate = makeEstimate()
    const sheet = toDetailSheet(estimate, 0)

    expect(sheet.constructionName).toBe('옥상 복합방수 제 1안')
    expect(sheet.overheadRate).toBe(0.03)
    expect(sheet.profitRate).toBe(0.06)
    expect(sheet.pageNumber).toBe('2/2')
    expect(sheet.rows).toHaveLength(1)

    const row = sheet.rows[0]
    expect(row.kind).toBe('item')
    if (row.kind !== 'item') return
    expect(row.name).toBe('바탕정리')
    expect(row.unit).toBe('m2')
    expect(row.quantity).toBe(270)
    expect(row.material).toEqual({ unitPrice: 800, amount: 216_000 })
    expect(row.labor).toEqual({ unitPrice: 1_200, amount: 324_000 })
    expect(row.expense).toBeUndefined()
    expect(row.total).toEqual({ unitPrice: 2_000, amount: 540_000 })
    expect(row.note).toBe('5년')
  })

  it('Case 2 — is_hidden 항목 제외', () => {
    const estimate = makeEstimate({
      sheets: [
        makeSheet({
          items: [
            makeItem({ name: '표시', is_hidden: false }),
            makeItem({ name: '숨김', is_hidden: true }),
            makeItem({ name: '또표시' }),
          ],
        }),
      ],
    })

    const sheet = toDetailSheet(estimate, 0)
    expect(sheet.rows).toHaveLength(2)
    const names = sheet.rows.map(r => (r.kind === 'item' ? r.name : ''))
    expect(names).toEqual(['표시', '또표시'])
  })

  it('Case 3 — 다중 sheet pageNumber', () => {
    const estimate = makeEstimate({
      sheets: [
        makeSheet({ type: '복합' }),
        makeSheet({ type: '우레탄' }),
        makeSheet({ type: '복합' }),
      ],
    })

    expect(toDetailSheet(estimate, 0).pageNumber).toBe('2/4')
    expect(toDetailSheet(estimate, 1).pageNumber).toBe('3/4')
    expect(toDetailSheet(estimate, 2).pageNumber).toBe('4/4')
  })

  it('Case 4 — lump_amount 있으면 total.amount 오버라이드', () => {
    const estimate = makeEstimate({
      sheets: [
        makeSheet({
          items: [
            makeItem({
              name: '일시불공사',
              mat: 100,
              labor: 200,
              exp: 300,
              mat_amount: 100_000,
              labor_amount: 200_000,
              exp_amount: 300_000,
              total: 600_000,
              lump_amount: 1_000_000,
            }),
          ],
        }),
      ],
    })

    const sheet = toDetailSheet(estimate, 0)
    const row = sheet.rows[0]
    if (row.kind !== 'item') throw new Error('expected item')

    expect(row.material?.amount).toBe(100_000)
    expect(row.labor?.amount).toBe(200_000)
    expect(row.expense?.amount).toBe(300_000)
    expect(row.total?.amount).toBe(1_000_000)
    expect(row.total?.unitPrice).toBe(600)
  })

  it('Case 5 — 빈 값 처리 (0 → undefined, 전 컬럼 없으면 WorkColumn 자체 생략)', () => {
    const estimate = makeEstimate({
      sheets: [
        makeSheet({
          items: [
            makeItem({
              name: '폐기물 처리',
              qty: 1,
              unit: '식',
              mat: 0,
              labor: 0,
              exp: 0,
              mat_amount: 0,
              labor_amount: 0,
              exp_amount: 300_000,
              total: 300_000,
            }),
          ],
        }),
      ],
    })

    const sheet = toDetailSheet(estimate, 0)
    const row = sheet.rows[0]
    if (row.kind !== 'item') throw new Error('expected item')

    expect(row.material).toBeUndefined()
    expect(row.labor).toBeUndefined()
    expect(row.expense).toEqual({ amount: 300_000 })
    expect(row.total).toEqual({ amount: 300_000 })
    expect(row.unit).toBe('식')
    expect(row.quantity).toBe(1)
  })

  it('Case 6 — 잘못된 sheetIndex → Error', () => {
    const estimate = makeEstimate()
    expect(() => toDetailSheet(estimate, 5)).toThrow(/sheetIndex 5 out of range/)
    expect(() => toDetailSheet(estimate, -1)).toThrow(/out of range/)
  })

  it('Case 7 — site_name 없으면 공사명에서 생략', () => {
    const estimate = makeEstimate({ site_name: undefined })
    const sheet = toDetailSheet(estimate, 0)
    expect(sheet.constructionName).toBe('복합방수 제 1안')
  })

  it('Case 8 — warranty_years 없으면 note 빈 값', () => {
    const estimate = makeEstimate({
      sheets: [makeSheet({ warranty_years: 0 })],
    })
    const sheet = toDetailSheet(estimate, 0)
    const row = sheet.rows[0]
    if (row.kind !== 'item') throw new Error('expected item')
    expect(row.note).toBeUndefined()
  })
})
