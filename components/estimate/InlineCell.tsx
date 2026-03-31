'use client'

import { useState, useRef, useEffect } from 'react'
import { fm } from '@/lib/utils/format'

interface InlineCellProps {
  value: number | string
  type?: 'number' | 'text'
  /** 천단위 콤마 표시 (number 타입) */
  formatted?: boolean
  onSave: (value: number | string) => void
  className?: string
  readOnly?: boolean
}

export default function InlineCell({
  value,
  type = 'number',
  formatted = true,
  onSave,
  className = '',
  readOnly = false,
}: InlineCellProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const displayValue =
    type === 'number' && formatted && typeof value === 'number'
      ? fm(value)
      : String(value)

  const handleClick = () => {
    if (readOnly) return
    setEditValue(String(value))
    setEditing(true)
  }

  const handleBlur = () => {
    setEditing(false)
    if (type === 'number') {
      const num = parseFloat(editValue.replace(/,/g, '')) || 0
      if (num !== value) onSave(num)
    } else {
      if (editValue !== value) onSave(editValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    }
    if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'text' : 'text'}
        inputMode={type === 'number' ? 'numeric' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`min-h-[36px] w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-right text-xs outline-none ${className}`}
      />
    )
  }

  return (
    <span
      onClick={handleClick}
      className={`block min-h-[36px] cursor-pointer rounded px-1 py-0.5 text-right text-xs tabular-nums leading-[36px] hover:bg-blue-50 ${readOnly ? 'cursor-default' : ''} ${className}`}
    >
      {displayValue || '\u00A0'}
    </span>
  )
}
