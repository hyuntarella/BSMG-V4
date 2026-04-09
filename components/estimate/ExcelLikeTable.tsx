'use client'

import { useCallback, useRef } from 'react'
import type { EstimateItem, Method } from '@/lib/estimate/types'
import { fm } from '@/lib/utils/format'
import { useExcelSelection } from '@/hooks/useExcelSelection'
import { useTableKeyboard } from '@/hooks/useTableKeyboard'
import { recalcRow, recalcAllTotals, markAsEdited } from '@/lib/estimate/tableLogic'
import ExcelCell from './ExcelCell'

interface ExcelLikeTableProps {
  items: EstimateItem[]
  method: Method
  areaM2: number
  onChange: (items: EstimateItem[]) => void
  onUndo?: () => void
  onRedo?: () => void
  maxRows?: number
}

/** 편집 가능한 열 정의 */
const EDITABLE_COLS = [
  { key: 'name', label: '품명', width: 154, type: 'text' as const, align: 'left' as const },
  { key: 'spec', label: '규격', width: 150, type: 'text' as const, align: 'left' as const },
  { key: 'unit', label: '단위', width: 81, type: 'text' as const, align: 'center' as const },
  { key: 'qty', label: '수량', width: 80, type: 'number' as const, align: 'right' as const },
  { key: 'mat', label: '재료단가', width: 106, type: 'number' as const, align: 'right' as const },
  { key: 'labor', label: '인건단가', width: 106, type: 'number' as const, align: 'right' as const },
  { key: 'exp', label: '경비단가', width: 106, type: 'number' as const, align: 'right' as const },
] as const

const COL_COUNT = EDITABLE_COLS.length

