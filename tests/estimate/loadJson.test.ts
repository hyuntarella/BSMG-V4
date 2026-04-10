import { describe, it, expect } from 'vitest'
import { exportToJson, importFromJson } from '@/lib/estimate/jsonIO'
import type { Estimate, EstimateSheet, PriceMatrixRaw } from '@/lib/estimate/types'
import { buildItems } from '@/lib/estimate/buildItems'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const matrixPath = resolve(__dirname, '..', '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

function makeEstimate(): Estimate {
  const complexBuild = buildItems({ method: '복합', m2: 100, pricePerPyeong: 35000, priceMatrix })

  const complexSheet: EstimateSheet = {
    type: '복합',
    title: '복합방수',
    price_per_pyeong: 35000,
    warranty_years: 5,
    warranty_bond: 3,
    grand_total: complexBuild.calcResult.grandTotal,
    sort_order: 0,
    items: complexBuild.items,
  }

  return {
    status: 'draft',
    date: '2026-04-09',
    customer_name: '테스트고객',
    site_name: '테스트현장',
    m2: 100,
    wall_m2: 10,
    sheets: [complexSheet],
  }
}

describe('importFromJson', () => {
  it('JSON → estimate 왕복 복원', () => {
    const original = makeEstimate()
    const jsonStr = exportToJson(original)
    const restored = importFromJson(jsonStr)

    expect(restored.customer_name).toBe('테스트고객')
    expect(restored.m2).toBe(100)
    expect(restored.sheets).toHaveLength(1)
    expect(restored.sheets[0].type).toBe('복합')
    expect(restored.sheets[0].items.length).toBe(original.sheets[0].items.length)
  })

  it('복원 시 status는 항상 draft로 초기화', () => {
    const est = makeEstimate()
    est.status = 'saved'
    const jsonStr = exportToJson(est)
    const restored = importFromJson(jsonStr)
    expect(restored.status).toBe('draft')
  })

  it('누락 필드 default 처리 (m2, wall_m2)', () => {
    const minimal = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      estimate: {
        status: 'draft',
        date: '2026-01-01',
        sheets: [{
          type: '복합',
          price_per_pyeong: 30000,
          warranty_years: 5,
          warranty_bond: 3,
          grand_total: 0,
          sort_order: 0,
          items: [],
        }],
      },
    }
    const restored = importFromJson(JSON.stringify(minimal))
    expect(restored.m2).toBe(0)
    expect(restored.wall_m2).toBe(0)
  })

  it('유효하지 않은 JSON → 에러', () => {
    expect(() => importFromJson('not json')).toThrow()
  })

  it('estimate 없는 JSON → 에러', () => {
    expect(() => importFromJson(JSON.stringify({ version: '4.0' }))).toThrow('유효하지 않은')
  })

  it('sheets 없는 JSON → 에러', () => {
    const noSheets = { version: '4.0', estimate: { status: 'draft', date: '2026-01-01' } }
    expect(() => importFromJson(JSON.stringify(noSheets))).toThrow('시트 데이터')
  })

  it('금액 자동 재계산', () => {
    const est = makeEstimate()
    const jsonStr = exportToJson(est)
    const parsed = JSON.parse(jsonStr)
    // 의도적으로 금액 왜곡
    parsed.estimate.sheets[0].items[0].mat_amount = 9999999
    const restored = importFromJson(JSON.stringify(parsed))
    const item = restored.sheets[0].items[0]
    // 재계산: qty * mat
    expect(item.mat_amount).toBe(Math.round(item.qty * item.mat))
  })
})
