import { useEffect, useState, useCallback } from 'react'
import type { QuickChip } from '@/lib/estimate/quickChipConfig'

// ── 런타임 칩 단가 오버라이드 ──
//
// 견적서 진입 시 cost_config 에서 장비(equipment_prices) + 추가공종(extra_items)
// 단가를 로드하여 빠른추가 칩 기본값을 덮어쓴다.
// quickChipConfig.ts 의 하드코딩 값은 fallback 으로만 사용된다.

interface PriceEntry {
  mat: number
  labor: number
  exp: number
}

// ── 장비 키 → 칩 name 매핑 ──
// EquipmentEditor 의 key 와 quickChipConfig 의 chip.name 이 다를 수 있어 분리.
const EQUIPMENT_KEY_BY_NAME: Record<string, string> = {
  '사다리차': 'ladder',
  '스카이차': 'sky',
  '폐기물처리비': 'waste',
  '포크레인': 'forklift',
  '크레인': 'crane',
  '로프공': 'ropeman',
}

function normalizeEntry(raw: unknown, fallback: PriceEntry): PriceEntry {
  // 레거시: number 단일값 → exp 로 승격
  if (typeof raw === 'number') {
    return { mat: 0, labor: 0, exp: raw }
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return {
      mat: typeof obj.mat === 'number' ? obj.mat : fallback.mat,
      labor: typeof obj.labor === 'number' ? obj.labor : fallback.labor,
      exp: typeof obj.exp === 'number' ? obj.exp : fallback.exp,
    }
  }
  return fallback
}

export function useRuntimeChipPrices() {
  const [equipmentPrices, setEquipmentPrices] = useState<Record<string, PriceEntry>>({})
  const [extraItems, setExtraItems] = useState<Record<string, PriceEntry>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/settings/cost-config')
        if (!res.ok) return
        const json = await res.json()
        const cfg = (json.config ?? {}) as Record<string, unknown>

        if (!cancelled) {
          // 장비
          const ep = (cfg.equipment_prices ?? {}) as Record<string, unknown>
          const normEquip: Record<string, PriceEntry> = {}
          for (const key of Object.keys(ep)) {
            normEquip[key] = normalizeEntry(ep[key], { mat: 0, labor: 0, exp: 0 })
          }
          setEquipmentPrices(normEquip)

          // 추가공종
          const ei = (cfg.extra_items ?? {}) as Record<string, unknown>
          const normExtra: Record<string, PriceEntry> = {}
          for (const key of Object.keys(ei)) {
            normExtra[key] = normalizeEntry(ei[key], { mat: 0, labor: 0, exp: 0 })
          }
          setExtraItems(normExtra)
        }
      } catch (err) {
        console.error('runtime chip prices load 오류:', err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 칩에 런타임 단가를 주입. 칩 종류에 따라 분기:
  //   - is_equipment 면 equipment_prices 에서 키 조회
  //   - 그 외는 extra_items 에서 chip.name 키 조회
  const applyPrices = useCallback(
    (chip: QuickChip): QuickChip => {
      if (chip.is_equipment) {
        const key = EQUIPMENT_KEY_BY_NAME[chip.name]
        const entry = key ? equipmentPrices[key] : undefined
        if (!entry) return chip
        return { ...chip, mat: entry.mat, labor: entry.labor, exp: entry.exp }
      }
      const entry = extraItems[chip.name]
      if (!entry) return chip
      return { ...chip, mat: entry.mat, labor: entry.labor, exp: entry.exp }
    },
    [equipmentPrices, extraItems],
  )

  return { applyPrices }
}
