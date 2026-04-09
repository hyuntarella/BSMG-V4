import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { EstimateItem, PriceMatrixRaw } from '@/lib/estimate/types'
import { buildItems } from '@/lib/estimate/buildItems'
import { recalcRow, recalcAllTotals, markAsEdited } from '@/lib/estimate/tableLogic'

const matrixPath = resolve(__dirname, '..', '..', '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

function buildComplexItems(m2: number, ppp: number): EstimateItem[] {
  return buildItems({ method: '복합', m2, pricePerPyeong: ppp, priceMatrix }).items
}

function buildUrethaneItems(m2: number, ppp: number): EstimateItem[] {
  return buildItems({ method: '우레탄', m2, pricePerPyeong: ppp, priceMatrix }).items
}

describe('ExcelLikeTable 통합 로직', () => {
  it('복합 항목 정상 생성 (기본 공종 + 장비 미포함)', () => {
    const items = buildComplexItems(150, 35000)
    expect(items.length).toBeGreaterThanOrEqual(7)
    expect(items[0].name).toBe('바탕정리')
  })

  it('우레탄 항목 정상 생성 (기본 공종 + 장비 미포함)', () => {
    const items = buildUrethaneItems(150, 30000)
    expect(items.length).toBeGreaterThanOrEqual(6)
    expect(items[0].name).toBe('바탕정리')
  })

  it('수량 변경 시 금액 자동 재계산', () => {
    const items = buildComplexItems(150, 35000)
    const original = items[0]
    const edited = markAsEdited(original, 'qty', 200)
    const recalced = recalcRow(edited)

    expect(recalced.qty).toBe(200)
    expect(recalced.mat_amount).toBe(Math.round(200 * recalced.mat))
    expect(recalced.labor_amount).toBe(Math.round(200 * recalced.labor))
    expect(recalced.exp_amount).toBe(Math.round(200 * recalced.exp))
    expect(recalced.total).toBe(recalced.mat_amount + recalced.labor_amount + recalced.exp_amount)
  })

  it('단가 변경 시 금액 + 합계 자동 재계산', () => {
    const items = buildComplexItems(150, 35000)
    const originalTotals = recalcAllTotals(items)

    // 재료단가 변경
    const editedItem = markAsEdited(items[0], 'mat', items[0].mat + 500)
    const newItems = [...items]
    newItems[0] = editedItem

    const newTotals = recalcAllTotals(newItems)
    // 재료단가 증가 → 합계도 증가
    expect(newTotals.subtotal).toBeGreaterThan(originalTotals.subtotal)
  })

  it('자동 잠금: 편집 시 locked + original 백업', () => {
    const items = buildComplexItems(150, 35000)
    const item = items[0]
    expect(item.is_locked).toBeFalsy()

    const edited = markAsEdited(item, 'mat', 9999)
    expect(edited.is_locked).toBe(true)
    expect(edited.original_mat).toBe(item.mat)
    expect(edited.mat).toBe(9999)
  })
})
