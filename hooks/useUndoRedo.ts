'use client'

import { useState, useCallback, useRef } from 'react'
import type { EstimateItem } from '@/lib/estimate/types'

interface UndoRedoState {
  items: EstimateItem[]
  description: string
}

const MAX_STACK = 50

/**
 * Undo/Redo 스택 관리 (Phase 4F)
 * - items[] 레벨의 변경 이력 추적
 * - Ctrl+Z → undo, Ctrl+Shift+Z → redo
 * - 편집, 잠금/숨김 토글 모두 기록
 */
export function useUndoRedo(initialItems: EstimateItem[]) {
  const [undoStack, setUndoStack] = useState<UndoRedoState[]>([])
  const [redoStack, setRedoStack] = useState<UndoRedoState[]>([])
  const currentRef = useRef<EstimateItem[]>(initialItems)

  /** 현재 상태를 undo 스택에 push (변경 전 호출) */
  const pushState = useCallback((description: string) => {
    const snapshot: UndoRedoState = {
      items: JSON.parse(JSON.stringify(currentRef.current)),
      description,
    }
    setUndoStack(prev => {
      const next = [...prev, snapshot]
      return next.length > MAX_STACK ? next.slice(-MAX_STACK) : next
    })
    // 새 변경이 발생하면 redo 스택 초기화
    setRedoStack([])
  }, [])

  /** 현재 items 추적 업데이트 (외부에서 items가 바뀔 때 호출) */
  const syncCurrent = useCallback((items: EstimateItem[]) => {
    currentRef.current = items
  }, [])

  /** Undo: undo 스택에서 pop → 현재를 redo에 push → 복원 */
  const undo = useCallback((): EstimateItem[] | null => {
    let restored: EstimateItem[] | null = null
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      restored = JSON.parse(JSON.stringify(last.items))

      // 현재 상태를 redo에 push
      setRedoStack(rPrev => {
        const redoEntry: UndoRedoState = {
          items: JSON.parse(JSON.stringify(currentRef.current)),
          description: last.description,
        }
        const next = [...rPrev, redoEntry]
        return next.length > MAX_STACK ? next.slice(-MAX_STACK) : next
      })

      if (restored) currentRef.current = restored
      return prev.slice(0, -1)
    })
    return restored
  }, [])

  /** Redo: redo 스택에서 pop → 현재를 undo에 push → 복원 */
  const redo = useCallback((): EstimateItem[] | null => {
    let restored: EstimateItem[] | null = null
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      restored = JSON.parse(JSON.stringify(last.items))

      // 현재 상태를 undo에 push
      setUndoStack(uPrev => {
        const undoEntry: UndoRedoState = {
          items: JSON.parse(JSON.stringify(currentRef.current)),
          description: last.description,
        }
        const next = [...uPrev, undoEntry]
        return next.length > MAX_STACK ? next.slice(-MAX_STACK) : next
      })

      if (restored) currentRef.current = restored
      return prev.slice(0, -1)
    })
    return restored
  }, [])

  return {
    pushState,
    syncCurrent,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
  }
}
