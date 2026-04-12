'use client'

import { memo, useState, useCallback, useEffect, useRef } from 'react'
import type { BaseItem, Method, AreaRange } from '@/lib/estimate/types'
import { fm } from '@/lib/utils/format'
import type { PriceMatrixStore } from '@/components/settings/usePriceMatrixStore'

export interface PriceMatrixEditingCell {
  item_index: number
  field: 'mat' | 'labor' | 'exp'
}

interface Props {
  items: BaseItem[]
  method: Method
  areaRange: AreaRange
  ppp: number
  store: PriceMatrixStore
}

/**
 * 선택된 평단가의 공종별 5열 표 (공종명/재료/인건/경비/합).
 * 합 컬럼 자동계산. 하단 평단가 비교 표시.
 */
function PriceMatrixDetailTableInner({ items, method, areaRange, ppp, store }: Props) {
  const [editingCell, setEditingCell] = useState<PriceMatrixEditingCell | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = useCallback(
    (itemIndex: number, field: 'mat' | 'labor' | 'exp') => {
      const val = store.getCellValue(method, areaRange, ppp, itemIndex, field)
      setEditingCell({ item_index: itemIndex, field })
      setEditValue(String(val))
    },
    [store, method, areaRange, ppp],
  )

  const commitEdit = useCallback(() => {
    if (!editingCell) return
    const parsed = parseInt(editValue, 10)
    if (!isNaN(parsed)) {
      store.commitCellEdit(method, areaRange, ppp, editingCell.item_index, editingCell.field, parsed)
    }
    setEditingCell(null)
  }, [editingCell, editValue, store, method, areaRange, ppp])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
  }, [])

  // unmount 시 편집 중인 값 자동 커밋 (탭 전환 소실 방지)
  const editingRef = useRef(editingCell)
  const editValueRef = useRef(editValue)
  editingRef.current = editingCell
  editValueRef.current = editValue
  useEffect(() => {
    return () => {
      const cell = editingRef.current
      if (!cell) return
      const parsed = parseInt(editValueRef.current, 10)
      if (!isNaN(parsed)) {
        store.commitCellEdit(method, areaRange, ppp, cell.item_index, cell.field, parsed)
      }
    }
  }, [store, method, areaRange, ppp])

  // 평단가 계산
  const currentTotal = store.computeUnitPrice(method, areaRange, ppp)
  const originalTotal = store.computeOriginalUnitPrice(method, areaRange, ppp)
  const diff = currentTotal - originalTotal

  return (
    <div>
      <table
        className="w-full table-fixed border-collapse text-sm"
        data-testid="price-matrix-detail-table"
      >
        <colgroup>
          <col className="w-[32%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
        </colgroup>
        <thead>
          <tr className="bg-surface-muted">
            <th className="border border-ink-faint/20 px-3 py-2 text-left text-xs font-medium text-ink-secondary">
              공종
            </th>
            <th className="border border-ink-faint/20 px-3 py-2 text-right text-xs font-medium text-ink-secondary">
              재료
            </th>
            <th className="border border-ink-faint/20 px-3 py-2 text-right text-xs font-medium text-ink-secondary">
              인건
            </th>
            <th className="border border-ink-faint/20 px-3 py-2 text-right text-xs font-medium text-ink-secondary">
              경비
            </th>
            <th className="border border-ink-faint/20 px-3 py-2 text-right text-xs font-medium text-brand">
              합
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const mat = store.getCellValue(method, areaRange, ppp, idx, 'mat')
            const labor = store.getCellValue(method, areaRange, ppp, idx, 'labor')
            const exp = store.getCellValue(method, areaRange, ppp, idx, 'exp')
            const rowSum = mat + labor + exp

            return (
              <tr key={idx} className="hover:bg-surface-muted/50">
                <td className="border border-ink-faint/20 px-3 py-2 font-medium text-ink whitespace-pre-line">
                  {item.name}
                </td>
                {(['mat', 'labor', 'exp'] as const).map((field) => {
                  const isEditing =
                    editingCell?.item_index === idx && editingCell?.field === field
                  const val = store.getCellValue(method, areaRange, ppp, idx, field)
                  return (
                    <td
                      key={field}
                      className={`border border-ink-faint/20 text-right font-mono tabular-nums ${
                        isEditing
                          ? 'bg-accent-50 p-0'
                          : 'cursor-pointer px-3 py-2 hover:bg-v-sel'
                      }`}
                      onClick={() => !isEditing && startEdit(idx, field)}
                      data-testid={`price-cell-${idx}-${field}`}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="w-full bg-accent-50 px-3 py-2 text-right font-mono outline-none"
                        />
                      ) : (
                        fm(val)
                      )}
                    </td>
                  )
                })}
                {/* 합 컬럼 — 편집 불가 */}
                <td className="border border-ink-faint/20 px-3 py-2 text-right font-mono tabular-nums font-semibold text-brand">
                  {fm(rowSum)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* 하단 평단가 비교 */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted px-4 py-2.5">
        <div className="text-sm text-ink-secondary">
          현재 평단가:{' '}
          <span className="font-semibold text-ink tabular-nums">{fm(originalTotal)}원</span>
        </div>
        {diff !== 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-muted">→</span>
            <span className="font-semibold text-ink tabular-nums">{fm(currentTotal)}원</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                diff > 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {diff > 0 ? '+' : ''}{fm(diff)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const PriceMatrixDetailTable = memo(PriceMatrixDetailTableInner)
export default PriceMatrixDetailTable
