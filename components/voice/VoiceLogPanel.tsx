'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { VoiceLogEntry } from '@/lib/voice/voiceLogTypes'

interface VoiceLogPanelProps {
  logs: VoiceLogEntry[]
  onFeedback: (logId: string, feedback: 'positive' | 'negative') => void
  onCorrection: (logId: string, correctionText: string) => void
}

export default function VoiceLogPanel({
  logs,
  onFeedback,
  onCorrection,
}: VoiceLogPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [correctionId, setCorrectionId] = useState<string | null>(null)
  const [correctionText, setCorrectionText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 새 로그 추가 시 스크롤
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs.length, isOpen])

  // 교정 입력 활성화 시 포커스
  useEffect(() => {
    if (correctionId && inputRef.current) {
      inputRef.current.focus()
    }
  }, [correctionId])

  const handleFeedback = useCallback((logId: string, type: 'positive' | 'negative') => {
    onFeedback(logId, type)
    if (type === 'negative') {
      setCorrectionId(logId)
      setCorrectionText('')
    }
  }, [onFeedback])

  const handleCorrectionSubmit = useCallback(() => {
    if (correctionId && correctionText.trim()) {
      onCorrection(correctionId, correctionText.trim())
      setCorrectionId(null)
      setCorrectionText('')
    }
  }, [correctionId, correctionText, onCorrection])

  const userLogs = logs.filter(l => l.speaker === 'user')

  if (logs.length === 0) return null

  return (
    <div className="fixed bottom-16 right-3 z-40">
      {/* 토글 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-card hover:shadow-card-hover transition-shadow"
      >
        <ChatIcon />
        <span>{userLogs.length}</span>
        <span className="text-ink-muted">{isOpen ? '닫기' : '대화'}</span>
      </button>

      {/* 로그 패널 */}
      {isOpen && (
        <div className="w-80 rounded-xl border border-ink-faint/30 bg-white shadow-elevated overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-ink-faint/20 px-3 py-2">
            <span className="text-xs font-semibold text-ink">음성 명령 히스토리</span>
            <button onClick={() => setIsOpen(false)} className="text-ink-muted hover:text-ink">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 로그 목록 */}
          <div ref={scrollRef} className="max-h-72 overflow-y-auto px-3 py-2 space-y-2">
            {logs.map((log) => (
              <div key={log.id} className={`text-xs ${log.speaker === 'user' ? '' : 'pl-3'}`}>
                {log.speaker === 'user' ? (
                  <div className="space-y-1">
                    {/* 사용자 발화 */}
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 font-medium text-ink">나:</span>
                      <span className="text-ink-secondary">&ldquo;{log.text}&rdquo;</span>
                    </div>
                    {/* 파싱 결과 */}
                    {log.actionSummary && (
                      <div className="flex items-center gap-2 pl-5">
                        <span className="text-accent-dark">→ {log.actionSummary}</span>
                        <span className="text-green-500">✓</span>
                        {/* 피드백 버튼 */}
                        {log.feedback === null && (
                          <div className="flex gap-1 ml-auto">
                            <button
                              onClick={() => handleFeedback(log.id, 'positive')}
                              className="rounded px-1 py-0.5 text-ink-muted hover:bg-green-50 hover:text-green-600 transition-colors"
                              title="정확함"
                            >👍</button>
                            <button
                              onClick={() => handleFeedback(log.id, 'negative')}
                              className="rounded px-1 py-0.5 text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="교정 필요"
                            >👎</button>
                          </div>
                        )}
                        {log.feedback === 'positive' && (
                          <span className="ml-auto text-green-500">👍</span>
                        )}
                        {log.feedback === 'negative' && (
                          <span className="ml-auto text-red-500">👎</span>
                        )}
                      </div>
                    )}
                    {/* 교정 입력 */}
                    {correctionId === log.id && (
                      <div className="flex gap-1 pl-5 mt-1">
                        <input
                          ref={inputRef}
                          type="text"
                          value={correctionText}
                          onChange={(e) => setCorrectionText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCorrectionSubmit() }}
                          placeholder="올바른 해석을 입력..."
                          className="flex-1 rounded border border-ink-faint/50 px-2 py-1 text-xs focus:border-accent focus:outline-none"
                        />
                        <button
                          onClick={handleCorrectionSubmit}
                          disabled={!correctionText.trim()}
                          className="rounded bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
                        >전송</button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 시스템 응답 */
                  <div className="text-ink-muted italic">{log.text}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChatIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}
