'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { fm } from '@/lib/utils/format'

export type CellState = 'idle' | 'hovered' | 'selected' | 'editing'
export type CellType = 'text' | 'number'

interface ExcelCellProps {
  value: string | number
  type?: CellType
  isSelected: boolean
  isEditing: boolean
  isLocked?: boolean
  width?: number
  align?: 'left' | 'center' | 'right'
  onSelect: () => void
  onStartEditing: () => void
  onCommit: (value: string | number) => void
  onCancel: () => void
}

export default function ExcelCell({
  value,
  type = 'number',
  isSelected,
  isEditing,
  isLocked,
  width,
  align = 'right',
  onSelect,
  onStartEditing,
  onCommit,
  onCancel,
}: ExcelCellProps) {
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 편집 모드 진입 시 input 포커스
  useEffect(() => {
    if (isEditing) {
      const raw = type === 'number' ? String(value) : String(value)
      setEditValue(raw)
      // requestAnimationFrame으로 DOM 렌더 후 포커스
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isEditing, value, type])

  const handleCommit = useCallback(() => {
    if (type === 'number') {
      const parsed = parseFloat(editValue.replace(/,/g, ''))
      onCommit(isNaN(parsed) ? 0 : parsed)
    } else {
      onCommit(editValue)
    }
  }, [editValue, type, onCommit])

  const displayValue = type === 'number' && typeof value === 'number'
    ? fm(value)
    : String(value)

  const alignClass = align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'

  if (isEditing) {
    return (
      <td
        className="relative p-0 bg-yellow-50 ring-2 ring-brand-600 ring-inset"
        style={{ width: width ? `${width}px` : undefined }}
      >
        <input
          ref={inputRef}
          type={type === 'number' ? 'text' : 'text'}
          inputMode={type === 'number' ? 'numeric' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCommit}
          className={`w-full h-[28px] px-1 text-sm bg-transparent outline-none ${alignClass} ${type === 'number' ? 'font-mono' : ''}`}
          data-testid="excel-cell-input"
        />
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
        onSelect()
        onStartEditing()
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
