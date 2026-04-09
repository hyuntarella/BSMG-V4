'use client'

import { useCallback } from 'react'
import type { CellPosition } from './useExcelSelection'
import type { EstimateItem } from '@/lib/estimate/types'

interface UseTableKeyboardOptions {
  activeCell: CellPosition | null
  isEditing: boolean
  items: EstimateItem[]
  colCount: number
  onSelect: (row: number, col: number) => void
  onStartEditing: () => void
  onStopEditing: () => void
  onCommitValue: () => void
  onCancelEdit: () => void
  onUndo?: () => void
  onRedo?: () => void
  /** 선택 상태에서 타이핑 시 → 편집 진입 + 첫 글자 전달 */
  onTypeToEdit?: (char: string) => void
}

/**
 * 테이블 키보드 네비게이션
 * - 방향키/Tab/Enter/Shift 조합 처리
 * - 숨김 행(is_hidden) 스킵
 * - 경계 처리
 */
export function useTableKeyboard({
  activeCell,
  isEditing,
  items,
  colCount,
  onSelect,
  onStartEditing,
  onStopEditing,
  onCommitValue,
  onCancelEdit,
  onUndo,
  onRedo,
  onTypeToEdit,
}: UseTableKeyboardOptions) {
  // 다음 보이는 행 찾기 (direction: 1=아래, -1=위)
  const findNextVisibleRow = useCallback(
    (fromRow: number, direction: 1 | -1): number => {
      let next = fromRow + direction
      while (next >= 0 && next < items.length && items[next].is_hidden) {
        next += direction
      }
      if (next < 0 || next >= items.length) return fromRow
      return next
    },
    [items],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeCell) return

      // Ctrl+Z / Ctrl+Shift+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo?.()
        return
      }
      if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        onRedo?.()
        return
      }
      if (e.ctrlKey && e.key === 'Z') {
        e.preventDefault()
        onRedo?.()
        return
      }

      const { row, col } = activeCell

      if (isEditing) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault()
            onCommitValue()
            onStopEditing()
            if (e.shiftKey) {
              // Shift+Enter → 위
              onSelect(findNextVisibleRow(row, -1), col)
            } else {
              // Enter → 아래
              onSelect(findNextVisibleRow(row, 1), col)
            }
            break
          case 'Tab':
            e.preventDefault()
            onCommitValue()
            onStopEditing()
            if (e.shiftKey) {
              // Shift+Tab → 왼쪽
              if (col > 0) {
                onSelect(row, col - 1)
              } else if (row > 0) {
                const prevRow = findNextVisibleRow(row, -1)
                onSelect(prevRow, colCount - 1)
              }
            } else {
              // Tab → 오른쪽
              if (col < colCount - 1) {
                onSelect(row, col + 1)
              } else {
                const nextRow = findNextVisibleRow(row, 1)
                if (nextRow !== row) {
                  onSelect(nextRow, 0)
                }
              }
            }
            break
          case 'Escape':
            e.preventDefault()
            onCancelEdit()
            onStopEditing()
            break
          case 'ArrowUp':
            e.preventDefault()
            onCommitValue()
            onStopEditing()
            onSelect(findNextVisibleRow(row, -1), col)
            break
          case 'ArrowDown':
            e.preventDefault()
            onCommitValue()
            onStopEditing()
            onSelect(findNextVisibleRow(row, 1), col)
            break
          case 'ArrowLeft':
            // 편집 중 좌우 화살표는 input 커서 이동으로 사용
            break
          case 'ArrowRight':
            break
        }
      } else {
        // selected 상태 (편집 아님)
        switch (e.key) {
          case 'Enter':
          case 'F2':
            e.preventDefault()
            onStartEditing()
            break
          case 'Tab':
            e.preventDefault()
            if (e.shiftKey) {
              if (col > 0) onSelect(row, col - 1)
              else if (row > 0) onSelect(findNextVisibleRow(row, -1), colCount - 1)
            } else {
              if (col < colCount - 1) onSelect(row, col + 1)
              else {
                const nextRow = findNextVisibleRow(row, 1)
                if (nextRow !== row) onSelect(nextRow, 0)
              }
            }
            break
          case 'ArrowUp':
            e.preventDefault()
            onSelect(findNextVisibleRow(row, -1), col)
            break
          case 'ArrowDown':
            e.preventDefault()
            onSelect(findNextVisibleRow(row, 1), col)
            break
          case 'ArrowLeft':
            e.preventDefault()
            if (col > 0) onSelect(row, col - 1)
            break
          case 'ArrowRight':
            e.preventDefault()
            if (col < colCount - 1) onSelect(row, col + 1)
            break
          default:
            // 선택 상태에서 타이핑 → 즉시 편집 모드 + 덮어쓰기 (엑셀 UX)
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              e.preventDefault()
              onTypeToEdit?.(e.key)
              onStartEditing()
            }
            break
        }
      }
    },
    [activeCell, isEditing, colCount, findNextVisibleRow, onSelect, onStartEditing, onStopEditing, onCommitValue, onCancelEdit, onUndo, onRedo, onTypeToEdit],
  )

  return { handleKeyDown }
}
