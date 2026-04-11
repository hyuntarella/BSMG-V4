// ── 하자보증 옵션 ──
//
// 사장의 하자보증 판매 정책을 3개 옵션으로 고정한다.
// 포맷: "{하자보증기간}/{하자보증서}" (단위: 년)
//
//   - 8/5 — 복합방수 주력 (하자보증기간 8년 / 하자보증서 5년)
//   - 5/3 — 복합/우레탄 중간급
//   - 3/3 — 우레탄방수 주력
//
// 방침: warranty_option 이 단일 truth, 기존 warranty_years / warranty_bond 는 이 값에서
//       파생된 (읽기 전용) 필드로 동작한다. DB 스키마는 그대로 두고(warranty_years/bond)
//       warranty_option 만 런타임 UI/계산 전용 파생 필드로 추가.
//
// 하위호환: 구버전 sheet (warranty_option 미존재) → warranty_years + warranty_bond 에서
//          역으로 옵션을 추론. 어느 옵션에도 맞지 않으면 메서드별 기본값 사용.

import type { Method } from './types'

export const WARRANTY_OPTIONS = ['8/5', '5/3', '3/3'] as const
export type WarrantyOption = (typeof WARRANTY_OPTIONS)[number]

// 메서드별 기본 옵션 (규칙서 미설정 시 fallback)
export const DEFAULT_WARRANTY_OPTION_BY_METHOD: Record<Method, WarrantyOption> = {
  '복합': '8/5',
  '우레탄': '3/3',
}

// 옵션 → years / bond 파생
export function deriveYearsBond(option: WarrantyOption): { years: number; bond: number } {
  switch (option) {
    case '8/5':
      return { years: 8, bond: 5 }
    case '5/3':
      return { years: 5, bond: 3 }
    case '3/3':
      return { years: 3, bond: 3 }
  }
}

// years / bond → 옵션 역추론. 일치하는 옵션이 없으면 null.
export function deriveOptionFromYearsBond(
  years: number | null | undefined,
  bond: number | null | undefined,
): WarrantyOption | null {
  if (years === 8 && bond === 5) return '8/5'
  if (years === 5 && bond === 3) return '5/3'
  if (years === 3 && bond === 3) return '3/3'
  return null
}

// 옵션 선택 UI용 라벨.
export function formatWarrantyOption(option: WarrantyOption): string {
  const { years, bond } = deriveYearsBond(option)
  return `${years}년 / ${bond}년`
}

// sheet 에서 표시용 옵션 얻기 (warranty_option 우선, 없으면 years/bond 추론, 그것도 실패면 null).
export function getWarrantyOption(
  sheet: { warranty_option?: WarrantyOption | null; warranty_years?: number; warranty_bond?: number },
): WarrantyOption | null {
  if (sheet.warranty_option && WARRANTY_OPTIONS.includes(sheet.warranty_option)) {
    return sheet.warranty_option
  }
  return deriveOptionFromYearsBond(sheet.warranty_years, sheet.warranty_bond)
}
