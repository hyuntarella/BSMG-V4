'use client'

import type { UseCostChipsReturn } from '@/hooks/useCostChips'
import { getChipMarginPercent } from '@/lib/estimate/costChips'

interface CostChipsPanelProps {
  compositeChips: UseCostChipsReturn
  urethaneChips: UseCostChipsReturn
  /** 인라인 모드: 해당 탭의 칩만 한 줄로 표시 */
  inlineMode?: 'composite' | 'urethane'
}

function ChipSection({
  label,
  state,
  inline = false,
}: {
  label: string
  state: UseCostChipsReturn
  inline?: boolean
}) {
  const {
    chips,
    selectedChip,
    setSelectedChip,
    customPrice,
    setCustomPrice,
  } = state

  if (inline) {
    return (
      <div className="flex items-center gap-[3px] flex-wrap max-h-[52px] overflow-y-auto">
        {chips.map((chip) => {
          const isSelected = selectedChip === chip
          return (
            <button
              key={chip}
              type="button"
              onClick={() => setSelectedChip(isSelected ? null : chip)}
              className={`px-[13px] py-[5px] rounded-2xl text-xs font-medium tabular-nums border cursor-pointer transition-all whitespace-nowrap min-h-[28px] inline-flex items-center ${
                isSelected
                  ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-[0_2px_8px_rgba(0,122,255,.35)]'
                  : 'bg-white text-[#0d1117] border-[#ececec] hover:border-[#007AFF] hover:bg-[#E8F1FF] hover:-translate-y-px'
              }`}
            >
              {chip.toLocaleString()}
            </button>
          )
        })}
        <input
          type="number"
          placeholder="직접 입력"
          value={customPrice ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? null : Number(e.target.value)
            setCustomPrice(val)
          }}
          className="w-[92px] rounded-[13px] border-[1.5px] border-dashed border-[#c7c7c9] bg-white px-2 py-[3px] text-center text-[11px] font-semibold tabular-nums focus:outline-none focus:border-[#007AFF] focus:border-solid focus:bg-[#E8F1FF]"
        />
      </div>
    )
  }

  // 기본 모드 (풀 사이즈)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isSelected = selectedChip === chip
          return (
            <button
              key={chip}
              type="button"
              onClick={() => setSelectedChip(isSelected ? null : chip)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-[#007AFF] text-white border-[#007AFF] ring-2 ring-blue-500 ring-offset-2'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-[#007AFF] hover:bg-[#E8F1FF]'
              }`}
            >
              {chip.toLocaleString()}원
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={1000}
          min={0}
          placeholder="직접입력"
          value={customPrice ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? null : Number(e.target.value)
            setCustomPrice(val)
          }}
          className={`w-32 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            selectedChip === null && customPrice !== null
              ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-500 ring-offset-2'
              : 'bg-white text-gray-900 border-gray-300'
          }`}
        />
        <span className="text-xs text-gray-500">원/m²</span>
      </div>
    </div>
  )
}

export default function CostChipsPanel({
  compositeChips,
  urethaneChips,
  inlineMode,
}: CostChipsPanelProps) {
  if (inlineMode === 'composite') {
    return <ChipSection label="복합" state={compositeChips} inline />
  }
  if (inlineMode === 'urethane') {
    return <ChipSection label="우레탄" state={urethaneChips} inline />
  }

  return (
    <div className="space-y-6">
      <ChipSection label="복합방수 평단가" state={compositeChips} />
      <ChipSection label="우레탄방수 평단가" state={urethaneChips} />
    </div>
  )
}
