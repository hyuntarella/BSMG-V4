'use client'

import { useCallback, useRef, useState } from 'react'
import type { EstimateItem, Method } from '@/lib/estimate/types'
import type { AcdbSearchResult } from '@/lib/acdb/types'
import { fm } from '@/lib/utils/format'
import { useExcelSelection } from '@/hooks/useExcelSelection'
import { useTableKeyboard } from '@/hooks/useTableKeyboard'
import { recalcAllTotals, markAsEdited } from '@/lib/estimate/tableLogic'
import ExcelCell from './ExcelCell'

interface ExcelLikeTableProps {
  items: EstimateItem[]
  method: Method
  areaM2: number
  onChange: (items: EstimateItem[]) => void
  onUndo?: () => void
  onRedo?: () => void
  maxRows?: number
  // Phase 4F props
  onToggleLock?: (itemIndex: number) => void
  onToggleHide?: (itemIndex: number) => void
  onAddFreeItem?: () => void
  // 검색
  searchQuery?: string
  onSearch?: (query: string) => void
  matchingRowIndexes?: number[]
  // acdb 자동완성
  acdbResults?: AcdbSearchResult[]
  onAcdbSearch?: (query: string) => void
  onAcdbSelect?: (result: AcdbSearchResult, rowIndex: number) => void
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
  onToggleLock,
  onToggleHide,
  onAddFreeItem,
  searchQuery,
  onSearch,
  matchingRowIndexes,
  acdbResults,
  onAcdbSearch,
  onAcdbSelect,
}: ExcelLikeTableProps) {
  const { activeCell, isEditing, select, startEditing, stopEditing, clear } = useExcelSelection()
  const pendingValueRef = useRef<{ value: string | number; field: string } | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [acdbSelectedIdx, setAcdbSelectedIdx] = useState(-1)

  const commitValue = useCallback(() => {
    if (!activeCell || !pendingValueRef.current) return
    const { row } = activeCell
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

  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+F → 검색 토글
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault()
      setShowSearch(prev => {
        const next = !prev
        if (next) {
          requestAnimationFrame(() => searchInputRef.current?.focus())
        } else {
          onSearch?.('')
        }
        return next
      })
      return
    }
    // 나머지는 useTableKeyboard에서 처리
  }, [onSearch])

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

  const combinedKeyDown = useCallback((e: React.KeyboardEvent) => {
    handleTableKeyDown(e)
    handleKeyDown(e)
  }, [handleTableKeyDown, handleKeyDown])

  // acdb 드롭다운 네비게이션
  const handleAcdbNavigate = useCallback((direction: 'up' | 'down') => {
    if (!acdbResults || acdbResults.length === 0) return
    setAcdbSelectedIdx(prev => {
      const max = Math.min(acdbResults.length, 8) - 1
      if (direction === 'down') return prev < max ? prev + 1 : 0
      return prev > 0 ? prev - 1 : max
    })
  }, [acdbResults])

  const handleAcdbSelect = useCallback((result: AcdbSearchResult) => {
    if (!activeCell) return
    onAcdbSelect?.(result, activeCell.row)
    setAcdbSelectedIdx(-1)
    stopEditing()
  }, [activeCell, onAcdbSelect, stopEditing])

  const totals = recalcAllTotals(items)
  const matchSet = new Set(matchingRowIndexes ?? [])

  return (
    <div
      className="overflow-auto rounded border border-gray-300"
      onKeyDown={combinedKeyDown}
      tabIndex={0}
      data-testid="excel-like-table"
    >
      {/* 검색 바 */}
      {showSearch && (
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border-b border-gray-200" data-testid="search-bar">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-gray-400">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery ?? ''}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="공종 검색 (Ctrl+F)"
            className="flex-1 text-sm bg-transparent outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSearch(false)
                onSearch?.('')
              }
            }}
            data-testid="search-input"
          />
          <span className="text-xs text-gray-400">
            {matchingRowIndexes?.length ?? 0}건
          </span>
          <button
            type="button"
            onClick={() => { setShowSearch(false); onSearch?.('') }}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        {/* 헤더 */}
        <thead className="sticky top-0 z-10">
          <tr className="bg-brand text-white text-sm font-semibold">
            <th className="w-[50px] border border-gray-300 px-1 text-center">
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
            const isMatch = matchSet.has(rowIdx)
            const isLump = item.unit === '식'
            return (
              <tr
                key={rowIdx}
                className={`h-[28px] ${isHidden ? 'opacity-40' : ''} ${isMatch ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                data-testid={`table-row-${rowIdx}`}
              >
                {/* 잠금/숨김 버튼 */}
                <td className="border border-gray-300 px-0.5 text-center w-[50px]">
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onToggleLock?.(rowIdx)}
                      className={`w-5 h-5 flex items-center justify-center rounded ${item.is_locked ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'}`}
                      title={item.is_locked ? '잠금 해제' : '잠금'}
                      data-testid={`lock-btn-${rowIdx}`}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        {item.is_locked
                          ? <path d="M7 11V7a5 5 0 0110 0v4" />
                          : <path d="M7 11V7a5 5 0 019.9-1" />
                        }
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleHide?.(rowIdx)}
                      className={`w-5 h-5 flex items-center justify-center rounded ${isHidden ? 'text-red-400' : 'text-gray-300 hover:text-gray-500'}`}
                      title={isHidden ? '숨김 해제' : '숨기기'}
                      data-testid={`hide-btn-${rowIdx}`}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        {isHidden ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </td>

                {/* 편집 가능 열 */}
                {EDITABLE_COLS.map((col, colIdx) => {
                  const cellValue = item[col.key as keyof EstimateItem] as string | number
                  const isCellSelected = activeCell?.row === rowIdx && activeCell?.col === colIdx
                  const isCellEditing = isCellSelected && isEditing

                  // lump 특별 처리: 식 단위 + 단가 열 → readonly
                  const isLumpReadonly = isLump && (col.key === 'mat' || col.key === 'labor' || col.key === 'exp')
                  // 품명 열인지
                  const isNameCol = col.key === 'name'
                  // 품명 열 편집 중일 때만 acdb 드롭다운
                  const showAcdb = isNameCol && isCellEditing

                  return (
                    <ExcelCell
                      key={col.key}
                      value={cellValue}
                      type={col.type}
                      isSelected={isCellSelected}
                      isEditing={isCellEditing}
                      isLocked={item.is_locked && col.type === 'number'}
                      isReadonly={isLumpReadonly}
                      width={col.width}
                      align={col.align}
                      onSelect={() => select(rowIdx, colIdx)}
                      onStartEditing={startEditing}
                      onCommit={(val) => {
                        pendingValueRef.current = { value: val, field: col.key }
                        commitValue()
                      }}
                      onCancel={cancelEdit}
                      acdbResults={showAcdb ? acdbResults?.slice(0, 8) : undefined}
                      acdbSelectedIndex={showAcdb ? acdbSelectedIdx : undefined}
                      onAcdbSearch={showAcdb ? onAcdbSearch : undefined}
                      onAcdbSelect={showAcdb ? handleAcdbSelect : undefined}
                      onAcdbNavigate={showAcdb ? handleAcdbNavigate : undefined}
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

      {/* 행 추가 버튼 */}
      {onAddFreeItem && (
        <button
          type="button"
          onClick={onAddFreeItem}
          className="w-full py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-1"
          data-testid="add-row-btn"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          행 추가
        </button>
      )}
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
