'use client'

import { useEffect, useCallback, useRef } from 'react'

interface UseWakeWordOptions {
  /** 녹음 토글 콜백 */
  onToggle: () => void
  /** 웨이크워드 감지 시 콜백 (onToggle과 별도) */
  onWakeWord?: () => void
  /** 활성화 여부 */
  enabled?: boolean
}

/**
 * 녹음 활성화 방법 3가지:
 * 1. 볼륨 Up/Down 키 → 녹음 토글 (PWA 모바일)
 * 2. Space 키 → 녹음 토글 (데스크탑)
 * 3. Web Speech API → "견적" 감지 시 onWakeWord 호출
 */
export function useWakeWord({ onToggle, onWakeWord, enabled = true }: UseWakeWordOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // ── 하드웨어 버튼 + 키보드 ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'VolumeUp' || e.key === 'VolumeDown') {
        e.preventDefault()
        onToggle()
        return
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        onToggle()
        return
      }
    },
    [onToggle, enabled],
  )

  useEffect(() => {
    if (!enabled) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  // ── Web Speech API 웨이크워드 "견적" ──
  useEffect(() => {
    if (!enabled || !onWakeWord) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null

    if (!SpeechRecognitionAPI) {
      console.warn('Web Speech API 미지원')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (transcript.includes('견적')) {
          recognition.stop()
          onWakeWord()
          // 3초 후 다시 시작
          setTimeout(() => {
            try { recognition.start() } catch { /* 이미 실행 중 */ }
          }, 3000)
          return
        }
      }
    }

    recognition.onerror = (e: { error: string }) => {
      console.warn('[WakeWord] error:', e.error)
      if (e.error !== 'aborted') {
        setTimeout(() => {
          try { recognition.start() } catch (err) { console.warn('[WakeWord] restart fail:', err) }
        }, 1000)
      }
    }

    recognition.onend = () => {
      if (enabled) {
        setTimeout(() => {
          try { recognition.start() } catch (err) { console.warn('[WakeWord] restart fail:', err) }
        }, 500)
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      console.log('[WakeWord] started listening')
    } catch (err) { console.warn('[WakeWord] start fail:', err) }

    return () => {
      try { recognition.stop() } catch { /* */ }
      recognitionRef.current = null
    }
  }, [enabled, onWakeWord])
}

