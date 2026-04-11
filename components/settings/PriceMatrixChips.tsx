'use client'

import { useState } from 'react'
import { fm } from '@/lib/utils/format'

interface Props {
  pppList: number[]
  selectedPpp: number | null
  onSelect: (ppp: number) => void
  onAdd: (ppp: number) => void
  onDelete: (ppp: number) => void
}

/**
 * 단가표 2단계 — 평단가 칩 목록.
 * 선택된 면적대/공법 조합의 distinct price_per_pyeong 을 오름차순으로 렌더.
 * 각 칩 옆에 × 삭제, 끝에 + 평단가 추가 버튼.
 */
export default function PriceMatrixChips({
  pppList,
  selectedPpp,
  onSelect,
  onAdd,
  onDelete,
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
        return (
          <div
            key={ppp}
            className={`flex items-center rounded-full text-sm font-medium transition-colors ${
              active
                ? 'bg-brand text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(ppp)}
              className="py-1.5 pl-4 pr-2"
              data-testid={`price-chip-${ppp}`}
            >
              평당 {fm(ppp)}원
            </button>
            <button
              type="button"
              onClick={() => onDelete(ppp)}
              aria-label={`${ppp} 삭제`}
              className={`mr-1 flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                active
                  ? 'text-white/80 hover:bg-white/20 hover:text-white'
                  : 'text-gray-400 hover:bg-gray-300 hover:text-gray-700'
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
            className="w-28 rounded-full border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand"
            data-testid="price-chip-add-input"
          />
          <button
            type="button"
            onClick={handleConfirmAdd}
            className="rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            data-testid="price-chip-add-confirm"
          >
            확인
          </button>
          <button
            type="button"
            onClick={handleCancelAdd}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
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
          className="rounded-full border border-dashed border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-500 hover:border-brand hover:text-brand"
          data-testid="price-chip-add"
        >
          + 평단가 추가
        </button>
      )}
    </div>
  )
}
