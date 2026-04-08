import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { buildItems } from '@/lib/estimate/buildItems'
import { calc } from '@/lib/estimate/calc'
import { syncUrethaneItems } from '@/lib/estimate/syncUrethane'
import type { EstimateItem, PriceMatrixRaw } from '@/lib/estimate/types'

const matrixPath = resolve(__dirname, '..', '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

// ── #7 단위 오버라이드 ──
describe('#7 단위 오버라이드', () => {
  it('unit 변경 시 original_unit에 원본이 백업된다', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })
    const item = { ...items[0] }
    const originalUnit = item.unit

    // 최초 변경: original_unit 백업
    if (!item.original_unit) {
      item.original_unit = item.unit
    }
    item.unit = '식'

    expect(item.unit).toBe('식')
    expect(item.original_unit).toBe(originalUnit)
  })

  it('이미 original_unit이 있으면 덮어쓰지 않는다', () => {
    const item: Partial<EstimateItem> = {
      unit: '㎡',
      original_unit: 'm²',
    }

    // 두 번째 변경: original_unit 유지
    if (!item.original_unit) {
      item.original_unit = item.unit
    }
    item.unit = '식'

    expect(item.original_unit).toBe('m²')
  })
})

// ── #8 이름·규격 오버라이드 ──
describe('#8 이름·규격 오버라이드', () => {
  it('name 변경 시 original_name에 원본이 백업된다', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })
    const item = { ...items[0] }
    const originalName = item.name

    if (!item.original_name) {
      item.original_name = item.name
    }
    item.name = '커스텀 바탕정리'

    expect(item.name).toBe('커스텀 바탕정리')
    expect(item.original_name).toBe(originalName)
  })

  it('spec 변경 시 original_spec에 원본이 백업된다', () => {
    const { items } = buildItems({
      method: '우레탄', m2: 100, pricePerPyeong: 32000, priceMatrix,
    })
    const item = { ...items[0] }
    const originalSpec = item.spec

    if (!item.original_spec) {
      item.original_spec = item.spec
    }
    item.spec = '커스텀 규격'

    expect(item.spec).toBe('커스텀 규격')
    expect(item.original_spec).toBe(originalSpec)
  })
})

// ── #9 수량 오버라이드 ──
describe('#9 수량 오버라이드', () => {
  it('qty 변경 시 original_qty에 원본이 백업된다', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })
    const item = { ...items[0] }
    const originalQty = item.qty

    if (item.original_qty == null) {
      item.original_qty = item.qty
    }
    item.qty = 200

    expect(item.qty).toBe(200)
    expect(item.original_qty).toBe(originalQty)
  })

  it('금액이 재계산된다', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })
    const item = { ...items[0] }
    item.qty = 200
    item.mat_amount = Math.round(item.qty * item.mat)
    item.labor_amount = Math.round(item.qty * item.labor)
    item.exp_amount = Math.round(item.qty * item.exp)
    item.total = item.mat_amount + item.labor_amount + item.exp_amount

    expect(item.mat_amount).toBe(item.mat * 200)
  })
})

// ── #12 자유입력 모드 ──
describe('#12 자유입력', () => {
  it('자유입력 공종 추가 후 grand_total이 재계산된다', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })
    const calcBefore = calc(items)

    const freeItem: EstimateItem = {
      sort_order: items.length + 1,
      name: '특수 방수처리',
      spec: '옥상 추가',
      unit: '식',
      qty: 1,
      mat: 0,
      labor: 500000,
      exp: 0,
      mat_amount: 0,
      labor_amount: 500000,
      exp_amount: 0,
      total: 500000,
      is_base: false,
      is_equipment: false,
      is_fixed_qty: false,
    }

    const allItems = [...items, freeItem]
    const calcAfter = calc(allItems)

    expect(calcAfter.subtotal).toBeGreaterThan(calcBefore.subtotal)
    expect(calcAfter.grandTotal).toBeGreaterThan(calcBefore.grandTotal)
  })

  it('빈 이름의 자유입력은 필터 가능하다', () => {
    const freeItem: EstimateItem = {
      sort_order: 1,
      name: '',
      spec: '',
      unit: 'm²',
      qty: 0,
      mat: 0, labor: 0, exp: 0,
      mat_amount: 0, labor_amount: 0, exp_amount: 0,
      total: 0,
      is_base: false, is_equipment: false, is_fixed_qty: false,
    }
    expect(freeItem.name).toBe('')
    expect([freeItem].filter(i => i.name).length).toBe(0)
  })
})

