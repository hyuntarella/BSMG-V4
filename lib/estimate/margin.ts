import type { Method } from './types'
import { getCostPerM2 } from './cost'

/**
 * 마진율 계산
 * getMargin('복합', 150, 5250000) → 52.3...
 */
export function getMargin(method: Method, m2: number, grandTotal: number): number {
  if (grandTotal === 0) return 0
  const costTotal = getCostPerM2(method, m2) * m2
  return ((grandTotal - costTotal) / grandTotal) * 100
}
