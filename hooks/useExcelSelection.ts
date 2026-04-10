'use client'

import { useState, useCallback } from 'react'

export interface CellPosition {
  row: number
  col: number
}

/**
 * 단일 셀 선택 관리 (Phase 4E 범위)
 * 다중 셀 선택은 향후 별도 작업
 */
export function useExcelSelection() {
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const select = useCallback((row: number, col: number) => {
    setActiveCell({ row, col })
    setIsEditing(false)
  }, [])

  const startEditing = useCallback(() => {
    setIsEditing(true)
  }, [])

  const stopEditing = useCallback(() => {
    setIsEditing(false)
  }, [])

  const clear = useCallback(() => {
    setActiveCell(null)
    setIsEditing(false)
  }, [])

  return { activeCell, isEditing, select, startEditing, stopEditing, clear }
}
