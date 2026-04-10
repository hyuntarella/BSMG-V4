'use client'

import type { UseCostChipsReturn } from '@/hooks/useCostChips'
import { getChipMarginPercent } from '@/lib/estimate/costChips'

interface CostChipsPanelProps {
  compositeChips: UseCostChipsReturn
  urethaneChips: UseCostChipsReturn
}

function getChipColor(margin: number): string {
  if (margin < 0) return 'bg-red-500 text-white border-red-500'
  if (margin < 40) return 'bg-yellow-400 text-gray-900 border-yellow-400'
  return 'bg-gray-900 text-white border-gray-900'
}

function getMarginBadgeColor(margin: number): string {
  if (margin < 0) return 'bg-red-100 text-red-700'
  if (margin < 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

function ChipSection({
  label,
  state,
}: {
  label: string
  state: UseCostChipsReturn
}) {
  const {
    chips,
    selectedChip,
    setSelectedChip,
    customPrice,
    setCustomPrice,
    marginPercent,
    costPerM2,
  } = state

  const isCustomActive = selectedChip === null && customPrice !== null

  return (
    <div className="space-y-3">
      {/* 헤더: 라벨 + 마진 배지 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {(selectedChip !== null || customPrice !== null) && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${getMarginBadgeColor(marginPercent)}`}
          >
            마진 {marginPercent}%
          </span>
        )}
      </div>

      {/* 칩 배열 */}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const chipMargin = getChipMarginPercent(chip, costPerM2)
          const isSelected = selectedChip === chip
          const colorClass = getChipColor(chipMargin)
          const ringClass = isSelected ? ' ring-2 ring-blue-500 ring-offset-2' : ''

          return (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setSelectedChip(isSelected ? null : chip)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${colorClass}${ringClass}`}
            >
              {chip.toLocaleString()}원
            </button>
          )
        })}
      </div>

      {/* 직접입력 */}
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
            isCustomActive
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
}: CostChipsPanelProps) {
  return (
    <div className="space-y-6">
      <ChipSection label="복합방수 평단가" state={compositeChips} />
      <ChipSection label="우레탄방수 평단가" state={urethaneChips} />
    </div>
  )
}
