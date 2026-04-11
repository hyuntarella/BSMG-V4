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
 * #10 이후: BASE는 방수 공종만 (복합 8, 우레탄 7).
 * 장비(사다리차/스카이차/폐기물처리/드라이비트하부절개)는 옵션으로 들어올 때만
 * 행을 동적으로 추가한다. (BASE에서 분리)
 */
export function buildItems(input: BuildItemsInput): {
  items: EstimateItem[]
  calcResult: CalcResult
} {
  const { method, m2, wallM2 = 0, pricePerPyeong, priceMatrix, options = {} } = input

  const areaRange = getAR(m2)
  const unitCosts = getPD(priceMatrix, areaRange, method, pricePerPyeong)
  const base = method === '복합' ? COMPLEX_BASE : URETHANE_BASE

  // 1) 방수 공종 BASE + P매트릭스 단가 결합
  let items: EstimateItem[] = base.map((b, i) => {
    const costs: UnitCost = unitCosts[i] ?? [0, 0, 0]
    const [mat, labor, exp] = costs

    // 수량 결정 (v1 원본 로직)
    let qty = 0
    if (b.isWall) {
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

    // 식 항목: 단가 비움, 금액에 직접 (P매트릭스 값 = 금액)
    const isShikItem = b.unit === '식'
    const matAmount = isShikItem ? mat : Math.round(qty * mat)
    const laborAmount = isShikItem ? labor : Math.round(qty * labor)
    const expAmount = isShikItem ? exp : Math.round(qty * exp)

    return {
      sort_order: i + 1,
      name: b.name,
      spec: b.spec,
      unit: b.unit,
      qty,
      mat: isShikItem ? 0 : mat,
      labor: isShikItem ? 0 : labor,
      exp: isShikItem ? 0 : exp,
      mat_amount: matAmount,
      labor_amount: laborAmount,
      exp_amount: expAmount,
      total: matAmount + laborAmount + expAmount,
      is_base: b.isBase ?? false,
      is_equipment: false,
      is_fixed_qty: b.isFixedQty ?? false,
    }
  })

  // 2) 장비 옵션 → 행 추가 (옵션에 값이 있을 때만 1줄 append)
  items = appendEquipmentRows(items, options)

  // 3) 옵션 오버라이드 적용 (벽체실링 수량 등, 장비는 이미 위에서 처리됨)
  items = applyOverrides(items, { wallM2 })

  // 빈 행(이름 없음, 수량 0) 제거
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

  return { items, calcResult }
}

/**
 * 옵션에 지정된 장비를 공종 배열 끝에 추가한다.
 * - 단가: 옵션의 unitPrice → fallback DEFAULT_EQUIPMENT_PRICES → 0
 * - 수량: days (사다리차/스카이차/폐기물처리) 또는 1 (드라이비트)
 * - 전부 경비(exp) 컬럼에 기록
 */
function appendEquipmentRows(
  items: EstimateItem[],
  options: BuildItemsInput['options'],
): EstimateItem[] {
  if (!options) return items

  const equipmentRows: EstimateItem[] = []

  if (options.ladder && options.ladder.days > 0) {
    equipmentRows.push(makeEquipmentRow({
      name: '사다리차',
      unit: '일',
      qty: options.ladder.days,
      exp: options.ladder.unitPrice ?? DEFAULT_EQUIPMENT_PRICES.ladder,
    }))
  }

  if (options.sky && options.sky.days > 0) {
    equipmentRows.push(makeEquipmentRow({
      name: '스카이차',
      unit: '일',
      qty: options.sky.days,
      exp: options.sky.unitPrice ?? DEFAULT_EQUIPMENT_PRICES.sky,
    }))
  }

  if (options.waste && options.waste.days > 0) {
    equipmentRows.push(makeEquipmentRow({
      name: '폐기물처리',
      unit: '식',
      qty: options.waste.days,
      exp: options.waste.unitPrice ?? DEFAULT_EQUIPMENT_PRICES.waste,
    }))
  }

  if (options.dryvit) {
    equipmentRows.push(makeEquipmentRow({
      name: '드라이비트하부절개',
      unit: '식',
      qty: 1,
      exp: 0,
    }))
  }

  return [...items, ...equipmentRows]
}

function makeEquipmentRow(args: {
  name: string
  unit: string
  qty: number
  exp: number
}): EstimateItem {
  const { name, unit, qty, exp } = args
  const exp_amount = Math.round(qty * exp)
  return {
    sort_order: 0, // 재정렬 단계에서 업데이트
    name,
    spec: '',
    unit,
    qty,
    mat: 0,
    labor: 0,
    exp,
    mat_amount: 0,
    labor_amount: 0,
    exp_amount,
    total: exp_amount,
    is_base: false,
    is_equipment: true,
    is_fixed_qty: true,
  }
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
