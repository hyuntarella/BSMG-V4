/**
 * 빠른공종추가 칩 정의 (#10).
 *
 * 카테고리별 칩 목록. 클릭 1번으로 즉시 행 추가.
 * 단가 소스:
 *   - 장비 (ladder/sky/waste): DEFAULT_EQUIPMENT_PRICES 기본 경비(exp)
 *   - 그 외: data/acdb-seed.json의 mat/labor/exp median 값을 베이크.
 *            미존재 항목은 0 (사용자가 직접 입력).
 *
 * 추후 외벽/주차장 칩은 아직 구현하지 않음. 추가 시 별도 카테고리로 확장.
 */
import { DEFAULT_EQUIPMENT_PRICES } from './constants'

export interface QuickChip {
  /** 공종명 — 견적서 행의 name 필드 */
  name: string
  /** 표시용 라벨 (줄바꿈 방지용, 짧게) */
  label: string
  /** 단위 */
  unit: string
  /** 재료단가 (m²당 또는 1식당) */
  mat: number
  /** 노무단가 */
  labor: number
  /** 경비단가 */
  exp: number
  /** 기본 수량 */
  qty: number
  /** 장비 플래그 — true면 공과잡비/이윤 계산에서 제외 */
  is_equipment: boolean
}

export interface QuickChipCategory {
  label: string
  chips: QuickChip[]
}

export const QUICK_CHIP_CATEGORIES: QuickChipCategory[] = [
  {
    label: '장비·인력',
    chips: [
      {
        name: '사다리차', label: '사다리차', unit: '일', qty: 1,
        mat: 0, labor: 0, exp: DEFAULT_EQUIPMENT_PRICES.ladder,
        is_equipment: true,
      },
      {
        name: '폐기물처리비', label: '폐기물처리비', unit: '식', qty: 1,
        mat: 0, labor: 0, exp: DEFAULT_EQUIPMENT_PRICES.waste,
        is_equipment: true,
      },
      {
        name: '스카이차', label: '스카이차', unit: '일', qty: 1,
        mat: 0, labor: 0, exp: DEFAULT_EQUIPMENT_PRICES.sky,
        is_equipment: true,
      },
      {
        name: '포크레인', label: '포크레인', unit: '대', qty: 1,
        mat: 0, labor: 0, exp: 700000,
        is_equipment: true,
      },
      {
        name: '크레인', label: '크레인', unit: '대', qty: 1,
        mat: 0, labor: 0, exp: 1500000,
        is_equipment: true,
      },
      {
        name: '로프공', label: '로프공', unit: '인', qty: 1,
        mat: 0, labor: 450000, exp: 600000,
        is_equipment: true,
      },
    ],
  },
  {
    label: '보수·추가',
    chips: [
      {
        // 단위 식 + 경비(exp) 적용. acdb median(n=2)이 이상치이므로 0으로 두고 사용자 직접 입력.
        name: '바탕조정제 부분미장', label: '바탕조정제 부분미장', unit: '식', qty: 1,
        mat: 0, labor: 0, exp: 0,
        is_equipment: false,
      },
      {
        // acdb 미존재 — 0 단가, 사용자 직접 입력
        name: '드라이비트 하부절개', label: '드라이비트 하부절개', unit: '식', qty: 1,
        mat: 0, labor: 0, exp: 0,
        is_equipment: false,
      },
      {
        // acdb 미존재 — 0 단가, 사용자 직접 입력
        name: '드라이비트 부분절개', label: '드라이비트 부분절개', unit: '식', qty: 1,
        mat: 0, labor: 0, exp: 0,
        is_equipment: false,
      },
    ],
  },
]

/**
 * 칩 데이터를 견적 행(EstimateItem)으로 변환.
 */
export function chipToEstimateItem(chip: QuickChip, sortOrder: number) {
  const isShikItem = chip.unit === '식' && !chip.is_equipment
  const mat_amount = isShikItem ? chip.mat : Math.round(chip.qty * chip.mat)
  const labor_amount = isShikItem ? chip.labor : Math.round(chip.qty * chip.labor)
  const exp_amount = isShikItem ? chip.exp : Math.round(chip.qty * chip.exp)
  return {
    sort_order: sortOrder,
    name: chip.name,
    spec: '',
    unit: chip.unit,
    qty: chip.qty,
    mat: isShikItem ? 0 : chip.mat,
    labor: isShikItem ? 0 : chip.labor,
    exp: isShikItem ? 0 : chip.exp,
    mat_amount,
    labor_amount,
    exp_amount,
    total: mat_amount + labor_amount + exp_amount,
    is_base: false,
    is_equipment: chip.is_equipment,
    is_fixed_qty: chip.is_equipment,
  }
}
