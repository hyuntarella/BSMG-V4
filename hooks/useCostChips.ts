import { useState, useMemo } from 'react'
import type { Method, PriceMatrixRaw } from '@/lib/estimate/types'
import { getCostPerM2 } from '@/lib/estimate/cost'
import { calcChipRange, getAvailableChips, getChipMarginPercent } from '@/lib/estimate/costChips'

interface UseCostChipsInput {
  areaM2: number
  method: Method
  isMobile?: boolean
  priceMatrix?: PriceMatrixRaw
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
  priceMatrix,
}: UseCostChipsInput): UseCostChipsReturn {
  const [selectedChip, setSelectedChip] = useState<number | null>(null)
  const [customPrice, setCustomPrice] = useState<number | null>(null)

  const costPerM2 = useMemo(() => getCostPerM2(method, areaM2), [method, areaM2])

  const chips = useMemo(
    () =>
      priceMatrix
        ? getAvailableChips(priceMatrix, areaM2, method)
        : calcChipRange(costPerM2, isMobile),
    [priceMatrix, areaM2, method, costPerM2, isMobile],
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
