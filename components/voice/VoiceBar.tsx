'use client'

type VoiceBarStatus = 'idle' | 'recording' | 'processing' | 'speaking'

interface VoiceBarProps {
  status: VoiceBarStatus
  seconds: number
  lastText: string
  onToggle: () => void
  onStop: () => void
}

export default function VoiceBar({
  status,
  seconds,
  lastText,
  onToggle,
  onStop,
}: VoiceBarProps) {
  const isActive = status === 'recording'

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-3 transition-all ${
      isActive
        ? 'border-red-200 bg-red-50/95 backdrop-blur-md'
        : 'border-ink-faint/30 bg-white/90 backdrop-blur-md shadow-elevated'
    }`}>
      <div className="mx-auto flex max-w-4xl items-center gap-4">
        {/* 메인 버튼 */}
        <button
          onClick={status === 'speaking' ? onStop : onToggle}
          disabled={status === 'processing'}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${getButtonStyle(status)}`}
          aria-label={getAriaLabel(status)}
        >
          {getIcon(status)}
        </button>

        {/* 상태 텍스트 */}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${isActive ? 'text-red-700' : 'text-ink'}`}>
            {getStatusText(status, seconds, lastText)}
          </p>
          {status === 'idle' && (
            <p className="text-xs text-ink-muted">
              탭하여 말하기 · 볼륨 버튼 · Space
            </p>
          )}
        </div>

        {/* 녹음 중 시간 표시 */}
        {isActive && (
          <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 font-mono text-sm font-semibold text-red-600">
            {formatTime(seconds)}
          </span>
        )}
      </div>
    </div>
  )
}

function getButtonStyle(status: VoiceBarStatus): string {
  switch (status) {
    case 'idle':
      return 'bg-accent text-white hover:bg-accent-dark shadow-card hover:shadow-card-hover hover:scale-105'
    case 'recording':
      return 'bg-red-500 text-white animate-pulse shadow-lg'
    case 'processing':
      return 'bg-ink-faint text-ink-muted cursor-not-allowed'
    case 'speaking':
      return 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-card'
  }
}

function getIcon(status: VoiceBarStatus): React.ReactNode {
  switch (status) {
    case 'idle':
      return <MicIcon />
    case 'recording':
      return <StopIcon />
    case 'processing':
      return <SpinnerIcon />
    case 'speaking':
      return <SpeakerIcon />
  }
}

function getAriaLabel(status: VoiceBarStatus): string {
  switch (status) {
    case 'idle': return '녹음 시작'
    case 'recording': return '녹음 중'
    case 'processing': return '처리 중'
    case 'speaking': return 'TTS 중지'
  }
}

function getStatusText(status: VoiceBarStatus, seconds: number, lastText: string): string {
  switch (status) {
    case 'idle':
      return lastText || '탭하여 음성 연결'
    case 'recording':
      return '녹음 중...'
    case 'processing':
      return '처리 중...'
    case 'speaking':
      return '응답 중...'
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── SVG 아이콘 ──

function MicIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  )
}
