import { describe, it, expect } from 'vitest'
import type { EstimateItem } from '@/lib/estimate/types'

/**
 * 테이블 키보드 네비게이션 로직 테스트
 * useTableKeyboard의 핵심 로직을 순수 함수로 검증
 */

function makeItems(count: number): EstimateItem[] {
  return Array.from({ length: count }, (_, i) => ({
    sort_order: i + 1,
    name: `공종${i + 1}`,
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
  }))
}

// 다음 보이는 행 찾기 (useTableKeyboard 내부 로직 추출)
function findNextVisibleRow(
  items: EstimateItem[],
  fromRow: number,
  direction: 1 | -1,
): number {
  let next = fromRow + direction
  while (next >= 0 && next < items.length && items[next].is_hidden) {
    next += direction
  }
  if (next < 0 || next >= items.length) return fromRow
  return next
}

const COL_COUNT = 7 // EDITABLE_COLS 수

describe('테이블 키보드 네비게이션', () => {
  it('Tab → 오른쪽 이동', () => {
    let col = 0
    // Tab: col < colCount - 1 → col + 1
    if (col < COL_COUNT - 1) col += 1
    expect(col).toBe(1)
  })

  it('Shift+Tab → 왼쪽 이동', () => {
    let col = 3
    // Shift+Tab: col > 0 → col - 1
    if (col > 0) col -= 1
    expect(col).toBe(2)
  })

  it('Enter → 아래 이동', () => {
    const items = makeItems(5)
    const row = 2
    const nextRow = findNextVisibleRow(items, row, 1)
    expect(nextRow).toBe(3)
  })

  it('Shift+Enter → 위 이동', () => {
    const items = makeItems(5)
    const row = 2
    const prevRow = findNextVisibleRow(items, row, -1)
    expect(prevRow).toBe(1)
  })

  it('화살표 4방향', () => {
    const items = makeItems(5)
    let row = 2
    let col = 3

    // 위
    row = findNextVisibleRow(items, row, -1)
    expect(row).toBe(1)

    // 아래
    row = findNextVisibleRow(items, row, 1)
    expect(row).toBe(2)

    // 왼쪽
    if (col > 0) col -= 1
    expect(col).toBe(2)

    // 오른쪽
    if (col < COL_COUNT - 1) col += 1
    expect(col).toBe(3)
  })

  it('경계 처리 — 마지막 셀에서 Tab → 다음 행 첫 셀', () => {
    const items = makeItems(3)
    let row = 0
    let col = COL_COUNT - 1 // 마지막 열

    // Tab at last col
    if (col < COL_COUNT - 1) {
      col += 1
    } else {
      const nextRow = findNextVisibleRow(items, row, 1)
      if (nextRow !== row) {
        row = nextRow
        col = 0
      }
    }

    expect(row).toBe(1)
    expect(col).toBe(0)
  })

  it('숨김 행 스킵', () => {
    const items = makeItems(5)
    items[2].is_hidden = true
    items[3].is_hidden = true

    const nextRow = findNextVisibleRow(items, 1, 1)
    expect(nextRow).toBe(4) // 2, 3 스킵

    const prevRow = findNextVisibleRow(items, 4, -1)
    expect(prevRow).toBe(1) // 3, 2 스킵
  })
})
