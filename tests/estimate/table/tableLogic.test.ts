import { describe, it, expect } from 'vitest'
import type { EstimateItem } from '@/lib/estimate/types'
import { recalcRow, recalcAllTotals, markAsEdited } from '@/lib/estimate/tableLogic'

function makeItem(overrides: Partial<EstimateItem> = {}): EstimateItem {
  return {
    sort_order: 1,
    name: '바탕정리',
    spec: '',
    unit: 'm²',
    qty: 100,
    mat: 1000,
    labor: 2000,
    exp: 500,
    mat_amount: 100000,
    labor_amount: 200000,
    exp_amount: 50000,
    total: 350000,
    is_base: true,
    is_equipment: false,
    is_fixed_qty: false,
    ...overrides,
  }
}

describe('recalcRow', () => {
  it('단가 × 수량 = 금액', () => {
    const item = makeItem({ qty: 50, mat: 1000, labor: 2000, exp: 500 })
    const result = recalcRow(item)
    expect(result.mat_amount).toBe(50000)
    expect(result.labor_amount).toBe(100000)
    expect(result.exp_amount).toBe(25000)
  })

  it('합계 = mat_amount + labor_amount + exp_amount', () => {
    const item = makeItem({ qty: 10, mat: 100, labor: 200, exp: 300 })
    const result = recalcRow(item)
    expect(result.total).toBe(1000 + 2000 + 3000)
  })
})

describe('recalcAllTotals', () => {
  it('소계/공과잡비/이윤 정확 계산', () => {
    const items = [
      makeItem({ total: 1000000, is_equipment: false, is_hidden: false }),
      makeItem({ total: 500000, is_equipment: false, is_hidden: false }),
    ]
    const result = recalcAllTotals(items)
    expect(result.subtotal).toBe(1500000)
    expect(result.overhead).toBe(Math.round(1500000 * 0.03))
    expect(result.profit).toBe(Math.round(1500000 * 0.06))
  })

  it('숨김 행은 합계에서 제외', () => {
    const items = [
      makeItem({ total: 1000000, is_hidden: false }),
      makeItem({ total: 500000, is_hidden: true }),
    ]
    const result = recalcAllTotals(items)
    expect(result.subtotal).toBe(1000000)
  })
})

describe('markAsEdited', () => {
  it('qty 변경 시 original_qty 백업', () => {
    const item = makeItem({ qty: 100 })
    const result = markAsEdited(item, 'qty', 200)
    expect(result.original_qty).toBe(100)
    expect(result.qty).toBe(200)
    expect(result.is_locked).toBe(true)
  })

  it('mat 변경 시 original_mat 백업', () => {
    const item = makeItem({ mat: 1000 })
    const result = markAsEdited(item, 'mat', 2000)
    expect(result.original_mat).toBe(1000)
    expect(result.mat).toBe(2000)
    expect(result.is_locked).toBe(true)
  })

  it('labor 변경 시 original_labor 백업', () => {
    const item = makeItem({ labor: 2000 })
    const result = markAsEdited(item, 'labor', 3000)
    expect(result.original_labor).toBe(2000)
    expect(result.labor).toBe(3000)
  })

  it('exp 변경 시 original_exp 백업', () => {
    const item = makeItem({ exp: 500 })
    const result = markAsEdited(item, 'exp', 800)
    expect(result.original_exp).toBe(500)
    expect(result.exp).toBe(800)
  })

  it('locked=true 설정 + 중복 백업 방지', () => {
    const item = makeItem({ qty: 100, original_qty: 50 })
    const result = markAsEdited(item, 'qty', 200)
    expect(result.is_locked).toBe(true)
    // original_qty는 이미 있으므로 덮어쓰지 않음
    expect(result.original_qty).toBe(50)
    expect(result.qty).toBe(200)
  })

  it('name 변경 시 original_name 백업', () => {
    const item = makeItem({ name: '바탕정리' })
    const result = markAsEdited(item, 'name', '수정된 품명')
    expect(result.original_name).toBe('바탕정리')
    expect(result.name).toBe('수정된 품명')
    expect(result.is_locked).toBe(true)
  })

  it('숫자 필드 변경 시 금액 자동 재계산', () => {
    const item = makeItem({ qty: 10, mat: 100, labor: 200, exp: 300 })
    const result = markAsEdited(item, 'qty', 20)
    expect(result.mat_amount).toBe(2000)
    expect(result.labor_amount).toBe(4000)
    expect(result.exp_amount).toBe(6000)
    expect(result.total).toBe(12000)
  })
})
