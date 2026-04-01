'use client'

type VoiceBarStatus = 'idle' | 'recording' | 'processing'

interface VoiceBarProps {
  status: VoiceBarStatus
  seconds: number
  lastText: string
  /** Web Speech API 실시간 전사 텍스트 */
  interimText?: string
  /** 오디오 입력 레벨 (0~1) */
  audioLevel?: number
  /** 백그라운드 처리 중인 세그먼트 수 */
  processingCount?: number
  /** 불완전 명령 버퍼 힌트 */
  bufferHint?: string
  onToggle: () => void
}

export default function VoiceBar({
  status,
  seconds,
  lastText,
  interimText = '',
  audioLevel = 0,
  processingCount = 0,
  bufferHint,
  onToggle,
}: VoiceBarProps) {
  const isActive = status === 'recording'

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-3 transition-all ${
      isActive
        ? 'border-red-200 bg-red-50/95 backdrop-blur-md'
        : 'border-ink-faint/30 bg-white/90 backdrop-blur-md shadow-elevated'
    }`}>
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        {/* 메인 버튼 */}
        <button
          onClick={onToggle}
          disabled={status === 'processing'}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${getButtonStyle(status)}`}
          aria-label={isActive ? '녹음 중지' : '녹음 시작'}
        >
          {getIcon(status)}
        </button>

        {/* 상태 텍스트 */}
        <div className="min-w-0 flex-1">
          {/* 실시간 전사 텍스트 (녹음 중 + interim이 있을 때) */}
          {isActive && interimText ? (
            <p className="truncate text-sm font-medium text-red-700">
              {interimText}
            </p>
          ) : (
            <p className={`truncate text-sm font-medium ${isActive ? 'text-red-700' : 'text-ink'}`}>
              {getStatusText(status, lastText)}
            </p>
          )}
          {status === 'idle' && (
            <p className="text-xs text-ink-muted">
              탭하여 음성 연결 · Space
            </p>
          )}
          {isActive && !interimText && (
            <div className="flex items-end gap-0.5 h-4">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
                <div key={i} className={`w-1 rounded-full transition-all duration-75 ${
                  audioLevel >= threshold ? 'bg-red-400' : 'bg-red-200'
                }`} style={{ height: `${Math.max(4, (i + 1) * 4)}px` }} />
              ))}
              <span className="ml-1.5 text-xs text-red-400">
                {bufferHint ? `${bufferHint} ...` : '듣고 있습니다...'}
              </span>
            </div>
          )}
          {isActive && processingCount > 0 && (
            <p className="text-xs text-accent-dark">
              처리 중 {processingCount}건...
            </p>
          )}
        </div>

        {/* 녹음 중 시간 */}
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
  }
}

function getStatusText(status: VoiceBarStatus, lastText: string): string {
  switch (status) {
    case 'idle':
      return lastText || '탭하여 음성 연결'
    case 'recording':
      return '듣고 있습니다...'
    case 'processing':
      return '처리 중...'
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
