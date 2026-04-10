import type { EstimateItem } from './types'

/**
 * 옵션에 따라 공종 단가/수량을 오버라이드
 *
 * v1 L535-575: applyUnitOver
 * - 사다리차/스카이차/폐기물: days → qty, unitPrice → 단가
 * - 벽체실링: wallM2가 있으면 qty = wallM2
 */
export function applyOverrides(
  items: EstimateItem[],
  options: {
    wallM2?: number
    ladder?: { days: number; unitPrice?: number }
    sky?: { days: number; unitPrice?: number }
    waste?: { days: number; unitPrice?: number }
  }
): EstimateItem[] {
  return items.map(item => {
    const updated = { ...item }

    // 벽체실링 수량 오버라이드
    if (item.name === '벽체실링' && options.wallM2 && options.wallM2 > 0) {
      updated.qty = options.wallM2
    }

    // 사다리차 (장비 → 경비 컬럼)
    if (item.name === '사다리차' && options.ladder) {
      updated.qty = options.ladder.days
      if (options.ladder.unitPrice) {
        updated.exp = options.ladder.unitPrice
      }
    }

    // 스카이차 (장비 → 경비 컬럼)
    if (item.name === '스카이차' && options.sky) {
      updated.qty = options.sky.days
      if (options.sky.unitPrice) {
        updated.exp = options.sky.unitPrice
      }
    }

    // 폐기물처리 (장비 → 경비 컬럼) — BASE 상수는 공백 없는 '폐기물처리'
    if (item.name === '폐기물처리' && options.waste) {
      updated.qty = options.waste.days
      if (options.waste.unitPrice) {
        updated.exp = options.waste.unitPrice
      }
    }

    // 금액 재계산
    updated.mat_amount = Math.round(updated.qty * updated.mat)
    updated.labor_amount = Math.round(updated.qty * updated.labor)
    updated.exp_amount = Math.round(updated.qty * updated.exp)
    updated.total = updated.mat_amount + updated.labor_amount + updated.exp_amount

    return updated
  })
}
