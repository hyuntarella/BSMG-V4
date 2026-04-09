import { OVERHEAD_RATE, PROFIT_RATE } from './constants'

/**
 * 칩 범위 계산 — v1 견적서.html L:1362 로직 이식
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
