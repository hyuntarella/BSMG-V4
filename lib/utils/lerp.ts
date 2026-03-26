import type { UnitCost } from '@/lib/estimate/types'

/**
 * 두 UnitCost 배열 사이를 선형 보간
 * t=0이면 a, t=1이면 b
 */
export function lerpArr(a: UnitCost, b: UnitCost, t: number): UnitCost {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}
