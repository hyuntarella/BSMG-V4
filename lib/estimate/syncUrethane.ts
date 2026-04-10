import type { EstimateItem } from './types'

/**
 * 우레탄 동기화 (#13)
 *
 * v1 L1457-1509: syncUre05
 * 복합 시트의 우레탄 관련 공종(노출우레탄, 벽체우레탄, 우레탄상도)을
 * 우레탄 시트의 단가로 자동 일치시킨다.
 *
 * v1 동기화 규칙:
 * - 복합 "노출 우레탄" ← 우레탄 1차+2차 합성: mat=u1.mat/2*3, labor=(u1+u2)/2, exp=(u1+u2)/2
 * - 복합 "벽체 우레탄" ← 우레탄 "벽체 우레탄" 그대로
 * - 복합 "우레탄 상도" ← 우레탄 "우레탄 상도" 그대로
 *
 * 순수 함수. 부수 효과 없음.
 */

const URETHANE_1ST = '노출우레탄1차'
const URETHANE_2ND = '노출우레탄2차'
const WALL_URETHANE = '벽체우레탄'
const TOP_COAT = '우레탄상도'

// 복합 시트 공종명 (공백 포함)
const COMPLEX_NOCHUL = '노출우레탄'
const COMPLEX_WALL = '벽체우레탄'
const COMPLEX_TOP = '우레탄상도'

function canon(name: string): string {
  return name.replace(/\s+/g, '')
}

function r100(v: number): number {
  return Math.round(v / 100) * 100
}

interface UrethaneSourcePrices {
  u1: { mat: number; labor: number; exp: number }
  u2: { mat: number; labor: number; exp: number }
  wall: { mat: number; labor: number; exp: number }
  top: { mat: number; labor: number; exp: number }
}

function extractUrethaneSheetPrices(urethaneItems: EstimateItem[]): UrethaneSourcePrices | null {
  let u1: EstimateItem | undefined
  let u2: EstimateItem | undefined
  let wall: EstimateItem | undefined
  let top: EstimateItem | undefined

  for (const item of urethaneItems) {
    const c = canon(item.name)
    if (c === URETHANE_1ST) u1 = item
    else if (c === URETHANE_2ND) u2 = item
    else if (c === WALL_URETHANE) wall = item
    else if (c === TOP_COAT) top = item
  }

  if (!u1 || !u2 || !wall || !top) return null

  return {
    u1: { mat: u1.mat, labor: u1.labor, exp: u1.exp },
    u2: { mat: u2.mat, labor: u2.labor, exp: u2.exp },
    wall: { mat: wall.mat, labor: wall.labor, exp: wall.exp },
    top: { mat: top.mat, labor: top.labor, exp: top.exp },
  }
}

export function syncUrethaneItems(
  complexItems: EstimateItem[],
  urethaneItems: EstimateItem[],
): EstimateItem[] {
  const prices = extractUrethaneSheetPrices(urethaneItems)
  if (!prices) return complexItems

  // v1 규칙: 노출우레탄 = u1+u2 합성, 벽체/상도 = 그대로
  const syncMap = new Map<string, { mat: number; labor: number; exp: number }>()

  // 노출 우레탄: mat=u1.mat/2*3, labor=(u1+u2)/2, exp=(u1+u2)/2
  syncMap.set(COMPLEX_NOCHUL, {
    mat: r100(prices.u1.mat / 2 * 3),
    labor: r100((prices.u1.labor + prices.u2.labor) / 2),
    exp: r100((prices.u1.exp + prices.u2.exp) / 2),
  })

  syncMap.set(COMPLEX_WALL, prices.wall)
  syncMap.set(COMPLEX_TOP, prices.top)

  return complexItems.map(item => {
    const source = syncMap.get(canon(item.name))
    if (!source) return item

    const mat_amount = Math.round(source.mat * item.qty)
    const labor_amount = Math.round(source.labor * item.qty)
    const exp_amount = Math.round(source.exp * item.qty)

    return {
      ...item,
      mat: source.mat,
      labor: source.labor,
      exp: source.exp,
      mat_amount,
      labor_amount,
      exp_amount,
      total: mat_amount + labor_amount + exp_amount,
    }
  })
}
