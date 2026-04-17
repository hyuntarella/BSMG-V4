import type { Estimate, EstimateItem, EstimateSheet } from '@/lib/estimate/types'
import type { DetailSheet, DetailItem, WorkColumn } from './types'

const DEFAULT_OVERHEAD_RATE = 0.03
const DEFAULT_PROFIT_RATE = 0.06

/** 0값 → undefined 변환 (빈 셀 렌더 — Q10 PM 확정). 둘 다 0이면 WorkColumn 자체 생략. */
function workColumn(unitPrice: number, amount: number): WorkColumn | undefined {
  if (!unitPrice && !amount) return undefined
  return {
    unitPrice: unitPrice || undefined,
    amount: amount || undefined,
  }
}

function mapItem(item: EstimateItem, note: string): DetailItem {
  const totalUnitPrice = item.mat + item.labor + item.exp
  const totalAmount = item.lump_amount ?? item.total

  return {
    kind: 'item',
    name: item.name,
    spec: item.spec || undefined,
    unit: item.unit || undefined,
    quantity: item.qty || undefined,
    material: workColumn(item.mat, item.mat_amount),
    labor: workColumn(item.labor, item.labor_amount),
    expense: workColumn(item.exp, item.exp_amount),
    total: workColumn(totalUnitPrice, totalAmount),
    note: note || undefined,
  }
}

function buildConstructionName(estimate: Estimate, sheet: EstimateSheet): string {
  const parts = [
    estimate.site_name,
    `${sheet.type}방수`,
    sheet.plan ?? sheet.title,
  ].filter((p): p is string => Boolean(p))
  return parts.join(' ').trim()
}

/**
 * Estimate 도메인 모델 → 을지(DetailSheet) 렌더 데이터 변환.
 *
 * @param estimate — 음성견적 Estimate state
 * @param sheetIndex — estimate.sheets 배열 인덱스 (0 base)
 * @returns DetailSheet — Detail 컴포넌트에 그대로 전달 가능
 *
 * @throws sheetIndex 범위 밖이면 Error
 *
 * 적용 규칙 (Phase 6.3.4 PM 확정):
 * - 공사명 = "{site_name} {type}방수 {plan|title}".trim()
 * - note = sheet.warranty_years 있으면 "{years}년", 없으면 ""
 * - CalloutRow 미생성 (범위 제외 — 6.3.5+)
 * - pageNumber = `${sheetIndex+2}/${sheets.length+1}` (갑지 1장 + 을지 N장 합산)
 * - lump_amount 있으면 total.amount = lump_amount, 다른 amount 원본 유지
 * - is_hidden=true 항목 제외
 * - 0값 컬럼은 WorkColumn undefined (빈 셀)
 * - overheadRate/profitRate 상수 (DB 연동은 Phase 6.4)
 */
export function toDetailSheet(estimate: Estimate, sheetIndex: number): DetailSheet {
  const sheet = estimate.sheets[sheetIndex]
  if (!sheet) {
    throw new Error(
      `toDetailSheet: sheetIndex ${sheetIndex} out of range (sheets.length=${estimate.sheets.length})`
    )
  }

  const note = sheet.warranty_years ? `${sheet.warranty_years}년` : ''
  const visibleItems = sheet.items.filter(i => !i.is_hidden)
  const rows = visibleItems.map(i => mapItem(i, note))

  return {
    constructionName: buildConstructionName(estimate, sheet),
    rows,
    overheadRate: DEFAULT_OVERHEAD_RATE,
    profitRate: DEFAULT_PROFIT_RATE,
    pageNumber: `${sheetIndex + 2}/${estimate.sheets.length + 1}`,
  }
}
