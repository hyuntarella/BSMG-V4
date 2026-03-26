import type { BaseItem } from './types'

/**
 * 복합방수 기본 공종 배열 (11개)
 * P매트릭스 item_index 순서와 1:1 대응
 */
export const COMPLEX_BASE: BaseItem[] = [
  { name: '바탕정리',        spec: '기존 방수층 철거',    unit: 'm²', isBase: true },
  { name: '바탕조정제',      spec: '',                  unit: 'm²', isBase: true },
  { name: '바탕미장',        spec: '시멘트 액체 방수',    unit: 'm²', isBase: true },
  { name: '복합시트',        spec: '개량형 1.5T',        unit: 'm²', isBase: true },
  { name: '보호누름',        spec: '시멘트 모르타르',     unit: 'm²', isBase: true },
  { name: '우레탄도막',      spec: '1차+2차 (KS)',       unit: 'm²', isBase: true },
  { name: '상도 (톱코트)',   spec: '불소계',             unit: 'm²', isBase: true },
  { name: '벽체실링',        spec: '우레탄실링',         unit: 'm',  isBase: true },
  { name: '사다리차',        spec: '1톤',               unit: '일', isEquipment: true, isFixedQty: true },
  { name: '폐기물 처리',     spec: '마대 및 운반',       unit: '일', isEquipment: true, isFixedQty: true },
  { name: '스카이차',        spec: '0.5톤',             unit: '일', isEquipment: true, isFixedQty: true },
]

/**
 * 우레탄방수 기본 공종 배열 (11개)
 * P매트릭스 item_index 순서와 1:1 대응
 */
export const URETHANE_BASE: BaseItem[] = [
  { name: '바탕정리',        spec: '기존 방수층 철거',    unit: 'm²', isBase: true },
  { name: '바탕조정제',      spec: '',                  unit: 'm²', isBase: true },
  { name: '바탕미장',        spec: '시멘트 액체 방수',    unit: 'm²', isBase: true },
  { name: '노출 우레탄 1차', spec: 'KS 인증 1.0mm',     unit: 'm²', isBase: true },
  { name: '노출 우레탄 2차', spec: 'KS 인증 1.0mm',     unit: 'm²', isBase: true },
  { name: '상도 (톱코트)',   spec: '불소계',             unit: 'm²', isBase: true },
  { name: '벽체실링',        spec: '우레탄실링',         unit: 'm',  isBase: true },
  { name: '사다리차',        spec: '1톤',               unit: '일', isEquipment: true, isFixedQty: true },
  { name: '폐기물 처리',     spec: '마대 및 운반',       unit: '일', isEquipment: true, isFixedQty: true },
  { name: '스카이차',        spec: '0.5톤',             unit: '일', isEquipment: true, isFixedQty: true },
  { name: '',               spec: '',                  unit: '',   isBase: false },  // 예비 슬롯
]

/** 공과잡비 비율 */
export const OVERHEAD_RATE = 0.03

/** 기업이윤 비율 */
export const PROFIT_RATE = 0.06

/** 절사 단위 (10만원) */
export const ROUND_UNIT = 100000

/** 면적대 경계값 (평 기준) */
export const AREA_BOUNDARIES = [
  { max: 20,  label: '20평이하' as const },
  { max: 50,  label: '50평미만' as const },
  { max: 100, label: '50~100평' as const },
  { max: 200, label: '100~200평' as const },
  { max: Infinity, label: '200평이상' as const },
]

/** 기본 장비 단가 */
export const DEFAULT_EQUIPMENT_PRICES = {
  ladder: 120000,   // 사다리차 1일
  sky: 350000,      // 스카이차 1일
  waste: 200000,    // 폐기물 1일
}

/** 원가 테이블 (m² 당 실제 원가) — getCostPerM2 용 */
export const COST_TABLE = {
  complex: {
    '20평이하':   15000,
    '50평미만':   13000,
    '50~100평':  12000,
    '100~200평': 11000,
    '200평이상':  10000,
  },
  urethane: {
    '20평이하':   12000,
    '50평미만':   10500,
    '50~100평':   9500,
    '100~200평':  8500,
    '200평이상':   7500,
  },
} as const
