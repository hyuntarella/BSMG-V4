// ── 면적대 ──
export type AreaRange = '20평이하' | '50평미만' | '50~100평' | '100~200평' | '200평이상'

// ── 공법 ──
export type Method = '복합' | '우레탄'

// ── 단가 3요소 [재료비, 노무비, 경비] ──
export type UnitCost = [mat: number, labor: number, exp: number]

// ── P매트릭스 원본 구조 ──
export type PriceMatrixRaw = {
  [areaRange: string]: {
    [method: string]: {
      [pricePerPyeong: string]: UnitCost[]
    }
  }
}

// ── P매트릭스 DB 행 ──
export interface PriceMatrixRow {
  id?: string
  company_id: string
  area_range: string
  method: string
  price_per_pyeong: number
  item_index: number
  mat: number
  labor: number
  exp: number
}

// ── 기본 공종 정의 (프리셋 + BASE 배열용) ──
export interface BaseItem {
  name: string
  spec: string
  unit: string
  isBase?: boolean       // 기본 공종 (면적 연동)
  isEquipment?: boolean  // 장비류 (고정 수량)
  isFixedQty?: boolean   // 수량 고정 (공과잡비 등 제외)
}

// ── 견적서 공종 행 ──
export interface EstimateItem {
  id?: string
  sheet_id?: string
  sort_order: number
  name: string
  spec: string
  unit: string
  qty: number
  mat: number
  labor: number
  exp: number
  mat_amount: number
  labor_amount: number
  exp_amount: number
  total: number
  is_base: boolean
  is_equipment: boolean
  is_fixed_qty: boolean
}

// ── 견적서 시트 ──
export interface EstimateSheet {
  id?: string
  estimate_id?: string
  type: Method
  title?: string
  plan?: string
  price_per_pyeong: number
  warranty_years: number
  warranty_bond: number
  grand_total: number
  sort_order: number
  items: EstimateItem[]
}

// ── 견적서 메타 ──
export interface Estimate {
  id?: string
  company_id?: string
  customer_id?: string
  created_by?: string
  mgmt_no?: string
  status: 'draft' | 'saved' | 'sent' | 'viewed'
  date: string
  customer_name?: string
  site_name?: string
  m2: number
  wall_m2: number
  manager_name?: string
  manager_phone?: string
  memo?: string
  sheets: EstimateSheet[]
}

// ── 계산 결과 ──
export interface CalcResult {
  subtotal: number       // 소계
  overhead: number       // 공과잡비 (3%)
  profit: number         // 기업이윤 (6%)
  totalBeforeRound: number // 계
  grandTotal: number     // 합계 (10만원 절사)
}

// ── 원가 테이블 (getCostPerM2) ──
export interface CostTable {
  complex: { [range: string]: number }
  urethane: { [range: string]: number }
}

// ── buildItems 입력 ──
export interface BuildItemsInput {
  method: Method
  m2: number
  wallM2?: number
  pricePerPyeong: number
  priceMatrix: PriceMatrixRaw
  options?: {
    leak?: boolean
    rooftop?: boolean
    plaster?: boolean
    elevator?: boolean
    ladder?: { days: number; unitPrice?: number }
    sky?: { days: number; unitPrice?: number }
    dryvit?: boolean
    waste?: { days: number; unitPrice?: number }
  }
}

// ── 프리셋 DB 행 ──
export interface PresetRow {
  id?: string
  company_id: string
  name: string
  spec: string
  unit: string
  mat: number
  labor: number
  exp: number
  category: string
  used_count?: number
  last_used?: string
}

// ── 음성 파싱 결과 (extract 모드) ──
export interface VoiceParsed {
  method: Method | '복합+우레탄' | null
  area: number | null
  leak: boolean | null
  rooftop: boolean | null
  plaster: boolean | null
  elevator: boolean | null
  ladder: { days: number; unitPrice?: number } | null
  sky: { days: number; unitPrice?: number } | null
  dryvit: boolean | null
  waste: { days: number; unitPrice?: number } | null
  deadline: string | null
  notes: string | null
}
