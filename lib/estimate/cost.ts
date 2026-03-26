import type { Method } from './types'
import { COST_TABLE } from './constants'
import { getAR } from './areaRange'

/**
 * m² 당 원가 조회
 * getCostPerM2('복합', 150) → 12000
 */
export function getCostPerM2(method: Method, m2: number): number {
  const ar = getAR(m2)
  const key = method === '복합' ? 'complex' : 'urethane'
  return COST_TABLE[key][ar] ?? 0
}
