import { OVERHEAD_RATE, PROFIT_RATE } from './constants'
import { getAR } from './areaRange'
import type { Method, PriceMatrixRaw } from './types'

/**
 * 칩 범위 계산 — v1 견적서.html L:1362 로직 이식 (레거시, 테스트 호환용)
 *
 * @param costPerM2 - m² 당 원가 (getCostPerM2 결과)
 * @param isMobile  - 모바일 여부 (step 조절)
 * @returns m² 단가 배열 [minP, minP+step, ..., maxP]
 */
export function calcChipRange(costPerM2: number, isMobile: boolean): number[] {
  if (costPerM2 <= 0) return []

  const step = isMobile ? 2000 : 1000
  const overheadProfit = 1 + OVERHEAD_RATE + PROFIT_RATE

  const minP = Math.ceil(costPerM2 / (overheadProfit * 0.6) / step) * step // 마진 40%
  const maxP = Math.ceil(costPerM2 / (overheadProfit * 0.45) / step) * step // 마진 55%

  const chips: number[] = []
  for (let p = minP; p <= maxP; p += step) {
    chips.push(p)
  }
  return chips
}

/**
 * price_matrix에서 사용 가능한 평단가 목록 추출
 *
 * @param priceMatrix - 서버에서 로드된 PriceMatrixRaw
 * @param areaM2      - 면적 (m²)
 * @param method      - 공법 ('복합' | '우레탄')
 * @returns 오름차순 정렬된 평단가 배열 (예: [38000, 39000, ..., 44000])
 */
export function getAvailableChips(
  priceMatrix: PriceMatrixRaw,
  areaM2: number,
  method: Method,
): number[] {
  const ar = getAR(areaM2 || 100)
  const methodData = priceMatrix[ar]?.[method]
  if (!methodData) return []
  return Object.keys(methodData).map(Number).sort((a, b) => a - b)
}

/**
 * 마진율 계산 (칩 선택 시 표시용)
 *
 * @param pricePerM2 - 선택된 m² 단가
 * @param costPerM2  - m² 당 원가
 * @returns 마진율 (%)
 */
export function getChipMarginPercent(
  pricePerM2: number,
  costPerM2: number,
): number {
  if (pricePerM2 === 0) return 0
  // 총 매출 = pricePerM2 * (1 + 공과잡비 3% + 이윤 6%)
  const revenue = pricePerM2 * (1 + OVERHEAD_RATE + PROFIT_RATE)
  return Math.round(((revenue - costPerM2) / revenue) * 100)
}
