'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { fm } from '@/lib/utils/format'
import type { AcdbSearchResult } from '@/lib/acdb/types'

export type CellState = 'idle' | 'hovered' | 'selected' | 'editing'
export type CellType = 'text' | 'number' | 'select'

interface ExcelCellProps {
  value: string | number
  type?: CellType
  selectOptions?: string[]
  isSelected: boolean
  isEditing: boolean
  isLocked?: boolean
  isReadonly?: boolean
  /** 기본값 표시 — 편집 가능하지만 아직 사용자가 수정하지 않은 고정 기본값임을 시각적으로 표시 (반투명) */
  isMuted?: boolean
  width?: number
  align?: 'left' | 'center' | 'right'
  /** 타이핑으로 편집 진입 시 첫 글자 (selectAll 대신 덮어쓰기) */
  initialChar?: string
  onSelect: () => void
  onStartEditing: () => void
  onCommit: (value: string | number) => void
  onCancel: () => void
  /** 편집 중 값이 바뀔 때마다 호출 — 키보드 commit 경로용 pendingValue 동기화 */
  onEditChange?: (value: string | number) => void
  // Phase 4H: tier별 스타일
  tierFontClass?: string
  tierPaddingClass?: string
  tierRowHeight?: number
  // acdb 자동완성 (품명 열에만 연결)
  acdbResults?: AcdbSearchResult[]
  acdbSelectedIndex?: number
  onAcdbSearch?: (query: string) => void
  onAcdbSelect?: (result: AcdbSearchResult) => void
  onAcdbNavigate?: (direction: 'up' | 'down') => void
}

