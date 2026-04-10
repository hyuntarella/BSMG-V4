import type { EstimateItem } from './types'

/**
 * 우레탄 0.5mm 기준 단가 동기화 (#6 재설계)
 *
 * 메커니즘:
 *   0.5mm = 기준 단위. 각 공종 단가 = base05 × 배수.
 *
 *   - 복합방수 "노출 우레탄"  (1.5mm) → base05 × 3
 *   - 우레탄방수 "노출 우레탄 1차" (1mm)   → base05 × 2
 *   - 우레탄방수 "노출 우레탄 2차" (2mm)   → base05 × 4
 *
 * 벽체/상도는 배수 공식 대상이 아니라 1:1 복사 유지
 * (두 시트 간 단가 일관성 목적).
 *
 * 순수 함수. 부수 효과 없음.
 */

// ── 배수 상수 ──
export const URETHANE_MULTIPLIERS = {
  /** 복합 시트 "노출 우레탄" (중도 1.5mm) */
  complexNochul: 3,
  /** 우레탄 시트 "노출 우레탄 1차" (중도 1mm) */
  u1: 2,
  /** 우레탄 시트 "노출 우레탄 2차" (중도 2mm) */
  u2: 4,
} as const

// ── 공종명 정규화 키 (공백 제거) ──
const NAME = {
  complexNochul: '노출우레탄',
  u1: '노출우레탄1차',
  u2: '노출우레탄2차',
  wall: '벽체우레탄',
  top: '우레탄상도',
} as const

export interface UrethaneBase05 {
  mat: number
  labor: number
  exp: number
}

function canon(name: string): string {
  return name.replace(/\s+/g, '')
}

function r100(v: number): number {
  return Math.round(v / 100) * 100
}

function applyRowPrice(item: EstimateItem, mat: number, labor: number, exp: number): EstimateItem {
  const mat_amount = Math.round(mat * item.qty)
  const labor_amount = Math.round(labor * item.qty)
  const exp_amount = Math.round(exp * item.qty)
  return {
    ...item,
    mat,
    labor,
    exp,
    mat_amount,
    labor_amount,
    exp_amount,
    total: mat_amount + labor_amount + exp_amount,
  }
}

function findByCanon(items: EstimateItem[], canonName: string): EstimateItem | undefined {
  return items.find(i => canon(i.name) === canonName)
}

/**
 * 편집된 행(노출 우레탄 3종)에서 base05 역산.
 * 편집 대상이 아니면 null 반환.
 */
export function deriveBase05FromItem(item: EstimateItem): UrethaneBase05 | null {
  const c = canon(item.name)
  let divisor = 0
  if (c === NAME.u1) divisor = URETHANE_MULTIPLIERS.u1
  else if (c === NAME.u2) divisor = URETHANE_MULTIPLIERS.u2
  else if (c === NAME.complexNochul) divisor = URETHANE_MULTIPLIERS.complexNochul
  else return null

  return {
    mat: r100(item.mat / divisor),
    labor: r100(item.labor / divisor),
    exp: r100(item.exp / divisor),
  }
}

/**
 * 우레탄 시트의 1차 행(정본)에서 base05 힌트 추출.
 * 1차 행이 없으면 null — 동기화 불가 상태로 간주한다.
 */
export function deriveBase05Default(urethaneItems: EstimateItem[]): UrethaneBase05 | null {
  const u1 = findByCanon(urethaneItems, NAME.u1)
  if (!u1) return null
  return deriveBase05FromItem(u1)
}

/**
 * 0.5mm 기준 단가를 양쪽 시트의 노출 우레탄 3개 행에 적용.
 * 대상 행이 없는 시트는 그대로 반환.
 */
