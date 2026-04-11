import type { EstimateItem } from './types'

/**
 * 공종 단가/수량을 옵션으로 오버라이드.
 *
 * #10 이후: 장비(사다리차/스카이차/폐기물처리/드라이비트하부절개)는
 * buildItems.appendEquipmentRows에서 별도로 처리하므로 여기서는 제외한다.
 * 현재는 벽체실링 수량 오버라이드만 담당.
 */
export function applyOverrides(
  items: EstimateItem[],
  options: {
    wallM2?: number
  }
): EstimateItem[] {
  return items.map(item => {
    const updated = { ...item }

    // 벽체실링 수량 오버라이드
    if (item.name === '벽체실링' && options.wallM2 && options.wallM2 > 0) {
      updated.qty = options.wallM2
    }

    // 금액 재계산
    updated.mat_amount = Math.round(updated.qty * updated.mat)
    updated.labor_amount = Math.round(updated.qty * updated.labor)
    updated.exp_amount = Math.round(updated.qty * updated.exp)
    updated.total = updated.mat_amount + updated.labor_amount + updated.exp_amount

    return updated
  })
}
