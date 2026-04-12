'use client'

import { useState } from 'react'
import { fm } from '@/lib/utils/format'
import { getMarginDisplay } from '@/lib/estimate/costBreakdown'

interface Props {
  pppList: number[]
  selectedPpp: number | null
  onSelect: (ppp: number) => void
  onAdd: (ppp: number) => void
  onDelete: (ppp: number) => void
  /** 마진 미리보기용 대표 평수. 없으면 마진 표시 안 함. */
  marginPyeong?: number
}

/**
 * 평단가 칩 목록 + 마진 미리보기.
 */
export default function PriceMatrixChips({
  pppList,
  selectedPpp,
  onSelect,
  onAdd,
  onDelete,
  marginPyeong,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleConfirmAdd() {
    const parsed = parseInt(input, 10)
    if (isNaN(parsed) || parsed <= 0) {
      setError('양의 정수 입력')
      return
    }
    if (pppList.includes(parsed)) {
      setError('이미 존재하는 평단가')
      return
    }
    onAdd(parsed)
    setAdding(false)
    setInput('')
    setError(null)
  }

  function handleCancelAdd() {
    setAdding(false)
    setInput('')
    setError(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="price-matrix-chips">
      {pppList.map((ppp) => {
        const active = ppp === selectedPpp
        const margin = marginPyeong ? getMarginDisplay(ppp, marginPyeong) : null
        return (
          <div
            key={ppp}
            className={`flex items-center rounded-lg text-sm font-medium transition-all ${
              active
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-muted text-ink hover:bg-surface-muted/80'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(ppp)}
              className="py-1.5 pl-3 pr-1.5"
              data-testid={`price-chip-${ppp}`}
            >
              <span>{fm(ppp)}원</span>
              {margin && (
                <span className={`ml-1.5 text-[10px] font-normal ${active ? 'text-white/70' : 'text-ink-muted'}`}>
                  {margin.formatted}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(ppp)}
              aria-label={`${ppp} 삭제`}
              className={`mr-1 flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                active
                  ? 'text-white/80 hover:bg-white/20 hover:text-white'
                  : 'text-ink-muted hover:bg-ink-faint/30 hover:text-ink'
              }`}
              data-testid={`price-chip-${ppp}-delete`}
            >
              ×
            </button>
          </div>
        )
      })}

      {adding ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="number"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAdd()
              if (e.key === 'Escape') handleCancelAdd()
            }}
            placeholder="평단가"
            className="w-28 rounded-lg border border-ink-faint/30 px-3 py-1.5 text-sm outline-none focus:border-brand"
            data-testid="price-chip-add-input"
          />
          <button
            type="button"
            onClick={handleConfirmAdd}
            className="btn-primary !px-3 !py-1.5 !text-xs"
            data-testid="price-chip-add-confirm"
          >
            확인
          </button>
          <button
            type="button"
            onClick={handleCancelAdd}
            className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-ink-faint/20"
          >
            취소
          </button>
          {error && (
            <span className="ml-1 text-xs text-red-600" data-testid="price-chip-add-error">
              {error}
            </span>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg border border-dashed border-ink-faint/40 px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-brand hover:text-brand"
          data-testid="price-chip-add"
        >
          + 추가
        </button>
      )}
    </div>
  )
}
