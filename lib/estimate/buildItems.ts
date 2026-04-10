import type {
  EstimateItem,
  BuildItemsInput,
  UnitCost,
  CalcResult,
  EstimateSheet,
} from './types'
import { COMPLEX_BASE, URETHANE_BASE, DEFAULT_EQUIPMENT_PRICES } from './constants'
import { getAR } from './areaRange'
import { getPD } from './priceData'
import { applyOverrides } from './applyOverrides'
import { calc } from './calc'

/**
 * 핵심 함수: 면적·공법·평단가 → 견적서 공종 배열 + 계산 결과
 *
 * v1 L392-534 로직을 TypeScript로 이식
 *
 * 1. 면적대(getAR) → P매트릭스에서 단가 배열 조회(getPD)
 * 2. BASE 배열과 단가 배열을 결합 → EstimateItem[] 생성
 * 3. 기본 공종: qty = m2, 장비류: qty = 옵션값 or 기본값
 * 4. applyOverrides로 옵션 적용
 * 5. calc로 소계→공과잡비→기업이윤→절사
 */
export function buildItems(input: BuildItemsInput): {
  items: EstimateItem[]
  calcResult: CalcResult
} {
  const { method, m2, wallM2 = 0, pricePerPyeong, priceMatrix, options = {} } = input
  console.log('[BUILD] buildItems enter', { method, m2, wallM2, pricePerPyeong })

  const areaRange = getAR(m2)
  const unitCosts = getPD(priceMatrix, areaRange, method, pricePerPyeong)
  const base = method === '복합' ? COMPLEX_BASE : URETHANE_BASE

  // BASE + P매트릭스 단가 결합
  let items: EstimateItem[] = base.map((b, i) => {
    const costs: UnitCost = unitCosts[i] ?? [0, 0, 0]
    const [mat, labor, exp] = costs

    // 수량 결정 (v1 원본 로직)
    let qty = 0
    if (b.isEquipment) {
      // 장비류: 기본 0 (옵션에서 오버라이드)
      if (b.name === '사다리차') qty = options.ladder?.days ?? 0
      else if (b.name === '스카이차') qty = options.sky?.days ?? 0
      else if (b.name === '폐기물처리') qty = options.waste?.days ?? 0
      else if (b.name === '드라이비트하부절개') qty = options.dryvit ? 1 : 0
    } else if (b.isWall) {
      qty = wallM2
    } else if (b.isArea) {
      // 하도 프라이머, 우레탄 상도: 면적 + 벽체면적
      if (b.name === '하도 프라이머' || b.name === '우레탄 상도') {
        qty = m2 + wallM2
      } else {
        qty = m2
      }
    } else if (b.unit === '식') {
      // 식 항목: 수량 고정 1
      qty = 1
    }

    // 장비류에 P매트릭스 단가가 0이면 기본 단가 사용
    let finalLabor = labor
    if (b.isEquipment && labor === 0) {
      if (b.name === '사다리차') finalLabor = options.ladder?.unitPrice ?? DEFAULT_EQUIPMENT_PRICES.ladder
      else if (b.name === '스카이차') finalLabor = options.sky?.unitPrice ?? DEFAULT_EQUIPMENT_PRICES.sky
      else if (b.name === '폐기물처리') finalLabor = options.waste?.unitPrice ?? DEFAULT_EQUIPMENT_PRICES.waste
    }

    // 식 항목 (장비 제외): 단가 비움, 금액에 직접 (P매트릭스 값 = 금액)
    const isShikItem = b.unit === '식' && !b.isEquipment
    const matAmount = isShikItem ? mat : Math.round(qty * mat)
    const laborAmount = isShikItem ? finalLabor : Math.round(qty * finalLabor)
    const expAmount = isShikItem ? exp : Math.round(qty * exp)

    return {
      sort_order: i + 1,
      name: b.name,
      spec: b.spec,
      unit: b.unit,
      qty,
      mat: isShikItem ? 0 : mat,
      labor: isShikItem ? 0 : finalLabor,
      exp: isShikItem ? 0 : exp,
      mat_amount: matAmount,
      labor_amount: laborAmount,
      exp_amount: expAmount,
      total: matAmount + laborAmount + expAmount,
      is_base: b.isBase ?? false,
      is_equipment: b.isEquipment ?? false,
      is_fixed_qty: b.isFixedQty ?? false,
    }
  })

  // 옵션 오버라이드 적용
  items = applyOverrides(items, {
    wallM2,
    ladder: options.ladder,
    sky: options.sky,
    waste: options.waste,
  })

  // 빈 행(이름 없음, 수량 0) 제거 — 장비류는 qty=0이면 제거
  items = items.filter(item => {
    if (!item.name) return false
    if (item.is_equipment && item.qty === 0) return false
    return true
  })

  // sort_order 재정렬
  items = items.map((item, i) => ({ ...item, sort_order: i + 1 }))

  // Lock 보존: is_locked=true인 항목은 기존 단가 유지
  if (input.preserveLockedItems?.length) {
    const lockedMap = new Map<string, EstimateItem>()
    for (const l of input.preserveLockedItems) {
      if (l.is_locked) lockedMap.set(l.name.replace(/\s+/g, ''), l)
    }

    items = items.map(item => {
      const locked = lockedMap.get(item.name.replace(/\s+/g, ''))
      if (!locked) return item
      const mat = locked.mat
      const labor = locked.labor
      const exp = locked.exp
      const mat_amount = Math.round(mat * item.qty)
      const labor_amount = Math.round(labor * item.qty)
      const exp_amount = Math.round(exp * item.qty)
      return {
        ...item,
        mat, labor, exp,
        mat_amount, labor_amount, exp_amount,
        total: mat_amount + labor_amount + exp_amount,
        is_locked: true,
      }
    })
  }

  const calcResult = calc(items)
  console.log('[BUILD] buildItems result', { itemCount: items.length, grandTotal: calcResult.grandTotal })

  return { items, calcResult }
}

/**
 * 전체 견적서 시트 빌드 (buildItems + 메타)
 */
export function buildSheet(input: BuildItemsInput): EstimateSheet {
  const { items, calcResult } = buildItems(input)

  return {
    type: input.method,
    title: input.method === '복합' ? '복합방수' : '우레탄방수',
    price_per_pyeong: input.pricePerPyeong,
    warranty_years: 5,
    warranty_bond: 3,
    grand_total: calcResult.grandTotal,
    sort_order: input.method === '복합' ? 0 : 1,
    items,
  }
}
