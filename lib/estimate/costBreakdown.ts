/**
 * 상세 원가/마진 계산 엔진
 *
 * 30/50/100평 브레이크포인트 사이를 선형 보간하여 원가 산출.
 * 재료비 20% 인상 적용 후 현 마진율 계산.
 * 마진율 → 평단가 역산 지원.
 */

import {
  COST_BREAKPOINTS,
  LABOR_COST_PER_PUM,
  MATERIAL_INCREASE_RATE,
  type CostBreakpoint,
} from './constants'

/** 원가 상세 내역 */
export interface CostBreakdown {
  hado: number
  jungdo15: number
  sangdo: number
  sheet: number
  misc: number
  labor: number      // pum × LABOR_COST_PER_PUM
  pum: number
  /** 재료비 소계 (hado + jungdo15 + sangdo + sheet) */
  materialTotal: number
  /** 전체 원가 (재료비 + 인건비 + 경비잡비) */
  total: number
}

/** 마진 표시 데이터 */
export interface MarginDisplay {
  /** 현재 마진율 (재료비 인상 후) */
  current: number
  /** 인상 전 마진율 */
  beforeIncrease: number
  /** 포맷된 문자열: "52% (인상 전 63%)" */
  formatted: string
}

/**
 * 면적(평) 기준 원가 산출 (재료비 인상 전)
 * 30/50/100평 사이 선형 보간
 */
export function getCostBreakdown(pyeong: number): CostBreakdown {
  const bp = COST_BREAKPOINTS
  const interpolated = interpolateBreakpoint(pyeong, bp)

  const materialTotal = interpolated.hado + interpolated.jungdo15 + interpolated.sangdo + interpolated.sheet
  const labor = interpolated.pum * LABOR_COST_PER_PUM

  return {
    ...interpolated,
    labor,
    materialTotal,
    total: materialTotal + labor + interpolated.misc,
  }
}

/**
 * 재료비 인상 적용한 원가 산출
 */
export function getAdjustedCost(pyeong: number): CostBreakdown {
  const base = getCostBreakdown(pyeong)
  const rate = 1 + MATERIAL_INCREASE_RATE

  const hado = Math.round(base.hado * rate)
  const jungdo15 = Math.round(base.jungdo15 * rate)
  const sangdo = Math.round(base.sangdo * rate)
  const sheet = Math.round(base.sheet * rate)
  const materialTotal = hado + jungdo15 + sangdo + sheet

  return {
    ...base,
    hado,
    jungdo15,
    sangdo,
    sheet,
    materialTotal,
    total: materialTotal + base.labor + base.misc,
  }
}

/**
 * 평단가와 면적으로 마진율 계산
 * @param pricePerM2 ㎡당 단가 (내부 단가)
 * @param pyeong 면적 (평)
 */
export function getMarginDisplay(pricePerM2: number, pyeong: number): MarginDisplay {
  const m2 = pyeong * 3.306
  const revenue = pricePerM2 * m2

  // 인상 후 원가
  const adjustedCost = getAdjustedCost(pyeong)
  const current = revenue > 0
    ? Math.round((revenue - adjustedCost.total) / revenue * 100)
    : 0

  // 인상 전 원가
  const baseCost = getCostBreakdown(pyeong)
  const beforeIncrease = revenue > 0
    ? Math.round((revenue - baseCost.total) / revenue * 100)
    : 0

  return {
    current,
    beforeIncrease,
    formatted: `${current}% (인상 전 ${beforeIncrease}%)`,
  }
}

/**
 * 목표 마진율 → 평단가(㎡당) 역산
 * @param targetMarginPercent 목표 마진율 (예: 50)
 * @param pyeong 면적 (평)
 * @returns ㎡당 단가 (1000원 올림)
 */
export function findPriceForMargin(targetMarginPercent: number, pyeong: number): number {
  const adjustedCost = getAdjustedCost(pyeong)
  const m2 = pyeong * 3.306
  const targetMargin = targetMarginPercent / 100

  // revenue × (1 - margin) = cost → revenue = cost / (1 - margin)
  if (targetMargin >= 1) return 0
  const requiredRevenue = adjustedCost.total / (1 - targetMargin)
  const pricePerM2 = requiredRevenue / m2

  // 1000원 올림
  return Math.ceil(pricePerM2 / 1000) * 1000
}

/**
 * ㎡당 단가 → 평당 단가 (외부 고객 제시용)
 */
export function pricePerM2ToPyeong(pricePerM2: number, m2: number): number {
  const pyeong = m2 / 3.306
  const total = pricePerM2 * m2
  return pyeong > 0 ? Math.round(total / pyeong) : 0
}

// ── 내부 헬퍼 ──

function interpolateBreakpoint(
  pyeong: number,
  breakpoints: CostBreakpoint[],
): Omit<CostBreakdown, 'materialTotal' | 'total' | 'labor'> & { pyeong: number } {
  const bp = breakpoints

  // 최소 미만: 첫 브레이크포인트 사용
  if (pyeong <= bp[0].pyeong) {
    return { ...bp[0] }
  }

  // 최대 초과: 마지막 브레이크포인트 사용
  if (pyeong >= bp[bp.length - 1].pyeong) {
    return { ...bp[bp.length - 1] }
  }

  // 보간
  for (let i = 0; i < bp.length - 1; i++) {
    if (pyeong >= bp[i].pyeong && pyeong <= bp[i + 1].pyeong) {
      const t = (pyeong - bp[i].pyeong) / (bp[i + 1].pyeong - bp[i].pyeong)
      return {
        hado: Math.round(lerp(bp[i].hado, bp[i + 1].hado, t)),
        jungdo15: Math.round(lerp(bp[i].jungdo15, bp[i + 1].jungdo15, t)),
        sangdo: Math.round(lerp(bp[i].sangdo, bp[i + 1].sangdo, t)),
        sheet: Math.round(lerp(bp[i].sheet, bp[i + 1].sheet, t)),
        misc: Math.round(lerp(bp[i].misc, bp[i + 1].misc, t)),
        pum: Math.round(lerp(bp[i].pum, bp[i + 1].pum, t) * 10) / 10,
        pyeong,
      }
    }
  }

  return { ...bp[0] }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
