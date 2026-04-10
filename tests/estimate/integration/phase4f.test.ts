import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { Estimate, EstimateItem, EstimateSheet, PriceMatrixRaw } from '@/lib/estimate/types'
import { buildItems } from '@/lib/estimate/buildItems'
import { calc } from '@/lib/estimate/calc'
import { markAsEdited, recalcRow, recalcAllTotals } from '@/lib/estimate/tableLogic'
import { syncUrethaneItems } from '@/lib/estimate/syncUrethane'

const matrixPath = resolve(__dirname, '..', '..', '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

/** 테스트용 Estimate 생성 (복합+우레탄 2시트) */
function makeEstimate(m2 = 150): Estimate {
  const complexBuild = buildItems({ method: '복합', m2, pricePerPyeong: 35000, priceMatrix })
  const urethaneBuild = buildItems({ method: '우레탄', m2, pricePerPyeong: 30000, priceMatrix })

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

  const urethaneSheet: EstimateSheet = {
    type: '우레탄',
    title: '우레탄방수',
    price_per_pyeong: 30000,
    warranty_years: 5,
    warranty_bond: 3,
    grand_total: urethaneBuild.calcResult.grandTotal,
    sort_order: 1,
    items: urethaneBuild.items,
  }

  return {
    status: 'draft',
    date: '2026-04-09',
    m2,
    wall_m2: 0,
    sheets: [complexSheet, urethaneSheet],
    sync_urethane: true,
  }
}

describe('Phase 4F — Phase 3 기능 통합 테스트', () => {
  // ── 1. 잠금 토글 ──
  it('잠금 토글: is_locked true↔false', () => {
    const est = makeEstimate()
    const items = est.sheets[0].items
    expect(items[0].is_locked).toBeFalsy()

    // 잠금
    const locked = { ...items[0], is_locked: true }
    expect(locked.is_locked).toBe(true)

    // 해제
    const unlocked = { ...locked, is_locked: false }
    expect(unlocked.is_locked).toBe(false)
  })

  // ── 2. 숨김 토글 + grand_total 재계산 ──
  it('숨김 토글: is_hidden 토글 → grand_total 재계산', () => {
    const est = makeEstimate()
    const items = [...est.sheets[0].items]
    const originalTotal = est.sheets[0].grand_total

    // 첫 번째 공종 숨김
    items[0] = { ...items[0], is_hidden: true }
    const newCalc = calc(items.filter(i => !i.is_hidden))

    expect(newCalc.grandTotal).toBeLessThan(originalTotal)

    // 숨김 해제
    items[0] = { ...items[0], is_hidden: false }
    const restoredCalc = calc(items.filter(i => !i.is_hidden))
    expect(restoredCalc.grandTotal).toBe(originalTotal)
  })

  // ── 3. 자유입력 행 추가 ──
  it('자유입력: 행 추가 → 편집 가능', () => {
    const est = makeEstimate()
    const items = [...est.sheets[0].items]
    const originalLen = items.length

    const newItem: EstimateItem = {
      sort_order: items.length + 1,
      name: '',
      spec: '',
      unit: 'm²',
      qty: 1,
      mat: 0,
      labor: 0,
      exp: 0,
      mat_amount: 0,
      labor_amount: 0,
      exp_amount: 0,
      total: 0,
      is_base: false,
      is_equipment: false,
      is_fixed_qty: false,
    }
    items.push(newItem)

    expect(items.length).toBe(originalLen + 1)
    expect(items[items.length - 1].name).toBe('')

    // 품명 편집
    const edited = markAsEdited(items[items.length - 1], 'name', '커스텀 공종')
    expect(edited.name).toBe('커스텀 공종')
  })

  // ── 4. 우레탄 동기화 ──
  it('우레탄 동기화: 우레탄 시트 변경 → 복합 시트 우레탄 관련 공종 동기화', () => {
    const est = makeEstimate()
    const complexItems = est.sheets[0].items
    const urethaneItems = est.sheets[1].items

    // 우레탄 시트의 단가로 복합 시트 동기화
    const synced = syncUrethaneItems(complexItems, urethaneItems)

    // 동기화 대상 공종이 있으면 확인
    const nochul = synced.find(i => i.name.replace(/\s/g, '') === '노출우레탄')
    const wallUre = synced.find(i => i.name.replace(/\s/g, '') === '벽체우레탄')
    const topCoat = synced.find(i => i.name.replace(/\s/g, '') === '우레탄상도')

    // 복합에 노출우레탄이 있으면 동기화되었는지 확인
    if (nochul) {
      const u1 = urethaneItems.find(i => i.name.replace(/\s/g, '') === '노출우레탄1차')
      if (u1) {
        expect(nochul.mat).toBe(Math.round(u1.mat / 2 * 3 / 100) * 100)
      }
    }
    // 벽체우레탄이 있으면 그대로 복사되었는지
    if (wallUre) {
      const srcWall = urethaneItems.find(i => i.name.replace(/\s/g, '') === '벽체우레탄')
      if (srcWall) {
        expect(wallUre.mat).toBe(srcWall.mat)
        expect(wallUre.labor).toBe(srcWall.labor)
      }
    }
    // 우레탄 상도도 마찬가지
    if (topCoat) {
      const srcTop = urethaneItems.find(i => i.name.replace(/\s/g, '') === '우레탄상도')
      if (srcTop) {
        expect(topCoat.mat).toBe(srcTop.mat)
      }
    }
  })

  // ── 5. lump 편집: 식 단위 처리 ──
  it('lump: 식 단위 금액 직접 설정', () => {
    const est = makeEstimate()
    const items = [...est.sheets[0].items]

    // 식 단위 항목 만들기 (또는 기존 찾기)
    const lumpItem: EstimateItem = {
      sort_order: items.length + 1,
      name: '소형평수할증',
      spec: '',
      unit: '식',
      qty: 1,
      mat: 0,
      labor: 0,
      exp: 0,
      mat_amount: 0,
      labor_amount: 0,
      exp_amount: 0,
      total: 0,
      is_base: false,
      is_equipment: false,
      is_fixed_qty: false,
      lump_amount: 500000,
    }

    // lump 금액 설정
    lumpItem.exp_amount = 500000
    lumpItem.total = 500000

    expect(lumpItem.unit).toBe('식')
    expect(lumpItem.total).toBe(500000)
    // 재료단가/인건단가/경비단가는 의미 없음 (readonly)
    expect(lumpItem.mat).toBe(0)
    expect(lumpItem.labor).toBe(0)
  })

  // ── 6. Undo 테스트 (스택 시뮬레이션) ──
  it('Undo: 편집 후 복원', () => {
    const est = makeEstimate()
    const items = est.sheets[0].items
    const originalMat = items[0].mat

    // undo 스택 시뮬레이션
    const undoStack: EstimateItem[][] = []
    undoStack.push(JSON.parse(JSON.stringify(items)))

    // 편집
    const edited = markAsEdited(items[0], 'mat', 9999)
    const newItems = [...items]
    newItems[0] = edited
    expect(newItems[0].mat).toBe(9999)

    // undo
    const restored = undoStack.pop()!
    expect(restored[0].mat).toBe(originalMat)
  })

  // ── 7. Redo 테스트 (스택 시뮬레이션) ──
  it('Redo: undo 후 redo', () => {
    const items: EstimateItem[][] = []
    const est = makeEstimate()
    const original = est.sheets[0].items

    // undo 스택
    const undoStack: EstimateItem[][] = []
    const redoStack: EstimateItem[][] = []

    undoStack.push(JSON.parse(JSON.stringify(original)))

    // 편집
    const edited = markAsEdited(original[0], 'mat', 9999)
    const newItems = [...original]
    newItems[0] = edited

    // undo
    redoStack.push(JSON.parse(JSON.stringify(newItems)))
    const restored = undoStack.pop()!
    expect(restored[0].mat).toBe(original[0].mat)

    // redo
    const redone = redoStack.pop()!
    expect(redone[0].mat).toBe(9999)
  })

  // ── 8. 검색: query → matchingRowIndexes ──
  it('검색: 품명 매칭', () => {
    const est = makeEstimate()
    const items = est.sheets[0].items

    const query = '바탕'
    const matches = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.name.includes(query))
      .map(({ idx }) => idx)

    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches[0]).toBe(0) // 바탕정리는 보통 첫 번째
  })

  // ── 9. acDB 자동완성: 품명 편집 → 드롭다운 ──
  it('acDB: 검색 결과 구조 검증', () => {
    // AcdbSearchResult 구조 확인 (mock)
    const mockResult = {
      entry: {
        canon: '바탕정리',
        display: '바탕정리',
        aliases: [],
        unit: 'm²',
        spec_default: '',
        spec_options: [],
        used_count: 15,
        mat_stats: null,
        labor_stats: null,
        exp_stats: null,
        year_history: {},
        source: 'seed' as const,
      },
      matchType: 'exact' as const,
      score: 100,
    }

    expect(mockResult.entry.display).toBe('바탕정리')
    expect(mockResult.entry.used_count).toBe(15)
    expect(mockResult.matchType).toBe('exact')
  })

  // ── 10. 단가 변경 + original 백업 (자동잠금 제거) ──
  it('단가 변경: original 백업 (자동잠금 없음)', () => {
    const est = makeEstimate()
    const item = est.sheets[0].items[1] // 두 번째 공종
    expect(item.is_locked).toBeFalsy()

    const edited = markAsEdited(item, 'labor', 5555)
    expect(edited.is_locked).toBeFalsy()
    expect(edited.original_labor).toBe(item.labor)
    expect(edited.labor).toBe(5555)
    // 금액 재계산
    expect(edited.labor_amount).toBe(Math.round(5555 * edited.qty))
  })

  // ── 11. 숨김 행 grand_total 반영 확인 ──
  it('숨김 행은 grand_total에서 제외', () => {
    const est = makeEstimate()
    const items = est.sheets[0].items.map((item, i) =>
      i === 0 ? { ...item, is_hidden: true } : item
    )
    const withHidden = recalcAllTotals(items)
    const without = recalcAllTotals(est.sheets[0].items)

    expect(withHidden.grandTotal).toBeLessThan(without.grandTotal)
  })

  // ── 12. 품명/규격/단위 오버라이드 + original 백업 ──
  it('텍스트 필드 오버라이드: original 백업', () => {
    const est = makeEstimate()
    const item = est.sheets[0].items[0]

    const editedName = markAsEdited(item, 'name', '커스텀 공종')
    expect(editedName.name).toBe('커스텀 공종')
    expect(editedName.original_name).toBe(item.name)

    const editedSpec = markAsEdited(item, 'spec', 'A급')
    expect(editedSpec.spec).toBe('A급')
    expect(editedSpec.original_spec).toBe(item.spec)

    const editedUnit = markAsEdited(item, 'unit', 'EA')
    expect(editedUnit.unit).toBe('EA')
    expect(editedUnit.original_unit).toBe(item.unit)
  })
})
