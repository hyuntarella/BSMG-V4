import { useState, useMemo } from 'react'
import type { Method } from '@/lib/estimate/types'
import { getCostPerM2 } from '@/lib/estimate/cost'
import { calcChipRange, getChipMarginPercent } from '@/lib/estimate/costChips'

interface UseCostChipsInput {
  areaM2: number
  method: Method
  isMobile?: boolean
}

export interface UseCostChipsReturn {
  chips: number[]
  selectedChip: number | null
  setSelectedChip: (chip: number | null) => void
  customPrice: number | null
  setCustomPrice: (price: number | null) => void
  effectivePrice: number | null
  marginPercent: number
  costPerM2: number
}

export function useCostChips({
  areaM2,
  method,
  isMobile = false,
}: UseCostChipsInput): UseCostChipsReturn {
  const [selectedChip, setSelectedChip] = useState<number | null>(null)
  const [customPrice, setCustomPrice] = useState<number | null>(null)

  const costPerM2 = useMemo(() => getCostPerM2(method, areaM2), [method, areaM2])

  const chips = useMemo(
    () => calcChipRange(costPerM2, isMobile),
    [costPerM2, isMobile],
  )

  const effectivePrice = selectedChip ?? customPrice

  const marginPercent = useMemo(
    () =>
      effectivePrice !== null
        ? getChipMarginPercent(effectivePrice, costPerM2)
        : 0,
    [effectivePrice, costPerM2],
  )

  return {
    chips,
    selectedChip,
    setSelectedChip,
    customPrice,
    setCustomPrice,
    effectivePrice,
    marginPercent,
    costPerM2,
  }
}
