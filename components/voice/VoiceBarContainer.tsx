'use client'

import { useCallback } from 'react'
import type { InputMode } from '@/lib/voice/inputMode'
import { INPUT_MODE_LABELS } from '@/lib/voice/inputMode'
import VoiceBar from './VoiceBar'

interface VoiceBarContainerProps {
  /** 현재 입력 모드 */
  mode: InputMode
  /** 모드 변경 콜백 */
  onModeChange: (mode: InputMode) => void

  // ── VoiceBar props ──
  status: 'idle' | 'recording' | 'processing'
  seconds: number
  lastText: string
  interimText?: string
  audioLevel?: number
  processingCount?: number
  bufferHint?: string
  onToggle: () => void

  /** 음성 가이드 패널 열기 */
  onVoiceGuideOpen?: () => void
}

const MODE_ORDER: InputMode[] = ['field', 'driving']

export default function VoiceBarContainer({
  mode,
  onModeChange,
  status,
  seconds,
  lastText,
  interimText,
  audioLevel,
  processingCount,
  bufferHint,
  onToggle,
  onVoiceGuideOpen,
}: VoiceBarContainerProps) {
  const cycleMode = useCallback(() => {
    const currentIndex = MODE_ORDER.indexOf(mode)
    const nextIndex = (currentIndex + 1) % MODE_ORDER.length
    onModeChange(MODE_ORDER[nextIndex])
  }, [mode, onModeChange])

  return (
    <div className="relative">
      {/* 음성 가이드 "?" + 모드 토글 — 바 위 좌측 */}
      <div className="fixed bottom-[68px] left-4 z-[51] flex items-center gap-1.5">
        {onVoiceGuideOpen && (
          <button
            onClick={onVoiceGuideOpen}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-v-accent shadow-card border border-ink-faint/20 hover:shadow-card-hover transition-all"
            data-testid="voice-guide-btn"
            aria-label="음성 가이드"
          >
            ?
          </button>
        )}
        <button
          onClick={cycleMode}
          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-card border border-ink-faint/20 hover:shadow-card-hover transition-all"
          data-testid="mode-toggle"
          aria-label={`모드 전환: ${INPUT_MODE_LABELS[mode]}`}
        >
          <ModeIcon mode={mode} />
          <span className="text-ink">{INPUT_MODE_LABELS[mode]}</span>
        </button>
      </div>

      <VoiceBar
        status={status}
        seconds={seconds}
        lastText={lastText}
        interimText={interimText}
        audioLevel={audioLevel}
        processingCount={processingCount}
        bufferHint={bufferHint}
        onToggle={onToggle}
      />

      {/* 운전 모드 표시 */}
      {mode === 'driving' && (
        <div className="fixed bottom-[68px] right-4 z-50">
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
            </svg>
            TTS ON
          </div>
        </div>
      )}
    </div>
  )
}

function ModeIcon({ mode }: { mode: InputMode }) {
  switch (mode) {
    case 'field':
      return (
        <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    case 'driving':
      return (
        <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
        </svg>
      )
  }
}
