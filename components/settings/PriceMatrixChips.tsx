'use client'

import { fm } from '@/lib/utils/format'

interface Props {
  pppList: number[]
  selectedPpp: number | null
  onSelect: (ppp: number) => void
}

/**
 * 단가표 2단계 — 평단가 칩 목록.
 * 선택된 면적대/공법 조합의 distinct price_per_pyeong 을 오름차순으로 렌더.
 */
export default function PriceMatrixChips({ pppList, selectedPpp, onSelect }: Props) {
  if (pppList.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2" data-testid="price-matrix-chips">
      {pppList.map((ppp) => {
        const active = ppp === selectedPpp
        return (
          <button
            key={ppp}
            type="button"
            onClick={() => onSelect(ppp)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-brand text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid={`price-chip-${ppp}`}
          >
            평당 {fm(ppp)}원
          </button>
        )
      })}
    </div>
  )
}
