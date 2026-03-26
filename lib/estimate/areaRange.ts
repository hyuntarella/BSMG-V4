import type { AreaRange } from './types'
import { AREA_BOUNDARIES } from './constants'

/**
 * m² → 면적대 문자열
 * getAR(150) → '50~100평' (150m² ≈ 45.4평)
 */
export function getAR(m2: number): AreaRange {
  const pyeong = m2 / 3.306
  for (const b of AREA_BOUNDARIES) {
    if (pyeong < b.max) return b.label
  }
  return '200평이상'
}
