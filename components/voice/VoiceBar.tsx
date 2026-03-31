'use client'

type VoiceBarStatus = 'idle' | 'recording' | 'processing' | 'speaking' | 'listening'

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
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
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
          <p className="truncate text-sm text-gray-600">
            {getStatusText(status, seconds, lastText)}
          </p>
          {status === 'idle' && (
            <p className="text-xs text-gray-400">
              탭하여 말하기 · 볼륨 버튼 · Space
            </p>
          )}
        </div>

        {/* 녹음 중 시간 표시 */}
        {(status === 'recording' || status === 'listening') && (
          <span className="shrink-0 font-mono text-sm text-red-500">
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
      return 'bg-blue-600 text-white hover:bg-blue-700'
    case 'recording':
    case 'listening':
      return 'bg-red-500 text-white animate-pulse'
    case 'processing':
      return 'bg-gray-300 text-gray-500 cursor-not-allowed'
    case 'speaking':
      return 'bg-green-500 text-white hover:bg-green-600'
  }
}

function getIcon(status: VoiceBarStatus): React.ReactNode {
  switch (status) {
    case 'idle':
      return <MicIcon />
    case 'recording':
    case 'listening':
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
    case 'recording':
    case 'listening': return '듣고 있습니다'
    case 'processing': return '처리 중'
    case 'speaking': return 'TTS 중지'
  }
}

function getStatusText(status: VoiceBarStatus, seconds: number, lastText: string): string {
  switch (status) {
    case 'idle':
      return lastText || '탭하여 음성 연결'
    case 'recording':
    case 'listening':
      return '듣고 있습니다...'
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
