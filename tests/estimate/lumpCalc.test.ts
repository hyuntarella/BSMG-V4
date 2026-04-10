import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { buildItems } from '@/lib/estimate/buildItems'
import { calc } from '@/lib/estimate/calc'
import type { EstimateItem, PriceMatrixRaw } from '@/lib/estimate/types'

const matrixPath = resolve(__dirname, '..', '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

describe('#11 lump 금액 (식 단위)', () => {
  it('lump_amount 항목은 exp에 귀속, mat/labor=0', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })

    // 첫 번째 항목을 lump로 변환
    const lumpItem: EstimateItem = {
      ...items[0],
      lump_amount: 500000,
      mat_amount: 0,
      labor_amount: 0,
      exp_amount: 500000,
      total: 500000,
    }

    expect(lumpItem.mat_amount).toBe(0)
    expect(lumpItem.labor_amount).toBe(0)
    expect(lumpItem.exp_amount).toBe(500000)
    expect(lumpItem.total).toBe(500000)
  })

  it('lump 항목은 overhead/profit 계산에서 제외된다', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })

    // 기본 calc
    const calcNormal = calc(items)

    // lump 항목 추가 (50만원)
    const lumpItem: EstimateItem = {
      sort_order: items.length + 1,
      name: '특수비용',
      spec: '',
      unit: '식',
      qty: 1,
      mat: 0, labor: 0, exp: 0,
      mat_amount: 0,
      labor_amount: 0,
      exp_amount: 500000,
      total: 500000,
      is_base: false,
      is_equipment: false,
      is_fixed_qty: false,
      lump_amount: 500000,
    }

    const itemsWithLump = [...items, lumpItem]
    const calcWithLump = calc(itemsWithLump)

    // subtotal은 lump만큼 증가
    expect(calcWithLump.subtotal).toBe(calcNormal.subtotal + 500000)

    // overhead/profit은 변하지 않음 (lump 제외)
    expect(calcWithLump.overhead).toBe(calcNormal.overhead)
    expect(calcWithLump.profit).toBe(calcNormal.profit)
  })

  it('lump 없는 일반 항목은 기존 대로 overhead/profit에 포함', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })

    const calcResult = calc(items)

    const nonEquipTotal = items
      .filter(i => !i.is_equipment)
      .reduce((s, i) => s + i.total, 0)

    expect(calcResult.overhead).toBe(Math.round(nonEquipTotal * 0.03))
    expect(calcResult.profit).toBe(Math.round(nonEquipTotal * 0.06))
  })
})
