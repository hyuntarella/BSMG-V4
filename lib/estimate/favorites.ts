/**
 * 즐겨찾기 공종 (cost_config.favorites) 공통 유틸.
 *
 * - 기존 하드코딩 QUICK_CHIP_CATEGORIES 는 "최초 기본값"으로 마이그레이션
 * - 저장 후에는 DB (cost_config.favorites) 가 단일 소스
 * - QuickAddChips 와 FavoritesEditor 둘 다 이 유틸을 통해 데이터를 읽는다
 */
import { QUICK_CHIP_CATEGORIES, type QuickChipCategory } from './quickChipConfig'

/** 런타임 타입 가드 — DB 에서 읽은 unknown 값이 QuickChipCategory[] 인지 검증 */
export function isQuickChipCategoryArray(value: unknown): value is QuickChipCategory[] {
  if (!Array.isArray(value)) return false
  for (const cat of value) {
    if (!cat || typeof cat !== 'object') return false
    const c = cat as Record<string, unknown>
    if (typeof c.label !== 'string') return false
    if (!Array.isArray(c.chips)) return false
    for (const chip of c.chips) {
      if (!chip || typeof chip !== 'object') return false
      const ch = chip as Record<string, unknown>
      if (typeof ch.name !== 'string') return false
      if (typeof ch.label !== 'string') return false
      if (typeof ch.unit !== 'string') return false
      if (typeof ch.mat !== 'number') return false
      if (typeof ch.labor !== 'number') return false
      if (typeof ch.exp !== 'number') return false
      if (typeof ch.qty !== 'number') return false
      if (typeof ch.is_equipment !== 'boolean') return false
    }
  }
  return true
}

/**
 * cost_config.favorites 값을 QuickChipCategory[] 로 해석.
 * 비어있거나 형식이 안 맞으면 하드코딩 기본값 반환.
 */
export function resolveFavorites(raw: unknown): QuickChipCategory[] {
  if (isQuickChipCategoryArray(raw) && raw.length > 0) return raw
  return QUICK_CHIP_CATEGORIES
}

/** 깊은 복사 — 편집 버퍼용 */
export function cloneFavorites(favs: QuickChipCategory[]): QuickChipCategory[] {
  return favs.map((cat) => ({
    label: cat.label,
    chips: cat.chips.map((c) => ({ ...c })),
  }))
}

/** 빈 칩 생성 */
export function emptyChip(): QuickChipCategory['chips'][number] {
  return {
    name: '',
    label: '',
    unit: 'm²',
    qty: 1,
    mat: 0,
    labor: 0,
    exp: 0,
    is_equipment: false,
  }
}

/** 빈 카테고리 생성 */
export function emptyCategory(label: string = '새 카테고리'): QuickChipCategory {
  return { label, chips: [] }
}