export default function ExcelCell({
  value,
  type = 'number',
  isSelected,
  isEditing,
  isLocked,
  isReadonly,
  isMuted,
  width,
  align = 'right',
  selectOptions,
  initialChar,
  onSelect,
  onStartEditing,
  onCommit,
  onCancel,
  onEditChange,
  tierFontClass,
  tierPaddingClass,
  tierRowHeight,
  acdbResults,
  acdbSelectedIndex,
  onAcdbSearch,
  onAcdbSelect,
  onAcdbNavigate,
}: ExcelCellProps) {
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 편집 모드 진입 시 input 포커스 + pendingValue 동기화
  useEffect(() => {
    if (isEditing && type !== 'select') {
      if (initialChar) {
        // 타이핑으로 진입: 첫 글자로 덮어쓰기
        setEditValue(initialChar)
        // 키보드 commit용 pendingValue 즉시 동기화
        if (type === 'number') {
          const parsed = parseFloat(initialChar.replace(/,/g, ''))
          onEditChange?.(isNaN(parsed) ? 0 : parsed)
        } else {
          onEditChange?.(initialChar)
        }
        requestAnimationFrame(() => {
          inputRef.current?.focus()
        })
      } else {
        // 클릭/Enter/F2로 진입: 전체 선택 (타이핑 시 자동 덮어쓰기)
        setEditValue(String(value))
        // 현재 값도 동기화 (변경 없이 Enter 시 대비)
        onEditChange?.(value)
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, value, initialChar])

  const handleCommit = useCallback(() => {
    if (type === 'number') {
      const parsed = parseFloat(editValue.replace(/,/g, ''))
      onCommit(isNaN(parsed) ? 0 : parsed)
    } else {
      onCommit(editValue)
    }
  }, [editValue, type, onCommit])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setEditValue(v)
    // 키보드 commit용 pendingValue 즉시 동기화
    if (type === 'number') {
      const parsed = parseFloat(v.replace(/,/g, ''))
      onEditChange?.(isNaN(parsed) ? 0 : parsed)
    } else {
      onEditChange?.(v)
    }
    onAcdbSearch?.(v)
  }, [type, onEditChange, onAcdbSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!acdbResults || acdbResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      onAcdbNavigate?.('down')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      onAcdbNavigate?.('up')
    } else if (e.key === 'Enter' && acdbSelectedIndex != null && acdbSelectedIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      onAcdbSelect?.(acdbResults[acdbSelectedIndex])
    }
  }, [acdbResults, acdbSelectedIndex, onAcdbNavigate, onAcdbSelect])

  const displayValue = type === 'number' && typeof value === 'number'
    ? fm(value)
    : String(value)

  const alignClass = align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'
  const fontClass = tierFontClass ?? 'text-sm'
  const padClass = tierPaddingClass ?? 'px-1'
  const rowH = tierRowHeight ?? 28

  // readonly 셀은 편집 불가
  if (isReadonly) {
    return (
      <td
        className={`relative px-1 ${fontClass} cursor-default border border-gray-300 select-none bg-gray-50
          ${alignClass} ${type === 'number' ? 'font-mono tabular-nums' : ''}`}
        style={{ width: width ? `${width}px` : undefined, height: `${rowH}px` }}
        data-testid="excel-cell-readonly"
      >
        <span className="text-gray-400">{displayValue}</span>
      </td>
    )
  }

  // select 타입: 항상 <select> 렌더 (edit mode 개념 제거, 1-클릭으로 네이티브 드롭다운 즉시 열림)
  if (type === 'select' && selectOptions) {
    return (
      <td
        className={`relative p-0 border border-gray-300 ${isSelected ? 'ring-2 ring-brand-500 ring-inset bg-white' : 'bg-white hover:bg-gray-50'}`}
        style={{ width: width ? `${width}px` : undefined }}
        onClick={() => {
          if (!isSelected) onSelect()
        }}
      >
        <select
          value={String(value)}
          onChange={(e) => {
            onCommit(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
          }}
          className={`w-full ${padClass} ${fontClass} bg-transparent outline-none cursor-pointer ${alignClass}`}
          style={{ height: `${rowH}px` }}
          data-testid="excel-cell-select"
        >
          {selectOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </td>
    )
  }

  if (isEditing) {
    return (
      <td
        className="relative p-0 bg-yellow-50 ring-2 ring-brand-600 ring-inset"
        style={{ width: width ? `${width}px` : undefined }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode={type === 'number' ? 'numeric' : 'text'}
          value={editValue}
          onChange={handleChange}
          onBlur={() => {
            // 드롭다운 클릭 시 blur 무시
            requestAnimationFrame(() => {
              if (!dropdownRef.current?.contains(document.activeElement)) {
                handleCommit()
              }
            })
          }}
          onKeyDown={handleKeyDown}
          className={`w-full px-1 ${fontClass} bg-transparent outline-none ${alignClass} ${type === 'number' ? 'font-mono' : ''}`}
          style={{ height: `${rowH}px` }}
          data-testid="excel-cell-input"
        />
        {/* acdb 자동완성 드롭다운 */}
        {acdbResults && acdbResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full z-50 w-full max-h-[240px] overflow-y-auto bg-white border border-gray-300 rounded-b shadow-lg"
            data-testid="acdb-dropdown"
          >
            {acdbResults.map((r, i) => (
              <button
                key={r.entry.canon}
                type="button"
                className={`w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 ${i === acdbSelectedIndex ? 'bg-blue-100' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onAcdbSelect?.(r)
                }}
                data-testid={`acdb-option-${i}`}
              >
                <span className="font-medium">{r.entry.display}</span>
                {r.entry.spec_default && (
                  <span className="ml-2 text-gray-400 text-xs">{r.entry.spec_default}</span>
                )}
                <span className="ml-1 text-gray-300 text-xs">({r.entry.used_count}회)</span>
              </button>
            ))}
          </div>
        )}
      </td>
    )
  }

  return (
    <td
      className={`relative px-1 ${fontClass} cursor-default border border-gray-300 select-none
        ${isSelected ? 'ring-2 ring-brand-500 ring-inset bg-white' : 'bg-white hover:bg-gray-50'}
        ${alignClass}
        ${type === 'number' ? 'font-mono tabular-nums' : ''}`}
      style={{ width: width ? `${width}px` : undefined, height: `${rowH}px` }}
      onClick={() => {
        if (isSelected) {
          // 이미 선택된 셀 → 싱글클릭으로 편집 진입 (엑셀 UX)
          if (!isLocked || type === 'text') {
            onStartEditing()
          }
        } else {
          onSelect()
        }
      }}
      data-testid="excel-cell"
      data-muted={isMuted ? 'true' : undefined}
    >
      <span className={isMuted ? 'text-gray-400' : 'text-gray-900'}>{displayValue}</span>
      {isLocked && (
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute top-0.5 right-0.5 text-gray-500"
          data-testid="lock-icon"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      )}
    </td>
  )
}
