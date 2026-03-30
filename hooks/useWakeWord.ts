'use client'

import { useEffect, useCallback, useRef } from 'react'

interface UseWakeWordOptions {
  /** 녹음 토글 콜백 */
  onToggle: () => void
  /** "견적" 웨이크워드 감지 시 콜백 */
  onWakeWord?: () => void
  /** "수정" 웨이크워드 감지 시 콜백 (수정 모드 진입) */
  onEditMode?: () => void
  /** 활성화 여부 */
  enabled?: boolean
}

// ── Web Speech API 최소 인터페이스 ──

interface MinimalRecognitionResult {
  resultIndex: number
  results: { length: number; [i: number]: { [j: number]: { transcript: string } } }
}

interface MinimalRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((event: MinimalRecognitionResult) => void) | null
  onerror: ((event: unknown) => void) | null
  onend: (() => void) | null
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => MinimalRecognition
  webkitSpeechRecognition?: new () => MinimalRecognition
}

/**
 * 하드웨어 버튼(볼륨키) + 키보드 단축키 + Web Speech API 웨이크워드로 녹음 제어
 *
 * - 볼륨 Up/Down 키 → 녹음 토글 (PWA 모바일)
 * - Space 키 → 녹음 토글 (데스크탑, input 포커스 아닐 때)
 * - "수정" 웨이크워드 → onEditMode 콜백 (수정 모드 우선)
 * - "견적" / "시작" 웨이크워드 → onWakeWord 콜백
 */
export function useWakeWord({
  onToggle,
  onWakeWord,
  onEditMode,
  enabled = true,
}: UseWakeWordOptions) {
  const callbacksRef = useRef({ onToggle, onWakeWord, onEditMode })
  callbacksRef.current = { onToggle, onWakeWord, onEditMode }

  // ── 하드웨어/키보드 버튼 ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'VolumeUp' || e.key === 'VolumeDown') {
        e.preventDefault()
        callbacksRef.current.onToggle()
        return
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        callbacksRef.current.onToggle()
        return
      }
    },
    [enabled],
  )

  useEffect(() => {
    if (!enabled) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  // ── Web Speech API 웨이크워드 감지 ──
  const recognitionRef = useRef<MinimalRecognition | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const win = window as WindowWithSpeech
    const SpeechRecognitionCls = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRecognitionCls) return

    const recognition = new SpeechRecognitionCls()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim()

        // "수정" 키워드 — 수정 모드 우선
        if (/수정/.test(transcript)) {
          recognition.stop()
          callbacksRef.current.onEditMode?.()
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null
            try { recognition.start() } catch { /* 이미 실행 중 */ }
          }, 3000)
          return
        }

        // "견적" / "시작" 키워드
        if (/견적|시작/.test(transcript)) {
          recognition.stop()
          callbacksRef.current.onWakeWord?.()
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null
            try { recognition.start() } catch { /* 이미 실행 중 */ }
          }, 3000)
          return
        }
      }
    }

    recognition.onerror = () => {
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null
        try { recognition.start() } catch { /* 이미 실행 중 */ }
      }, 1000)
    }

    recognition.onend = () => {
      if (!restartTimerRef.current) {
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null
          try { recognition.start() } catch { /* 이미 실행 중 */ }
        }, 500)
      }
    }

    try { recognition.start() } catch { /* 권한 없음 */ }

    recognitionRef.current = recognition

    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      try { recognition.stop() } catch { /* 이미 중지됨 */ }
      recognitionRef.current = null
    }
  }, [enabled])
}
