'use client'

import { QUICK_CHIP_CATEGORIES, type QuickChip } from '@/lib/estimate/quickChipConfig'

interface QuickAddChipsProps {
  /** 칩 클릭 시 호출 — 해당 칩 설정으로 즉시 행 추가 */
  onChipAdd: (chip: QuickChip) => void
}

/**
 * 빠른공종추가 칩 (#10).
 *
 * 표 하단 "행 추가" 버튼 위에 배치. 카테고리별 구분선+헤더로 시각 구분.
 * 칩 클릭 1번으로 즉시 해당 공종 행이 추가된다 (추가 클릭 없음).
 */
export default function QuickAddChips({ onChipAdd }: QuickAddChipsProps) {
  return (
    <div
      className="border-t border-gray-200 bg-gray-50 px-2 py-2"
      data-testid="quick-add-chips"
    >
      {QUICK_CHIP_CATEGORIES.map((category, catIdx) => (
        <div
          key={category.label}
          className={`${catIdx > 0 ? 'mt-1.5 pt-1.5 border-t border-dashed border-gray-300' : ''}`}
        >
          <div className="text-[10px] font-semibold text-gray-500 mb-1 px-0.5 tracking-wide">
            {category.label}
          </div>
          <div className="flex flex-wrap gap-1">
            {category.chips.map(chip => (
              <button
                key={chip.name}
                type="button"
                onClick={() => onChipAdd(chip)}
                className="px-2 py-0.5 text-xs rounded border border-gray-300 bg-white hover:bg-brand hover:text-white hover:border-brand text-gray-700 transition-colors whitespace-nowrap"
                data-testid={`quick-chip-${chip.name}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