export default function ExcelLikeTable({
  items,
  method,
  areaM2,
  onChange,
  onUndo,
  onRedo,
  maxRows = 15,
}: ExcelLikeTableProps) {
  const { activeCell, isEditing, select, startEditing, stopEditing, clear } = useExcelSelection()
  const pendingValueRef = useRef<{ value: string | number; field: string } | null>(null)

  const commitValue = useCallback(() => {
    if (!activeCell || !pendingValueRef.current) return
    const { row, col } = activeCell
    const { value, field } = pendingValueRef.current
    const item = items[row]
    if (!item) return

    const edited = markAsEdited(item, field as 'qty' | 'mat' | 'labor' | 'exp' | 'name' | 'spec' | 'unit', value)
    const newItems = [...items]
    newItems[row] = edited
    onChange(newItems)
    pendingValueRef.current = null
  }, [activeCell, items, onChange])

  const cancelEdit = useCallback(() => {
    pendingValueRef.current = null
  }, [])

  const { handleKeyDown } = useTableKeyboard({
    activeCell,
    isEditing,
    items,
    colCount: COL_COUNT,
    onSelect: select,
    onStartEditing: startEditing,
    onStopEditing: stopEditing,
    onCommitValue: commitValue,
    onCancelEdit: cancelEdit,
    onUndo,
    onRedo,
  })

  const totals = recalcAllTotals(items)

  return (
    <div
      className="overflow-auto rounded border border-gray-300"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="excel-like-table"
    >
      <table className="w-full border-collapse text-sm">
        {/* 헤더 */}
        <thead className="sticky top-0 z-10">
          <tr className="bg-brand text-white text-sm font-semibold">
            <th className="w-[30px] border border-gray-300 px-1 text-center">
              {/* 잠금/숨김 아이콘 열 */}
            </th>
            {EDITABLE_COLS.map((col) => (
              <th
                key={col.key}
                className="border border-gray-300 px-1 py-1 text-center"
                style={{ width: `${col.width}px` }}
              >
                {col.label}
              </th>
            ))}
            <th className="border border-gray-300 px-1 py-1 text-center" style={{ width: '106px' }}>
              재료금액
            </th>
            <th className="border border-gray-300 px-1 py-1 text-center" style={{ width: '106px' }}>
              인건금액
            </th>
            <th className="border border-gray-300 px-1 py-1 text-center" style={{ width: '106px' }}>
              경비금액
            </th>
            <th className="border border-gray-300 px-1 py-1 text-center" style={{ width: '96px' }}>
              합계
            </th>
          </tr>
        </thead>

        {/* 본문 */}
        <tbody>
          {items.map((item, rowIdx) => {
            const isHidden = item.is_hidden
            return (
              <tr
                key={rowIdx}
                className={`h-[28px] ${isHidden ? 'opacity-40' : ''}`}
                data-testid={`table-row-${rowIdx}`}
              >
                {/* 잠금/숨김 아이콘 */}
                <td className="border border-gray-300 px-1 text-center w-[30px]">
                  {item.is_locked && (
                    <span className="text-gray-400 text-xs" title="잠금됨">🔒</span>
                  )}
                </td>

                {/* 편집 가능 열 */}
                {EDITABLE_COLS.map((col, colIdx) => {
                  const cellValue = item[col.key as keyof EstimateItem] as string | number
                  const isCellSelected = activeCell?.row === rowIdx && activeCell?.col === colIdx
                  const isCellEditing = isCellSelected && isEditing

                  return (
                    <ExcelCell
                      key={col.key}
                      value={cellValue}
                      type={col.type}
                      isSelected={isCellSelected}
                      isEditing={isCellEditing}
                      isLocked={item.is_locked && col.type === 'number'}
                      width={col.width}
                      align={col.align}
                      onSelect={() => select(rowIdx, colIdx)}
                      onStartEditing={startEditing}
                      onCommit={(val) => {
                        pendingValueRef.current = { value: val, field: col.key }
                        commitValue()
                      }}
                      onCancel={cancelEdit}
                    />
                  )
                })}

                {/* 읽기 전용 금액 열 */}
                <td className="border border-gray-300 px-1 text-right font-mono tabular-nums text-gray-600 h-[28px]">
                  {fm(item.mat_amount)}
                </td>
                <td className="border border-gray-300 px-1 text-right font-mono tabular-nums text-gray-600 h-[28px]">
                  {fm(item.labor_amount)}
                </td>
                <td className="border border-gray-300 px-1 text-right font-mono tabular-nums text-gray-600 h-[28px]">
                  {fm(item.exp_amount)}
                </td>
                <td className="border border-gray-300 px-1 text-right font-mono tabular-nums font-semibold h-[28px]">
                  {fm(item.total)}
                </td>
              </tr>
            )
          })}
        </tbody>

        {/* 푸터 — 소계/공과잡비/이윤/계/합계 */}
        <tfoot className="sticky bottom-0 bg-gray-50">
          <FooterRow label="소 계" value={totals.subtotal} colSpan={8} />
          <FooterRow label="공과잡비" value={totals.overhead} suffix="3%" colSpan={8} />
          <FooterRow label="기업이윤" value={totals.profit} suffix="6%" colSpan={8} />
          <FooterRow label="계" value={totals.totalBeforeRound} colSpan={8} />
          <tr className="border-t-2 border-gray-900 bg-gray-100 font-bold">
            <td colSpan={8} className="px-2 py-1.5 text-left text-sm">
              합 계 <span className="text-xs font-normal text-gray-500">(단수정리)</span>
            </td>
            <td colSpan={4} className="px-2 py-1.5 text-right font-mono tabular-nums text-base">
              {fm(totals.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function FooterRow({
  label,
  value,
  suffix,
  colSpan,
}: {
  label: string
  value: number
  suffix?: string
  colSpan: number
}) {
  return (
    <tr className="border-t border-gray-200">
      <td colSpan={colSpan} className="px-2 py-1 text-xs text-gray-600">
        {label}
        {suffix && <span className="ml-1 text-gray-400">({suffix})</span>}
      </td>
      <td colSpan={4} className="px-2 py-1 text-right font-mono tabular-nums text-xs">
        {fm(value)}
      </td>
    </tr>
  )
}
