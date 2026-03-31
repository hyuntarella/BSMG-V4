'use client'

import { useEffect, useCallback, useRef } from 'react'
import { normalizeText, matchKeyword } from '@/lib/voice/keywordMatcher'

interface UseWakeWordOptions {
  /** 녹음 토글 콜백 */
  onToggle: () => void
  /** "견적" 웨이크워드 감지 시 콜백 */
  onWakeWord?: () => void
  /** "수정" 웨이크워드 감지 시 콜백 (수정 모드 진입) */
  onEditMode?: () => void
  /** "그만"/"종료" 감지 시 콜백 */
  onExitEdit?: () => void
  /** 시트가 존재하는지 여부 (수정 키워드 판단에 사용) */
  hasSheets?: boolean
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
  onExitEdit,
  hasSheets = false,
  enabled = true,
}: UseWakeWordOptions) {
  const callbacksRef = useRef({ onToggle, onWakeWord, onEditMode, onExitEdit })
  callbacksRef.current = { onToggle, onWakeWord, onEditMode, onExitEdit }

  const hasSheetsRef = useRef(hasSheets)
  hasSheetsRef.current = hasSheets

  // enabled를 ref로도 유지 — recognition 콜백 내에서 최신값 참조
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

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
  // 마운트 시 1회 시작, enabled 변경에 destroy/recreate 하지 않음
  // enabled가 false면 콜백만 무시 (enabledRef로 체크)
  const recognitionRef = useRef<MinimalRecognition | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const win = window as WindowWithSpeech
    const SpeechRecognitionCls = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRecognitionCls) {
      console.warn('[WakeWord] Web Speech API 미지원')
      return
    }

    const recognition = new SpeechRecognitionCls()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim()
        console.log('[WakeWord] transcript:', transcript)
        const normalized = normalizeText(transcript)
        const result = matchKeyword(normalized, false, hasSheetsRef.current)
        console.log('[WakeWord] matchResult:', result, 'hasSheets:', hasSheetsRef.current)

        // "그만/종료" — 녹음 중에도 항상 감지 (enabled 무관)
        if (result === 'exit_edit') {
          recognition.stop()
          callbacksRef.current.onExitEdit?.()
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null
            try { recognition.start() } catch { /* 이미 실행 중 */ }
          }, 3000)
          return
        }

        // 나머지 키워드는 enabled일 때만
        if (!enabledRef.current) return

        if (result === 'enter_edit') {
          recognition.stop()
          callbacksRef.current.onEditMode?.()
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null
            try { recognition.start() } catch { /* 이미 실행 중 */ }
          }, 3000)
          return
        }

        // "견적" / "시작" 웨이크워드
        if (/견적|시작/.test(normalized)) {
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

    try {
      recognition.start()
      recognitionRef.current = recognition
      console.log('[WakeWord] started listening')
    } catch (err) {
      console.warn('[WakeWord] start fail:', err)
    }

    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      try { recognition.stop() } catch { /* 이미 중지됨 */ }
      recognitionRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // 마운트 1회만

  // ── 녹음 후 recognition 재시작 ──
  // enabled가 false→true 전환 시 (recording/processing 끝나고 idle 복귀)
  // MediaRecorder가 마이크를 점유하면 Web Speech API가 죽으므로 강제 재시작
  const prevEnabledRef = useRef(enabled)
  useEffect(() => {
    if (enabled && !prevEnabledRef.current && recognitionRef.current) {
      console.log('[WakeWord] re-enabling — restarting recognition')
      try {
        recognitionRef.current.start()
        console.log('[WakeWord] restart success')
      } catch (err) {
        console.warn('[WakeWord] restart failed:', err)
        // 실패 시 1초 후 재시도
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
            console.log('[WakeWord] retry success')
          } catch (e2) {
            console.warn('[WakeWord] retry also failed:', e2)
          }
        }, 1000)
      }
    }
    prevEnabledRef.current = enabled
  }, [enabled])
}
