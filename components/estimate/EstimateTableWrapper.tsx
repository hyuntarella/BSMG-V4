'use client'

import { useCallback } from 'react'
import type { Estimate, EstimateItem } from '@/lib/estimate/types'
import type { AcdbSearchResult } from '@/lib/acdb/types'
import { useEstimateSearch } from '@/hooks/useEstimateSearch'
import {
  applyUrethaneBase05,
  deriveBase05FromItem,
  syncWallAndTop,
} from '@/lib/estimate/syncUrethane'
import { calc } from '@/lib/estimate/calc'
import { chipToEstimateItem, type QuickChip } from '@/lib/estimate/quickChipConfig'
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
  // 우레탄 0.5mm 동기화가 ON이면:
  //   1) 편집된 행이 노출 우레탄 3종 (u1/u2/복합노출) 중 하나일 때 배수 역산 → 양쪽 시트 재정렬
  //   2) 편집된 행이 벽체/상도일 때 반대 시트에도 1:1 복사
  // 현재 편집 중인 시트(sheetType)에 따라 반대 시트의 인덱스를 찾아 업데이트한다.
  const updateItems = useCallback((newItems: EstimateItem[], description: string) => {
    onSaveSnapshot?.(description)
    const calcResult = calc(newItems.filter(i => !i.is_hidden))
    let sheets = [...estimate.sheets]
    sheets[sheetIndex] = { ...sheets[sheetIndex], items: newItems, grand_total: calcResult.grandTotal }

    if (estimate.sync_urethane !== false) {
      const complexIdx = sheets.findIndex(s => s.type === '복합')
      const urethaneIdx = sheets.findIndex(s => s.type === '우레탄')

      if (complexIdx >= 0 && urethaneIdx >= 0) {
        // 편집된 시트의 항목에서 변경된 행 탐색: 이전 값과 다른 첫 번째 행
        const prevItems = estimate.sheets[sheetIndex].items
        const editedItem = newItems.find((item, i) => {
          const prev = prevItems[i]
          return !prev || prev.mat !== item.mat || prev.labor !== item.labor || prev.exp !== item.exp
        })

        if (editedItem) {
          // 1) 노출 우레탄 3종 배수 역산
          const base05 = deriveBase05FromItem(editedItem)
          if (base05) {
            const { complex, urethane } = applyUrethaneBase05(
              sheets[complexIdx].items,
              sheets[urethaneIdx].items,
              base05,
            )
            sheets[complexIdx] = {
              ...sheets[complexIdx],
              items: complex,
              grand_total: calc(complex.filter(i => !i.is_hidden)).grandTotal,
            }
            sheets[urethaneIdx] = {
              ...sheets[urethaneIdx],
              items: urethane,
              grand_total: calc(urethane.filter(i => !i.is_hidden)).grandTotal,
            }
          } else {
            // 2) 벽체/상도: 편집된 시트 → 반대 시트 1:1 복사
            const canonName = editedItem.name.replace(/\s+/g, '')
            if (canonName === '벽체우레탄' || canonName === '우레탄상도') {
              const direction = sheetType === '우레탄' ? 'urethane-to-complex' : 'complex-to-urethane'
              const { complex, urethane } = syncWallAndTop(
                sheets[complexIdx].items,
                sheets[urethaneIdx].items,
                direction,
              )
              sheets[complexIdx] = {
                ...sheets[complexIdx],
                items: complex,
                grand_total: calc(complex.filter(i => !i.is_hidden)).grandTotal,
              }
              sheets[urethaneIdx] = {
                ...sheets[urethaneIdx],
                items: urethane,
                grand_total: calc(urethane.filter(i => !i.is_hidden)).grandTotal,
              }
            }
          }
        }
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

  // --- 행 삭제 ---
  // 기본 8공종(is_base=true)은 삭제 불가 — 숨김만 허용. 칩으로 추가한 is_base=false 행만 제거한다.
  const handleDeleteRow = useCallback((itemIndex: number) => {
    const target = items[itemIndex]
    if (!target || target.is_base) return
    onSaveSnapshot?.('행 삭제')
    const newItems = items
      .filter((_, i) => i !== itemIndex)
      .map((it, i) => ({ ...it, sort_order: i + 1 }))
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

  // --- #10 빠른공종추가 칩 클릭 ---
  const handleQuickAdd = useCallback((chip: QuickChip) => {
    onSaveSnapshot?.(`빠른 추가: ${chip.name}`)
    const newItem = chipToEstimateItem(chip, items.length + 1)
    const newItems = [...items, newItem as EstimateItem]
    const calcResult = calc(newItems.filter(i => !i.is_hidden))
    const sheets = [...estimate.sheets]
    sheets[sheetIndex] = {
      ...sheets[sheetIndex],
      items: newItems,
      grand_total: calcResult.grandTotal,
    }
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
      onDeleteRow={handleDeleteRow}
      onAddFreeItem={handleAddFreeItem}
      onQuickAdd={handleQuickAdd}
      searchQuery={estimateSearch.query}
      onSearch={estimateSearch.search}
      matchingRowIndexes={matchingRowIndexes}
      acdbResults={acdbSuggest?.results}
      onAcdbSearch={acdbSuggest?.search}
      onAcdbSelect={handleAcdbSelect}
    />
  )
}
