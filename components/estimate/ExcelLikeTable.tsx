'use client'

import { useCallback, useRef, useState } from 'react'
import type { EstimateItem, Method } from '@/lib/estimate/types'
import type { AcdbSearchResult } from '@/lib/acdb/types'
import type { CellPosition } from '@/hooks/useExcelSelection'
import { fm } from '@/lib/utils/format'
import { useExcelSelection } from '@/hooks/useExcelSelection'
import { useTableKeyboard } from '@/hooks/useTableKeyboard'
import { recalcAllTotals, markAsEdited } from '@/lib/estimate/tableLogic'
import { calcTableTier } from '@/lib/estimate/tableLayout'
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

/** 단위 선택 옵션 */
const UNIT_OPTIONS = ['m²', '식', '일', '평', 'm', '본', 'EA', 'SET', '회'] as const

/** 편집 가능한 열 정의 */
const EDITABLE_COLS = [
  { key: 'name', label: '품명', width: 154, type: 'text' as const, align: 'left' as const },
  { key: 'spec', label: '규격', width: 150, type: 'text' as const, align: 'left' as const },
  { key: 'unit', label: '단위', width: 81, type: 'select' as const, align: 'center' as const },
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
  /** activeCell 백업 — commitValue에서 activeCell이 null일 때 fallback */
  const lastActiveCellRef = useRef<CellPosition | null>(null)
  /** 키보드 commit 완료 플래그 — onBlur 이중 커밋 방지 */
  const keyboardCommittedRef = useRef(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [acdbSelectedIdx, setAcdbSelectedIdx] = useState(-1)
  /** 타이핑으로 편집 진입 시 첫 글자 */
  const typeToEditCharRef = useRef<string | null>(null)
  const [warningDismissed, setWarningDismissed] = useState(false)
  const prevOverThresholdRef = useRef(false)

  // lastActiveCellRef 동기화: activeCell이 유효할 때마다 백업
  if (activeCell) {
    lastActiveCellRef.current = activeCell
  }

  // Phase 4H: visible items 기준 tier 계산
  const visibleItems = items.filter(item => !item.is_hidden)
  const visibleCount = visibleItems.length
  const tier = calcTableTier(visibleCount)
  const isOverThreshold = visibleCount >= 21

  // 21 이상으로 다시 올라가면 dismiss 리셋
  if (isOverThreshold && !prevOverThresholdRef.current && warningDismissed) {
    setWarningDismissed(false)
  }
  prevOverThresholdRef.current = isOverThreshold

  const commitValue = useCallback(() => {
    const cell = activeCell ?? lastActiveCellRef.current
    console.log('[COMMIT] commitValue', { activeCell: activeCell ? `${activeCell.row},${activeCell.col}` : null, lastActive: lastActiveCellRef.current ? `${lastActiveCellRef.current.row},${lastActiveCellRef.current.col}` : null, pending: pendingValueRef.current })
    if (!cell || !pendingValueRef.current) return
    const { row } = cell
    const { value, field } = pendingValueRef.current
    const item = items[row]
    if (!item) return

    const edited = markAsEdited(item, field as 'qty' | 'mat' | 'labor' | 'exp' | 'name' | 'spec' | 'unit', value)
    const newItems = [...items]
    newItems[row] = edited
    onChange(newItems)
    pendingValueRef.current = null
    keyboardCommittedRef.current = true
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

  const handleTypeToEdit = useCallback((char: string) => {
    typeToEditCharRef.current = char
  }, [])

  // 편집 시작 시 키보드 커밋 플래그 리셋
  const handleStartEditing = useCallback(() => {
    keyboardCommittedRef.current = false
    startEditing()
  }, [startEditing])

  const { handleKeyDown } = useTableKeyboard({
    activeCell,
    isEditing,
    items,
    colCount: COL_COUNT,
    onSelect: select,
    onStartEditing: handleStartEditing,
    onStopEditing: stopEditing,
    onCommitValue: commitValue,
    onCancelEdit: cancelEdit,
    onUndo,
    onRedo,
    onTypeToEdit: handleTypeToEdit,
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

      {/* Phase 4H: 경고 배너 (tier 4) */}
      {tier.showOverflowWarning && !warningDismissed && (
        <div
          className="flex items-center gap-2 px-3 py-2 bg-yellow-100 border-b border-yellow-300 text-sm text-yellow-800"
          data-testid="overflow-warning"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-yellow-600">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            공종 수가 많습니다({visibleItems.length}개). 공정 분리를 고려해주세요. (옥상/외벽/주차장 분리는 Phase 4.5 지원 예정)
          </span>
          <button
            type="button"
            onClick={() => setWarningDismissed(true)}
            className="ml-auto text-yellow-600 hover:text-yellow-800 flex-shrink-0"
            data-testid="overflow-warning-dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <table className={`w-full border-collapse ${tier.fontClass}`}>
        {/* 헤더 */}
        <thead className="sticky top-0 z-10">
          <tr className="bg-brand text-white font-semibold" style={{ height: `${tier.headerHeight}px` }}>
            <th className="w-[50px] border border-gray-300 px-1 text-center">
              {/* 잠금/숨김 아이콘 열 */}
            </th>
            {EDITABLE_COLS.map((col) => (
              <th
                key={col.key}
                className={`border border-gray-300 px-1 ${tier.paddingClass} text-center`}
                style={{ width: `${col.width}px` }}
              >
                {col.label}
              </th>
            ))}
            <th className={`border border-gray-300 px-1 ${tier.paddingClass} text-center`} style={{ width: '110px' }}>
              단가합
            </th>
            <th className={`border border-gray-300 px-1 ${tier.paddingClass} text-center`} style={{ width: '110px' }}>
              금액합
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
                className={`${isHidden ? 'opacity-40' : ''} ${isMatch ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                style={{ height: `${tier.rowHeight}px` }}
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

                  const isUnitCol = col.key === 'unit'

                  // 타이핑 편집 진입: 해당 셀만 initialChar 전달 후 ref 클리어
                  const cellInitialChar = isCellEditing && typeToEditCharRef.current
                    ? typeToEditCharRef.current
                    : undefined
                  if (cellInitialChar) typeToEditCharRef.current = null

                  return (
                    <ExcelCell
                      key={col.key}
                      value={cellValue}
                      type={col.type}
                      selectOptions={isUnitCol ? UNIT_OPTIONS as unknown as string[] : undefined}
                      isSelected={isCellSelected}
                      isEditing={isCellEditing}
                      initialChar={cellInitialChar}
                      isLocked={item.is_locked && col.type === 'number'}
                      isReadonly={isLumpReadonly}
                      width={col.width}
                      align={col.align}
                      tierFontClass={tier.fontClass}
                      tierPaddingClass={tier.paddingClass}
                      tierRowHeight={tier.rowHeight}
                      onSelect={() => select(rowIdx, colIdx)}
                      onStartEditing={handleStartEditing}
                      onCommit={(val) => {
                        // onBlur 경로: 키보드가 이미 커밋했으면 스킵
                        if (keyboardCommittedRef.current) {
                          console.log('[COMMIT] onCommit skipped (keyboard already committed)')
                          return
                        }
                        pendingValueRef.current = { value: val, field: col.key }
                        commitValue()
                      }}
                      onEditChange={(val) => {
                        pendingValueRef.current = { value: val, field: col.key }
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

                {/* 읽기 전용 금액 열: 단가합 / 금액합 */}
                <td className="border border-gray-300 px-1 text-right font-mono tabular-nums text-gray-600" style={{ height: `${tier.rowHeight}px` }}>
                  {fm(item.mat + item.labor + item.exp)}
                </td>
                <td className="border border-gray-300 px-1 text-right font-mono tabular-nums font-semibold" style={{ height: `${tier.rowHeight}px` }}>
                  {fm(item.total)}
                </td>
              </tr>
            )
          })}
        </tbody>

        {/* 푸터 — 소계/공과잡비/이윤/계/합계 */}
        <tfoot className="sticky bottom-0 bg-gray-50">
          <FooterRow label="소 계" value={totals.subtotal} colSpan={9} />
          <FooterRow label="공과잡비" value={totals.overhead} suffix="3%" colSpan={9} />
          <FooterRow label="기업이윤" value={totals.profit} suffix="6%" colSpan={9} />
          <FooterRow label="계" value={totals.totalBeforeRound} colSpan={9} />
          <tr className="border-t-2 border-gray-900 bg-gray-100 font-bold">
            <td colSpan={9} className="px-2 py-1.5 text-left text-sm">
              합 계 <span className="text-xs font-normal text-gray-500">(단수정리)</span>
            </td>
            <td colSpan={1} className="px-2 py-1.5 text-right font-mono tabular-nums text-base">
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
      <td colSpan={1} className="px-2 py-1 text-right font-mono tabular-nums text-xs">
        {fm(value)}
      </td>
    </tr>
  )
}
