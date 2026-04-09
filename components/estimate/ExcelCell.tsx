'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { fm } from '@/lib/utils/format'
import type { AcdbSearchResult } from '@/lib/acdb/types'

export type CellState = 'idle' | 'hovered' | 'selected' | 'editing'
export type CellType = 'text' | 'number'

interface ExcelCellProps {
  value: string | number
  type?: CellType
  isSelected: boolean
  isEditing: boolean
  isLocked?: boolean
  isReadonly?: boolean
  width?: number
  align?: 'left' | 'center' | 'right'
  onSelect: () => void
  onStartEditing: () => void
  onCommit: (value: string | number) => void
  onCancel: () => void
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
  onSelect,
  onStartEditing,
  onCommit,
  onCancel,
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
      const raw = String(value)
      setEditValue(raw)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isEditing, value])

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

  // readonly 셀은 편집 불가
  if (isReadonly) {
    return (
      <td
        className={`relative h-[28px] px-1 text-sm cursor-default border border-gray-300 select-none bg-gray-50
          ${alignClass} ${type === 'number' ? 'font-mono tabular-nums' : ''}`}
        style={{ width: width ? `${width}px` : undefined }}
        data-testid="excel-cell-readonly"
      >
        <span className="text-gray-400">{displayValue}</span>
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
          className={`w-full h-[28px] px-1 text-sm bg-transparent outline-none ${alignClass} ${type === 'number' ? 'font-mono' : ''}`}
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
      className={`relative h-[28px] px-1 text-sm cursor-default border border-gray-300 select-none
        ${isSelected ? 'ring-2 ring-brand-500 ring-inset bg-white' : 'bg-white hover:bg-gray-50'}
        ${alignClass}
        ${type === 'number' ? 'font-mono tabular-nums' : ''}`}
      style={{ width: width ? `${width}px` : undefined }}
      onClick={onSelect}
      onDoubleClick={() => {
        if (!isLocked || type === 'text') {
          onSelect()
          onStartEditing()
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