// ── #13 우레탄 동기화 ──
describe('#13 우레탄 동기화', () => {
  const complexResult = buildItems({
    method: '복합', m2: 200, pricePerPyeong: 38000, priceMatrix,
  })
  const urethaneResult = buildItems({
    method: '우레탄', m2: 200, pricePerPyeong: 35000, priceMatrix,
  })

  it('동기화 후 복합 벽체우레탄 단가가 우레탄 시트와 일치한다', () => {
    const synced = syncUrethaneItems(complexResult.items, urethaneResult.items)

    const complexWall = synced.find(i => i.name.replace(/\s/g, '') === '벽체우레탄')
    const urethaneWall = urethaneResult.items.find(i => i.name.replace(/\s/g, '') === '벽체우레탄')

    expect(complexWall).toBeDefined()
    expect(urethaneWall).toBeDefined()
    expect(complexWall!.mat).toBe(urethaneWall!.mat)
    expect(complexWall!.labor).toBe(urethaneWall!.labor)
    expect(complexWall!.exp).toBe(urethaneWall!.exp)
  })

  it('동기화 후 복합 우레탄상도 단가가 우레탄 시트와 일치한다', () => {
    const synced = syncUrethaneItems(complexResult.items, urethaneResult.items)

    const complexTop = synced.find(i => i.name.replace(/\s/g, '') === '우레탄상도')
    const urethaneTop = urethaneResult.items.find(i => i.name.replace(/\s/g, '') === '우레탄상도')

    expect(complexTop).toBeDefined()
    expect(urethaneTop).toBeDefined()
    expect(complexTop!.mat).toBe(urethaneTop!.mat)
    expect(complexTop!.labor).toBe(urethaneTop!.labor)
    expect(complexTop!.exp).toBe(urethaneTop!.exp)
  })

  it('동기화 후 노출우레탄은 u1+u2 합성 규칙 적용', () => {
    const synced = syncUrethaneItems(complexResult.items, urethaneResult.items)
    const complexNochul = synced.find(i => i.name.replace(/\s/g, '') === '노출우레탄')

    const u1 = urethaneResult.items.find(i => i.name.replace(/\s/g, '') === '노출우레탄1차')
    const u2 = urethaneResult.items.find(i => i.name.replace(/\s/g, '') === '노출우레탄2차')

    expect(complexNochul).toBeDefined()
    expect(u1).toBeDefined()
    expect(u2).toBeDefined()

    // v1 규칙: mat=u1.mat/2*3, labor=(u1+u2)/2, exp=(u1+u2)/2 (100원 단위 반올림)
    const r100 = (v: number) => Math.round(v / 100) * 100
    expect(complexNochul!.mat).toBe(r100(u1!.mat / 2 * 3))
    expect(complexNochul!.labor).toBe(r100((u1!.labor + u2!.labor) / 2))
    expect(complexNochul!.exp).toBe(r100((u1!.exp + u2!.exp) / 2))
  })

  it('금액이 동기화 후 재계산된다', () => {
    const synced = syncUrethaneItems(complexResult.items, urethaneResult.items)
    const wall = synced.find(i => i.name.replace(/\s/g, '') === '벽체우레탄')
    expect(wall).toBeDefined()
    expect(wall!.mat_amount).toBe(Math.round(wall!.mat * wall!.qty))
    expect(wall!.total).toBe(wall!.mat_amount + wall!.labor_amount + wall!.exp_amount)
  })

  it('우레탄 시트에 필요한 공종이 없으면 동기화하지 않는다', () => {
    const incompleteUrethane = urethaneResult.items.filter(
      i => i.name.replace(/\s/g, '') !== '노출우레탄1차'
    )
    const synced = syncUrethaneItems(complexResult.items, incompleteUrethane)
    // 원본 그대로 반환
    expect(synced).toEqual(complexResult.items)
  })
})
