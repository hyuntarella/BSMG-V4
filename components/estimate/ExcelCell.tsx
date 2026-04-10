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
  width?: number
  align?: 'left' | 'center' | 'right'
  /** 타이핑으로 편집 진입 시 첫 글자 (selectAll 대신 덮어쓰기) */
  initialChar?: string
  onSelect: () => void
  onStartEditing: () => void
  onCommit: (value: string | number) => void
  onCancel: () => void
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
  width,
  align = 'right',
  selectOptions,
  initialChar,
  onSelect,
  onStartEditing,
  onCommit,
  onCancel,
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

  // 편집 모드 진입 시 input 포커스
  useEffect(() => {
    if (isEditing) {
      console.log('[CELL] edit mode enter', { value, type, isEditing, initialChar })
      if (initialChar) {
        // 타이핑으로 진입: 첫 글자로 덮어쓰기
        setEditValue(initialChar)
        requestAnimationFrame(() => {
          inputRef.current?.focus()
        })
      } else {
        // 클릭/Enter/F2로 진입: 전체 선택 (타이핑 시 자동 덮어쓰기)
        setEditValue(String(value))
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        })
      }
    }
  }, [isEditing, value, initialChar])

  const handleCommit = useCallback(() => {
    console.log('[CELL] handleCommit', { editValue, type, parsed: type === 'number' ? parseFloat(editValue.replace(/,/g, '')) : editValue })
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
    onAcdbSearch?.(v)
  }, [onAcdbSearch])

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

  // select 타입: 드롭다운 렌더링
  if (type === 'select' && selectOptions && isEditing) {
    return (
      <td
        className="relative p-0 bg-yellow-50 ring-2 ring-brand-600 ring-inset"
        style={{ width: width ? `${width}px` : undefined }}
      >
        <select
          autoFocus
          value={String(value)}
          onChange={(e) => {
            console.log('[CELL] select onChange', { newValue: e.target.value })
            onCommit(e.target.value)
          }}
          onBlur={() => onCancel()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
          }}
          className={`w-full ${padClass} ${fontClass} bg-transparent outline-none ${alignClass}`}
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
        console.log('[CELL] onClick', { isSelected, isLocked, type, value })
        if (type === 'select') {
          // select 타입: 1-클릭으로 즉시 편집 모드 진입
          if (!isSelected) onSelect()
          onStartEditing()
          return
        }
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
    >
      <span className="text-gray-900">{displayValue}</span>
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