export function applyUrethaneBase05(
  complexItems: EstimateItem[],
  urethaneItems: EstimateItem[],
  base05: UrethaneBase05,
): { complex: EstimateItem[]; urethane: EstimateItem[] } {
  const mul = (n: number) => ({
    mat: r100(base05.mat * n),
    labor: r100(base05.labor * n),
    exp: r100(base05.exp * n),
  })

  const complexPrice = mul(URETHANE_MULTIPLIERS.complexNochul)
  const u1Price = mul(URETHANE_MULTIPLIERS.u1)
  const u2Price = mul(URETHANE_MULTIPLIERS.u2)

  const complex = complexItems.map(item => {
    if (canon(item.name) === NAME.complexNochul) {
      return applyRowPrice(item, complexPrice.mat, complexPrice.labor, complexPrice.exp)
    }
    return item
  })

  const urethane = urethaneItems.map(item => {
    const c = canon(item.name)
    if (c === NAME.u1) return applyRowPrice(item, u1Price.mat, u1Price.labor, u1Price.exp)
    if (c === NAME.u2) return applyRowPrice(item, u2Price.mat, u2Price.labor, u2Price.exp)
    return item
  })

  return { complex, urethane }
}

/**
 * 벽체 우레탄 · 우레탄 상도를 두 시트 간 1:1 복사.
 * direction = 'urethane-to-complex'  → 우레탄 시트 값을 복합 시트에 반영
 * direction = 'complex-to-urethane'  → 복합 시트 값을 우레탄 시트에 반영
 */
export function syncWallAndTop(
  complexItems: EstimateItem[],
  urethaneItems: EstimateItem[],
  direction: 'urethane-to-complex' | 'complex-to-urethane',
): { complex: EstimateItem[]; urethane: EstimateItem[] } {
  if (direction === 'urethane-to-complex') {
    const wall = findByCanon(urethaneItems, NAME.wall)
    const top = findByCanon(urethaneItems, NAME.top)
    const complex = complexItems.map(item => {
      const c = canon(item.name)
      if (c === NAME.wall && wall) return applyRowPrice(item, wall.mat, wall.labor, wall.exp)
      if (c === NAME.top && top) return applyRowPrice(item, top.mat, top.labor, top.exp)
      return item
    })
    return { complex, urethane: urethaneItems }
  }
  // complex-to-urethane
  const wall = findByCanon(complexItems, NAME.wall)
  const top = findByCanon(complexItems, NAME.top)
  const urethane = urethaneItems.map(item => {
    const c = canon(item.name)
    if (c === NAME.wall && wall) return applyRowPrice(item, wall.mat, wall.labor, wall.exp)
    if (c === NAME.top && top) return applyRowPrice(item, top.mat, top.labor, top.exp)
    return item
  })
  return { complex: complexItems, urethane }
}

/**
 * 종합 동기화 엔트리 — 우레탄 시트의 현재 상태를 정본으로 간주.
 *
 * 동작:
 *   1. 우레탄 1차 → base05 역산
 *   2. applyUrethaneBase05 로 노출 우레탄 3종 재설정
 *   3. 벽체/상도를 우레탄 시트에서 복합 시트로 복사
 *
 * 입력에 노출 우레탄 1차가 없으면 원본 그대로 반환.
 *
 * @returns 복합 시트 items (기존 호출 호환)
 */
export function syncUrethaneItems(
  complexItems: EstimateItem[],
  urethaneItems: EstimateItem[],
): EstimateItem[] {
  const base05 = deriveBase05Default(urethaneItems)
  if (!base05) return complexItems

  // 벽체/상도가 우레탄 시트에 존재하는지도 확인 (v1 호환: 전부 있어야 동기화)
  if (!findByCanon(urethaneItems, NAME.wall)) return complexItems
  if (!findByCanon(urethaneItems, NAME.top)) return complexItems

  const { complex: afterBase05 } = applyUrethaneBase05(complexItems, urethaneItems, base05)
  const { complex } = syncWallAndTop(afterBase05, urethaneItems, 'urethane-to-complex')
  return complex
}
