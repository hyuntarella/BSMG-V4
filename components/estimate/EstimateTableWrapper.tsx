'use client'

import { useCallback } from 'react'
import type { Estimate, EstimateItem } from '@/lib/estimate/types'
import type { AcdbSearchResult } from '@/lib/acdb/types'
import { useEstimateSearch } from '@/hooks/useEstimateSearch'
import { syncUrethaneItems } from '@/lib/estimate/syncUrethane'
import { calc } from '@/lib/estimate/calc'
import ExcelLikeTable from './ExcelLikeTable'

interface AcdbSuggestHook {
  results: AcdbSearchResult[]
  search: (q: string) => void
  clear: () => void
}

interface EstimateTableWrapperProps {
  estimate: Estimate
  sheetIndex: number
  onChange: (estimate: Estimate) => void
  acdbSuggest?: AcdbSuggestHook
  companyId?: string
  onUndo?: () => void
  onSaveSnapshot?: (description: string) => void
}

export default function EstimateTableWrapper({
  estimate,
  sheetIndex,
  onChange,
  acdbSuggest,
  onUndo,
  onSaveSnapshot,
}: EstimateTableWrapperProps) {
  const sheet = estimate.sheets[sheetIndex]
  const items = sheet?.items ?? []
  const sheetType = sheet?.type ?? '복합'

  // 검색
  const estimateSearch = useEstimateSearch(estimate.sheets)
  const matchingRowIndexes = estimateSearch.results
    .filter(r => r.sheetIndex === sheetIndex)
    .map(r => r.itemIndex)

  // --- items 변경 헬퍼 ---
  const updateItems = useCallback((newItems: EstimateItem[], description: string) => {
    onSaveSnapshot?.(description)
    const calcResult = calc(newItems.filter(i => !i.is_hidden))
    const sheets = [...estimate.sheets]
    sheets[sheetIndex] = { ...sheets[sheetIndex], items: newItems, grand_total: calcResult.grandTotal }

    // 우레탄 동기화: 우레탄 시트 변경 시 복합 시트 우레탄 관련 공종 동기화
    if (estimate.sync_urethane && sheetType === '우레탄') {
      const complexIdx = estimate.sheets.findIndex(s => s.type === '복합')
      if (complexIdx >= 0) {
        const synced = syncUrethaneItems(sheets[complexIdx].items, newItems)
        const syncCalc = calc(synced.filter(i => !i.is_hidden))
        sheets[complexIdx] = { ...sheets[complexIdx], items: synced, grand_total: syncCalc.grandTotal }
      }
    }

    onChange({ ...estimate, sheets })
  }, [estimate, sheetIndex, sheetType, onSaveSnapshot, onChange])

  // --- onChange from table (직접 items 변경) ---
  const handleItemsChange = useCallback((newItems: EstimateItem[]) => {
    updateItems(newItems, '셀 편집')
  }, [updateItems])

  // --- 잠금 토글 ---
  const handleToggleLock = useCallback((itemIndex: number) => {
    onSaveSnapshot?.('잠금 토글')
    const newItems = [...items]
    newItems[itemIndex] = { ...newItems[itemIndex], is_locked: !newItems[itemIndex].is_locked }
    const sheets = [...estimate.sheets]
    sheets[sheetIndex] = { ...sheets[sheetIndex], items: newItems }
    onChange({ ...estimate, sheets })
  }, [items, estimate, sheetIndex, onSaveSnapshot, onChange])

  // --- 숨김 토글 ---
  const handleToggleHide = useCallback((itemIndex: number) => {
    onSaveSnapshot?.('숨김 토글')
    const newItems = [...items]
    newItems[itemIndex] = { ...newItems[itemIndex], is_hidden: !newItems[itemIndex].is_hidden }
    const calcResult = calc(newItems.filter(i => !i.is_hidden))
    const sheets = [...estimate.sheets]
    sheets[sheetIndex] = { ...sheets[sheetIndex], items: newItems, grand_total: calcResult.grandTotal }
    onChange({ ...estimate, sheets })
  }, [items, estimate, sheetIndex, onSaveSnapshot, onChange])

  // --- 자유입력 행 추가 ---
  const handleAddFreeItem = useCallback(() => {
    onSaveSnapshot?.('행 추가')
    const newItem: EstimateItem = {
      sort_order: items.length + 1,
      name: '',
      spec: '',
      unit: 'm²',
      qty: 1,
      mat: 0,
      labor: 0,
      exp: 0,
      mat_amount: 0,
      labor_amount: 0,
      exp_amount: 0,
      total: 0,
      is_base: false,
      is_equipment: false,
      is_fixed_qty: false,
    }
    const newItems = [...items, newItem]
    const sheets = [...estimate.sheets]
    sheets[sheetIndex] = { ...sheets[sheetIndex], items: newItems }
    onChange({ ...estimate, sheets })
  }, [items, estimate, sheetIndex, onSaveSnapshot, onChange])

  // --- Undo ---
  const handleUndo = useCallback(() => {
    onUndo?.()
  }, [onUndo])

  // --- acdb 선택 ---
  const handleAcdbSelect = useCallback((result: AcdbSearchResult, rowIndex: number) => {
    onSaveSnapshot?.('acdb 선택')
    const newItems = [...items]
    const item = { ...newItems[rowIndex] }
    item.name = result.entry.display
    if (result.entry.spec_default) item.spec = result.entry.spec_default
    if (result.entry.unit) item.unit = result.entry.unit
    newItems[rowIndex] = item
    const sheets = [...estimate.sheets]
    sheets[sheetIndex] = { ...sheets[sheetIndex], items: newItems }
    onChange({ ...estimate, sheets })
    acdbSuggest?.clear()
  }, [items, estimate, sheetIndex, onSaveSnapshot, onChange, acdbSuggest])

  if (!sheet) return null

  return (
    <ExcelLikeTable
      items={items}
      method={sheetType}
      areaM2={estimate.m2}
      onChange={handleItemsChange}
      onUndo={handleUndo}
      onRedo={undefined}
      onToggleLock={handleToggleLock}
      onToggleHide={handleToggleHide}
      onAddFreeItem={handleAddFreeItem}
      searchQuery={estimateSearch.query}
      onSearch={estimateSearch.search}
      matchingRowIndexes={matchingRowIndexes}
      acdbResults={acdbSuggest?.results}
      onAcdbSearch={acdbSuggest?.search}
      onAcdbSelect={handleAcdbSelect}
    />
  )
}
