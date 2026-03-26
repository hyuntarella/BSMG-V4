'use client'

import { useState, useCallback, useRef } from 'react'
import type { Estimate, EstimateSheet, EstimateItem, PriceMatrixRaw } from '@/lib/estimate/types'
import { buildItems } from '@/lib/estimate/buildItems'
import { calc } from '@/lib/estimate/calc'
import { getMargin } from '@/lib/estimate/margin'
import { getAR } from '@/lib/estimate/areaRange'
import type { VoiceCommand } from '@/lib/voice/commands'
import { applyCommands } from '@/lib/voice/commands'
import { routeCommands } from '@/lib/voice/confidenceRouter'

interface ChangeRecord {
  type: 'voice' | 'manual' | 'auto'
  data: Record<string, unknown>
  timestamp: number
}

export function useEstimate(initialEstimate: Estimate, priceMatrix: PriceMatrixRaw) {
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate)
  const [isDirty, setIsDirty] = useState(false)
  const changesRef = useRef<ChangeRecord[]>([])

  // ── 메타 업데이트 ──
  const updateMeta = useCallback(
    (field: keyof Estimate, value: string | number) => {
      setEstimate((prev) => {
        const updated = { ...prev, [field]: value }

        // m2 변경 시 전체 재계산
        if (field === 'm2' || field === 'wall_m2') {
          updated.sheets = prev.sheets.map((sheet) =>
            rebuildSheet(sheet, updated.m2, updated.wall_m2, priceMatrix)
          )
        }

        return updated
      })
      setIsDirty(true)
      recordChange('manual', { field, value })
    },
    [priceMatrix],
  )

  // ── 시트 필드 업데이트 (평단가 등) ──
  const updateSheet = useCallback(
    (sheetIndex: number, field: string, value: number) => {
      setEstimate((prev) => {
        const sheets = [...prev.sheets]
        const sheet = { ...sheets[sheetIndex], [field]: value }

        // 평단가 변경 시 재계산
        if (field === 'price_per_pyeong') {
          const rebuilt = rebuildSheet(sheet, prev.m2, prev.wall_m2, priceMatrix)
          sheets[sheetIndex] = rebuilt
        } else {
          sheets[sheetIndex] = sheet
        }

        return { ...prev, sheets }
      })
      setIsDirty(true)
      recordChange('manual', { sheetIndex, field, value })
    },
    [priceMatrix],
  )

  // ── 아이템 필드 업데이트 ──
  const updateItem = useCallback(
    (sheetIndex: number, itemIndex: number, field: string, value: number) => {
      setEstimate((prev) => {
        const sheets = [...prev.sheets]
        const items = [...sheets[sheetIndex].items]
        const item = { ...items[itemIndex], [field]: value }

        // 금액 재계산
        item.mat_amount = Math.round(item.qty * item.mat)
        item.labor_amount = Math.round(item.qty * item.labor)
        item.exp_amount = Math.round(item.qty * item.exp)
        item.total = item.mat_amount + item.labor_amount + item.exp_amount

        items[itemIndex] = item
        const calcResult = calc(items)
        sheets[sheetIndex] = { ...sheets[sheetIndex], items, grand_total: calcResult.grandTotal }

        return { ...prev, sheets }
      })
      setIsDirty(true)
      recordChange('manual', { sheetIndex, itemIndex, field, value })
    },
    [],
  )

  // ── 음성 명령 적용 ──
  const applyVoiceCommands = useCallback(
    (commands: VoiceCommand[], sheetIndex: number = 0) => {
      const routing = routeCommands(commands)

      if (!routing.shouldExecute) {
        return { executed: false, routing }
      }

      setEstimate((prev) => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev

        const { sheet: updatedSheet } = applyCommands(sheets[sheetIndex], commands)
        sheets[sheetIndex] = updatedSheet

        return { ...prev, sheets }
      })

      setIsDirty(true)
      recordChange('voice', { commands })

      return { executed: true, routing }
    },
    [],
  )

  // ── 시트 추가 ──
  const addSheet = useCallback(
    (type: '복합' | '우레탄') => {
      setEstimate((prev) => {
        if (prev.sheets.some(s => s.type === type)) return prev

        const ar = getAR(prev.m2 || 100)
        const methodData = priceMatrix[ar]?.[type]
        const prices = methodData ? Object.keys(methodData).map(Number).sort((a, b) => a - b) : []
        const ppp = prices[Math.floor(prices.length / 2)] ?? 35000

        const { items, calcResult } = buildItems({
          method: type,
          m2: prev.m2,
          wallM2: prev.wall_m2,
          pricePerPyeong: ppp,
          priceMatrix,
        })

        const newSheet: EstimateSheet = {
          type,
          title: type === '복합' ? '복합방수' : '우레탄방수',
          price_per_pyeong: ppp,
          warranty_years: 5,
          warranty_bond: 3,
          grand_total: calcResult.grandTotal,
          sort_order: type === '복합' ? 0 : 1,
          items,
        }

        const sheets = [...prev.sheets, newSheet].sort((a, b) => a.sort_order - b.sort_order)
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [priceMatrix],
  )

  // ── 마진율 계산 ──
  const getSheetMargin = useCallback(
    (sheetIndex: number): number => {
      const sheet = estimate.sheets[sheetIndex]
      if (!sheet) return 0
      return getMargin(sheet.type, estimate.m2, sheet.grand_total)
    },
    [estimate],
  )

  // ── 실행 취소 (최근 변경 되돌리기) ──
  const [undoStack, setUndoStack] = useState<Estimate[]>([])

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-9), estimate])
  }, [estimate])

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setEstimate(last)
      return prev.slice(0, -1)
    })
    setIsDirty(true)
  }, [])

  // ── dirty 초기화 ──
  const markClean = useCallback(() => {
    setIsDirty(false)
  }, [])

  function recordChange(type: ChangeRecord['type'], data: Record<string, unknown>) {
    changesRef.current.push({ type, data, timestamp: Date.now() })
  }

  return {
    estimate,
    setEstimate,
    isDirty,
    markClean,
    updateMeta,
    updateSheet,
    updateItem,
    applyVoiceCommands,
    addSheet,
    getSheetMargin,
    pushUndo,
    undo,
    changes: changesRef,
  }
}

// ── 시트 재빌드 (면적/평단가 변경 시) ──
function rebuildSheet(
  sheet: EstimateSheet,
  m2: number,
  wallM2: number,
  priceMatrix: PriceMatrixRaw,
): EstimateSheet {
  const { items, calcResult } = buildItems({
    method: sheet.type,
    m2,
    wallM2,
    pricePerPyeong: sheet.price_per_pyeong,
    priceMatrix,
  })

  return {
    ...sheet,
    items,
    grand_total: calcResult.grandTotal,
  }
}
