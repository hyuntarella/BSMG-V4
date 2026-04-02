'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface TextInputBarProps {
  /** 텍스트 입력 시 실시간 감지 콜백 */
  onInputChange: (text: string) => void
  /** Enter 확정 콜백 */
  onSubmit: (text: string) => void
  /** ESC 취소 콜백 */
  onCancel: () => void
  /** 멀티라인 붙여넣기 콜백 */
  onMultilineSubmit: (lines: string[]) => void
  /** 명령 히스토리 (최근 20개) */
  commandHistory: string[]
}

export default function TextInputBar({
  onInputChange,
  onSubmit,
  onCancel,
  onMultilineSubmit,
  commandHistory,
}: TextInputBarProps) {
  const [value, setValue] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setValue(text)
    setHistoryIndex(-1)
    onInputChange(text)
  }, [onInputChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onSubmit(value.trim())
      setValue('')
      setHistoryIndex(-1)
      onInputChange('')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setValue('')
      setHistoryIndex(-1)
      onCancel()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length === 0) return
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
      setHistoryIndex(newIndex)
      const cmd = commandHistory[commandHistory.length - 1 - newIndex]
      if (cmd) {
        setValue(cmd)
        onInputChange(cmd)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex <= 0) {
        setHistoryIndex(-1)
        setValue('')
        onInputChange('')
      } else {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        const cmd = commandHistory[commandHistory.length - 1 - newIndex]
        if (cmd) {
          setValue(cmd)
          onInputChange(cmd)
        }
      }
    }
  }, [value, historyIndex, commandHistory, onSubmit, onCancel, onInputChange])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted.includes('\n')) {
      e.preventDefault()
      const lines = pasted.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      if (lines.length > 1) {
        onMultilineSubmit(lines)
        setValue('')
        setHistoryIndex(-1)
      } else if (lines.length === 1) {
        setValue(lines[0])
        onInputChange(lines[0])
      }
    }
  }, [onMultilineSubmit, onInputChange])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-ink-faint/30 bg-white/90 backdrop-blur-md shadow-elevated px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        {/* 입력 아이콘 */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M3 12h18M3 19h18" />
          </svg>
        </div>

        {/* 텍스트 입력 */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="명령 입력... (예: 바탕 500 1000 200)"
          className="flex-1 rounded-lg border border-ink-faint/30 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          data-testid="text-input-bar"
        />

        {/* 전송 버튼 */}
        <button
          onClick={() => {
            if (value.trim()) {
              onSubmit(value.trim())
              setValue('')
              setHistoryIndex(-1)
              onInputChange('')
            }
          }}
          disabled={!value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-ink-faint disabled:text-ink-muted transition-colors"
          aria-label="명령 실행"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <p className="mx-auto max-w-4xl mt-1 text-xs text-ink-muted pl-13">
        Enter 실행 · ESC 취소 · ↑↓ 이전 명령
      </p>
    </div>
  )
}
