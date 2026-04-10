import type { EstimateItem, CalcResult } from './types'
import { OVERHEAD_RATE, PROFIT_RATE, ROUND_UNIT } from './constants'

/**
 * 소계 → 공과잡비 3% → 기업이윤 6% → 10만원 절사
 *
 * 장비류(isEquipment=true)는 소계에 포함되지만
 * 공과잡비/기업이윤 계산에서는 제외한다.
 */
export function calc(items: EstimateItem[]): CalcResult {
  const subtotal = items.reduce((s, it) => s + it.total, 0)

  // 공과잡비/기업이윤 기준: 장비 + lump 제외 소계
  const baseForRate = items
    .filter(it => !it.is_equipment && !it.lump_amount)
    .reduce((s, it) => s + it.total, 0)

  const overhead = Math.round(baseForRate * OVERHEAD_RATE)
  const profit = Math.round(baseForRate * PROFIT_RATE)
  const totalBeforeRound = subtotal + overhead + profit

  const grandTotal = Math.floor(totalBeforeRound / ROUND_UNIT) * ROUND_UNIT

  return { subtotal, overhead, profit, totalBeforeRound, grandTotal }
}
