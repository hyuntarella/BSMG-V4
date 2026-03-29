import type { UnitCost, PriceMatrixRaw, Method } from './types'
import { lerpArr } from '@/lib/utils/lerp'

/**
 * P매트릭스에서 해당 면적대·공법·평단가의 단가 배열을 가져온다.
 * 정확히 일치하는 평단가가 없으면 양쪽 가장 가까운 값 사이를 보간한다.
 *
 * getPD(matrix, '50~100평', '복합', 37500) → UnitCost[11]
 */
export function getPD(
  matrix: PriceMatrixRaw,
  areaRange: string,
  method: Method,
  pricePerPyeong: number
): UnitCost[] {
  const methodData = matrix[areaRange]?.[method]
  if (!methodData || Object.keys(methodData).length === 0) {
    // P매트릭스 비어있으면 기본 0값 배열 반환 (11개 공종)
    console.warn(`P매트릭스에 ${areaRange}/${method} 데이터 없음 — 기본값 사용`)
    return Array.from({ length: 11 }, (): UnitCost => [0, 0, 0])
  }

  const prices = Object.keys(methodData)
    .map(Number)
    .sort((a, b) => a - b)

  // 정확히 일치
  if (methodData[String(pricePerPyeong)]) {
    return methodData[String(pricePerPyeong)]
  }

  // 범위 밖: 가장 가까운 값 사용
  if (pricePerPyeong <= prices[0]) {
    return methodData[String(prices[0])]
  }
  if (pricePerPyeong >= prices[prices.length - 1]) {
    return methodData[String(prices[prices.length - 1])]
  }

  // 보간: 양쪽 가장 가까운 값 찾기
  let lo = prices[0]
  let hi = prices[prices.length - 1]
  for (const p of prices) {
    if (p <= pricePerPyeong) lo = p
    if (p >= pricePerPyeong && hi >= p) hi = p
  }

  if (lo === hi) {
    return methodData[String(lo)]
  }

  const t = (pricePerPyeong - lo) / (hi - lo)
  const loData = methodData[String(lo)]
  const hiData = methodData[String(hi)]

  return loData.map((_, i) => lerpArr(loData[i], hiData[i], t))
}
