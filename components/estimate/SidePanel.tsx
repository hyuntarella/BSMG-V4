'use client'

import { useCallback } from 'react'
import type { Estimate, EstimateItem } from '@/lib/estimate/types'
import { useFavorites } from '@/hooks/useFavorites'
import { useRuntimeChipPrices } from '@/hooks/useRuntimeChipPrices'
import { chipToEstimateItem, type QuickChip } from '@/lib/estimate/quickChipConfig'
import { calc } from '@/lib/estimate/calc'

interface SidePanelProps {
  estimate: Estimate
  onChange: (e: Estimate) => void
  onSaveSnapshot: (d: string) => void
}

/**
 * 견적서 우측 장비·인력 + 보수·추가 사이드 패널.
 *
 * 데이터 소스: cost_config.favorites (useFavorites) — 미존재 시 QUICK_CHIP_CATEGORIES fallback.
 * 가격: useRuntimeChipPrices.applyPrices 로 cost_config.equipment_prices / extra_items 런타임 오버라이드.
 * 추가 동작: 양 시트 (복합 + 우레탄) 동시 push + calc 재계산 + 스냅샷 저장.
 */
export default function SidePanel({ estimate, onChange, onSaveSnapshot }: SidePanelProps) {
  const { favorites } = useFavorites()
  const { applyPrices } = useRuntimeChipPrices()

  const handleChipAdd = useCallback((chip: QuickChip) => {
    onSaveSnapshot(`빠른 추가: ${chip.name}`)
    const overridden = applyPrices(chip)
    const sheets = [...estimate.sheets]
    for (let i = 0; i < sheets.length; i++) {
      const sheetItems = sheets[i].items
      const newItem = chipToEstimateItem(overridden, sheetItems.length + 1) as EstimateItem
      const newItems = [...sheetItems, newItem]
      const c = calc(newItems.filter(it => !it.is_hidden))
      sheets[i] = { ...sheets[i], items: newItems, grand_total: c.grandTotal }
    }
    onChange({ ...estimate, sheets })
  }, [estimate, onChange, onSaveSnapshot, applyPrices])

  const chipCls = 'w-full rounded-lg bg-v-hov px-[10px] py-2 text-center text-xs font-medium text-v-hdr cursor-pointer hover:bg-v-accent-bg hover:text-v-accent transition-colors'

  return (
    <>
      {favorites.map((category, catIdx) => (
        <div
          key={`${category.label}-${catIdx}`}
          className={`rounded-lg bg-white p-[10px] shadow-v-sm ${catIdx < favorites.length - 1 ? 'mb-2' : ''}`}
        >
          <h4 className="text-[10px] font-semibold text-v-mut tracking-wider mb-2 uppercase">
            {category.label}
          </h4>
          <div className="flex flex-col gap-2">
            {category.chips.map(chip => (
              <button
                key={chip.name}
                type="button"
                className={chipCls}
                onClick={() => handleChipAdd(chip)}
                data-testid={`sidepanel-chip-${chip.name}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
