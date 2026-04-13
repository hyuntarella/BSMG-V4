'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { fm, formatNumericEdit } from '@/lib/utils/format'
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
  /**
   * 편집 중 값이 바뀔 때마다 호출 — 키보드 commit 경로용 pendingValue 동기화.
   * null 을 전달하면 부모가 pendingValueRef 를 클리어하여 "변경 없음" 으로 간주.
   */
  onEditChange?: (value: string | number | null) => void
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
  /** 외부에서 주입하는 추가 td className (예: 기본공종 품명 셀 스타일) */
  cellClassName?: string
  /** 외부에서 주입하는 추가 td style (bg 등 Tailwind 우선순위 충돌 방지용) */
  cellStyle?: React.CSSProperties
  /** 음성 실시간 미리보기 값 — idle 상태에서 preview 텍스트 표시 */
  realtimePreview?: number
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
  cellClassName,
  cellStyle,
  realtimePreview,
}: ExcelCellProps) {
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  /** handleChange에서 계산한 목표 커서 위치 — useLayoutEffect에서 복원 */
  const pendingCursorRef = useRef<number | null>(null)

  // 편집 모드 진입 시 input 포커스 + pendingValue 동기화
  // H8: 클릭 진입 시 editValue 를 '' 로 시작. 사용자가 새 값을 입력하면 교체, 입력 없이 떠나면 원래값 유지.
  //     deps 에서 value 를 제거 — 편집 중 외부 value 변경(예: sync_urethane)이 editValue 를 덮지 않음.
  useEffect(() => {
    if (!isEditing || type === 'select') return
    if (initialChar) {
      // 타이핑으로 진입: 첫 글자로 덮어쓰기 (단일 문자라 포맷 불필요)
      setEditValue(initialChar)
      if (type === 'number') {
        const parsed = parseFloat(initialChar.replace(/,/g, ''))
        onEditChange?.(isNaN(parsed) ? 0 : parsed)
      } else {
        onEditChange?.(initialChar)
      }
      // 타이핑 진입 시 첫 글자로 acdb 드롭다운 즉시 트리거
      onAcdbSearch?.(initialChar)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        // select() 안 함 — 첫 글자를 유지하고 이어서 타이핑하도록
      })
    } else {
      // H8 클릭/Enter/F2 진입: 빈 입력창으로 시작
      // 사용자가 타이핑하면 pendingValueRef 가 세팅됨. 타이핑 없이 blur/이동하면 커밋 스킵 → 원래값 유지
      setEditValue('')
      // onEditChange 를 호출하지 않음 → 부모의 pendingValueRef 는 이미 handleStartEditing 에서 null 로 클리어됨
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialChar])

  const handleCommit = useCallback(() => {
    // H8: editValue 가 비어 있으면 "변경 없음" 으로 간주 — 커밋 스킵, 원래값 유지
    // (클릭 진입 후 타이핑 없이 떠나는 경우 / 입력 후 전부 지운 경우)
    if (editValue.trim() === '') {
      onCancel()
      return
    }
    if (type === 'number') {
      const parsed = parseFloat(editValue.replace(/,/g, ''))
      onCommit(isNaN(parsed) ? 0 : parsed)
    } else {
      onCommit(editValue)
    }
  }, [editValue, type, onCommit, onCancel])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const raw = input.value
    const cursorBefore = input.selectionStart ?? raw.length
    // 키보드 commit용 pendingValue 즉시 동기화 (저장값은 항상 숫자)
    if (type === 'number') {
      // 편집 중에도 천단위 콤마 실시간 표시
      const formatted = formatNumericEdit(raw)
      // 콤마 삽입/제거에 따른 커서 위치 보정
      // raw 기준 커서 앞쪽의 숫자 개수가 formatted에서도 같아지는 위치를 찾음
      const digitsBeforeCursor = raw.slice(0, cursorBefore).replace(/[^\d]/g, '').length
      let newCursor = formatted.length
      let digitCount = 0
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++
          if (digitCount >= digitsBeforeCursor) {
            newCursor = i + 1
            break
          }
        }
      }
      if (digitsBeforeCursor === 0) newCursor = 0
      pendingCursorRef.current = newCursor
      setEditValue(formatted)
      // H8: 빈 문자열은 "변경 없음" 신호로 null 전달 → 부모가 pendingValueRef 를 null 로 정리
      if (formatted === '') {
        onEditChange?.(null)
      } else {
        const parsed = parseFloat(formatted.replace(/,/g, ''))
        onEditChange?.(isNaN(parsed) ? 0 : parsed)
      }
    } else {
      setEditValue(raw)
      // H8: 텍스트 셀도 빈 입력은 "변경 없음" 으로 처리
      onEditChange?.(raw === '' ? null : raw)
    }
    onAcdbSearch?.(raw)
  }, [type, onEditChange, onAcdbSearch])

  // 숫자 포맷 후 커서 위치 복원 (controlled input 재렌더 시 커서가 끝으로 튀는 문제 방지)
  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = pendingCursorRef.current
      try {
        inputRef.current.setSelectionRange(pos, pos)
      } catch {
        // 일부 브라우저에서 focus 전 setSelectionRange 호출 시 throw — 무시
      }
      pendingCursorRef.current = null
    }
  })

  // H8-outside-click: 편집 중일 때 document-level mousedown 리스너로 외부 클릭 감지.
  // onBlur 는 브라우저에 따라 non-focusable 요소(빈 td/footer/tbody 배경)를 클릭하면
  // 포커스가 이동하지 않아 발생하지 않을 수 있음. 이 리스너는 포커스 동작과 무관하게 동작.
  // 입력창 자신 / acdb 드롭다운 내부 클릭은 제외.
  useEffect(() => {
    if (!isEditing || type === 'select') return

    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (inputRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      handleCommit()
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [isEditing, type, handleCommit])

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
        className={`relative px-1 ${fontClass} cursor-default border-b border-v-b select-none bg-v-hov
          ${alignClass} ${type === 'number' ? 'tabular-nums' : ''}`}
        style={{ width: width ? `${width}px` : undefined, height: `${rowH}px` }}
        data-testid="excel-cell-readonly"
      >
        <span className="text-v-mut">{displayValue}</span>
      </td>
    )
  }

  // select 타입: 항상 <select> 렌더 (edit mode 개념 제거, 1-클릭으로 네이티브 드롭다운 즉시 열림)
  if (type === 'select' && selectOptions) {
    return (
      <td
        className={`relative p-0 border-b border-v-b ${isSelected ? 'ring-2 ring-v-accent ring-inset bg-white' : 'bg-white hover:bg-v-hov'}`}
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
        className="relative p-0 bg-v-sel ring-2 ring-v-accent ring-inset z-[3]"
        style={{ width: width ? `${width}px` : undefined }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode={type === 'number' ? 'numeric' : 'text'}
          value={editValue}
          onChange={handleChange}
          onFocus={(e) => {
            // 편집 진입 시 기존 값 전체선택 (타이핑 진입 제외 — 첫 글자를 덮어써야 함)
            if (!initialChar) e.currentTarget.select()
          }}
          onBlur={() => {
            // 드롭다운 클릭 시 blur 무시 (dropdown item 의 onMouseDown preventDefault 로
            // focus 가 input 에 유지되지만, 안전장치로 containment 체크 유지)
            if (dropdownRef.current?.contains(document.activeElement)) return
            handleCommit()
          }}
          onKeyDown={handleKeyDown}
          className={`w-full px-1 ${fontClass} bg-transparent outline-none ${alignClass} ${type === 'number' ? 'tabular-nums' : ''}`}
          style={{ height: `${rowH}px` }}
          data-testid="excel-cell-input"
        />
        {/* acdb 자동완성 드롭다운 */}
        {acdbResults && acdbResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full z-50 w-full max-h-[240px] overflow-y-auto bg-white border border-v-b rounded-b shadow-v-md"
            data-testid="acdb-dropdown"
          >
            {acdbResults.map((r, i) => (
              <button
                key={r.entry.canon}
                type="button"
                className={`w-full text-left px-2 py-1.5 text-sm hover:bg-v-hov ${i === acdbSelectedIndex ? 'bg-v-sel' : ''}`}
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
      className={`relative px-1 ${fontClass} cursor-cell border-b border-v-b select-none
        ${isSelected ? 'ring-2 ring-v-accent ring-inset bg-white z-[3]' : 'bg-white hover:bg-v-hov'}
        ${alignClass}
        ${type === 'number' ? 'tabular-nums' : ''}
        ${cellClassName ?? ''}`}
      style={{ width: width ? `${width}px` : undefined, height: `${rowH}px`, ...cellStyle }}
      onClick={() => {
        const canEdit = !isLocked || type === 'text'
        if (!isSelected) onSelect()
        if (canEdit) onStartEditing()
      }}
      data-testid="excel-cell"
      data-muted={isMuted ? 'true' : undefined}
    >
      <span className={isMuted ? 'text-v-mut' : ''}>{displayValue}</span>
      {realtimePreview !== undefined && (
        <span className="ml-1 text-[10px] tabular-nums text-v-accent/50">{fm(realtimePreview)}</span>
      )}
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
          className="absolute top-0.5 right-0.5 text-v-mut"
          data-testid="lock-icon"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      )}
    </td>
  )
}
