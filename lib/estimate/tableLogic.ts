import type { EstimateItem, CalcResult } from './types'
import { calc } from './calc'

/**
 * 행 금액 재계산: 단가 × 수량 = 금액, 합계 = 3요소 합
 * calc.ts는 수정하지 않음 — 이 함수는 단일 행 재계산 전용
 */
export function recalcRow(item: EstimateItem): EstimateItem {
  const mat_amount = Math.round(item.qty * item.mat)
  const labor_amount = Math.round(item.qty * item.labor)
  const exp_amount = Math.round(item.qty * item.exp)
  const total = mat_amount + labor_amount + exp_amount
  return { ...item, mat_amount, labor_amount, exp_amount, total }
}

/**
 * 전체 합계 재계산: 소계 / 공과잡비 3% / 이윤 6% / 단수정리
 * lib/estimate/calc.ts의 calc() 함수를 그대로 사용
 */
export function recalcAllTotals(items: EstimateItem[]): CalcResult {
  return calc(items.filter(i => !i.is_hidden))
}

type EditableNumericField = 'qty' | 'mat' | 'labor' | 'exp'
type EditableTextField = 'name' | 'spec' | 'unit'

/**
 * 셀 편집 커밋: original_* 백업 + locked=true + 새 값 설정
 * - 백업 중복 방지: original_* 이미 있으면 덮어쓰지 않음
 * - Phase 3 updateItemText 패턴 그대로
 */
export function markAsEdited(
  item: EstimateItem,
  field: EditableNumericField | EditableTextField,
  value: number | string,
): EstimateItem {
  const updated = { ...item, is_locked: true }

  switch (field) {
    case 'qty':
      if (updated.original_qty == null) updated.original_qty = item.qty
      updated.qty = value as number
      break
    case 'mat':
      if (updated.original_mat == null) updated.original_mat = item.mat
      updated.mat = value as number
      break
    case 'labor':
      if (updated.original_labor == null) updated.original_labor = item.labor
      updated.labor = value as number
      break
    case 'exp':
      if (updated.original_exp == null) updated.original_exp = item.exp
      updated.exp = value as number
      break
    case 'name':
      if (!item.original_name) updated.original_name = item.name
      updated.name = value as string
      break
    case 'spec':
      if (!item.original_spec) updated.original_spec = item.spec
      updated.spec = value as string
      break
    case 'unit':
      if (!item.original_unit) updated.original_unit = item.unit
      updated.unit = value as string
      break
  }

  // 숫자 필드 변경 시 금액 재계산
  if (field === 'qty' || field === 'mat' || field === 'labor' || field === 'exp') {
    return recalcRow(updated)
  }

  return updated
}
