import { useState, useMemo, useCallback } from 'react'
import type { Method, PriceMatrixRaw } from '@/lib/estimate/types'
import { getCostPerM2 } from '@/lib/estimate/cost'
import { calcChipRange, getAvailableChips, getChipMarginPercent } from '@/lib/estimate/costChips'

interface UseCostChipsInput {
  areaM2: number
  method: Method
  isMobile?: boolean
  priceMatrix?: PriceMatrixRaw
  /** 사용자가 칩/직접입력으로 가격을 바꿨을 때 호출되는 콜백. 이 콜백에서 sheet.price_per_pyeong을 직접 동기화한다. */
  onPriceChange?: (price: number) => void
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
  onPriceChange,
}: UseCostChipsInput): UseCostChipsReturn {
  const [selectedChip, _setSelectedChip] = useState<number | null>(null)
  const [customPrice, _setCustomPrice] = useState<number | null>(null)

  // 칩 선택 시: 로컬 상태 + 외부 동기화 콜백을 사용자 이벤트 경로에서 한 번만 호출
  const setSelectedChip = useCallback((chip: number | null) => {
    _setSelectedChip(chip)
    if (chip !== null) {
      _setCustomPrice(null)
      onPriceChange?.(chip)
    }
  }, [onPriceChange])

  const setCustomPrice = useCallback((price: number | null) => {
    _setCustomPrice(price)
    if (price !== null) {
      _setSelectedChip(null)
      onPriceChange?.(price)
    }
  }, [onPriceChange])

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
