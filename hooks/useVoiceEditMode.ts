'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { VoiceStatus } from '@/hooks/useVoice'
import { shouldAutoResume } from '@/lib/voice/autoResumeLogic'

// ── 상수 ──
const AUTO_RESUME_DELAY = 2000  // D-03: TTS 완료 후 2초 뒤 자동 재개
const SILENCE_THRESHOLD = -35   // dB — 이 값 미만이면 무음으로 간주
const SILENCE_DURATION = 5000   // 5초 무음 감지 시 수정 모드 종료 (D-05)

// ── 인터페이스 ──

interface UseVoiceEditModeOptions {
  /** useVoice의 현재 상태 */
  voiceStatus: VoiceStatus
  /** 자동 재개 시 호출 (voice.startRecording) */
  onAutoResume: () => void
  /** TTS 재생 함수 (voice.playTts) */
  onPlayTts: (text: string) => Promise<void>
  /** VAD 무음 감지 시 녹음 중지 (voice.stopRecording) */
  onStopRecording?: () => void
  /** VAD feature flag (갤럭시탭 dual-stream 위험 대응). 기본값 true */
  enableVad?: boolean
}

/**
 * 수정 모드 상태 기계 훅.
 *
 * - isEditMode: 수정 모드 활성 여부
 * - enterEditMode: TTS "수정 모드입니다. 말씀하세요." + 상태 전환
 * - exitEditMode: 수정 모드 해제 + 타이머 정리
 *
 * 자동 재개 (D-03):
 * voiceStatus가 (speaking|processing) → idle 로 전환 시,
 * isEditMode가 true이면 AUTO_RESUME_DELAY 후 onAutoResume() 호출.
 *
 * VAD (D-05):
 * voiceStatus === 'recording' + isEditMode === true 시 AnalyserNode 기반 무음 감지.
 * SILENCE_DURATION(5초) 무음 감지 시 녹음 중지 + 수정 모드 종료.
 * enableVad=false로 비활성화 가능 (갤럭시탭 dual-stream 충돌 대응).
 */
export function useVoiceEditMode({
  voiceStatus,
  onAutoResume,
  onPlayTts,
  onStopRecording,
  enableVad = true,
}: UseVoiceEditModeOptions) {
  const [isEditMode, setIsEditMode] = useState(false)

  // stale closure 방지
  const callbacksRef = useRef({ onAutoResume, onPlayTts, onStopRecording })
  callbacksRef.current = { onAutoResume, onPlayTts, onStopRecording }

  const isEditModeRef = useRef(false)
  isEditModeRef.current = isEditMode

  // 이전 상태 추적
  const prevStatusRef = useRef<VoiceStatus>('idle')

  // 자동 재개 타이머
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // VAD 정리 함수 ref
  const vadCleanupRef = useRef<(() => void) | null>(null)

  // ── 수정 모드 종료 (VAD에서도 호출 가능하도록 useCallback) ──
  const exitEditMode = useCallback(() => {
    console.log('[EditMode] exitEditMode 호출 → isEditMode=false 설정')
    setIsEditMode(false)
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
    vadCleanupRef.current?.()
    vadCleanupRef.current = null
  }, [])

  // ── 자동 재개 useEffect ──
  useEffect(() => {
    if (shouldAutoResume(prevStatusRef.current, voiceStatus, isEditModeRef.current)) {
      console.log('[AutoResume]', { prev: prevStatusRef.current, current: voiceStatus, isEditMode: isEditModeRef.current })
      // TTS/처리 완료 → 2초 후 자동 녹음 재개
      resumeTimerRef.current = setTimeout(() => {
        if (isEditModeRef.current) {
          callbacksRef.current.onAutoResume()
        }
      }, AUTO_RESUME_DELAY)
    }

    prevStatusRef.current = voiceStatus

    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
        resumeTimerRef.current = null
      }
    }
  }, [voiceStatus])

  // ── VAD useEffect ──
  // 수정 모드 + enableVad + 녹음 중 → AnalyserNode로 무음 감지
  // 5초 무음 시 stopRecording + exitEditMode
  useEffect(() => {
    if (!isEditMode || !enableVad) return
    if (voiceStatus !== 'recording') {
      // 녹음 중 아니면 VAD 정리
      vadCleanupRef.current?.()
      vadCleanupRef.current = null
      return
    }

    // 녹음 중: 별도 마이크 스트림으로 무음 감지
    let active = true

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (!active) {
        stream.getTracks().forEach(t => t.stop())
        return
      }

      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      const dataArray = new Float32Array(analyser.frequencyBinCount)
      let silenceStart: number | null = null

      const check = () => {
        if (!active) return
        analyser.getFloatTimeDomainData(dataArray)
        const rms = Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length)
        const db = 20 * Math.log10(Math.max(rms, 1e-10))

        if (db < SILENCE_THRESHOLD) {
          if (!silenceStart) {
            silenceStart = Date.now()
          } else if (Date.now() - silenceStart >= SILENCE_DURATION) {
            // 5초 무음: 녹음 중지 + 수정 모드 종료
            callbacksRef.current.onStopRecording?.()
            exitEditMode()
            return  // requestAnimationFrame 루프 중단
          }
        } else {
          silenceStart = null
        }

        requestAnimationFrame(check)
      }

      check()

      vadCleanupRef.current = () => {
        active = false
        stream.getTracks().forEach(t => t.stop())
        ctx.close().catch(() => {})
      }
    }).catch(() => {
      // 마이크 접근 실패 시 VAD 비활성화 (에러 무시)
    })

    return () => {
      active = false
      vadCleanupRef.current?.()
      vadCleanupRef.current = null
    }
  }, [isEditMode, voiceStatus, enableVad, exitEditMode])

  // ── 수정 모드 진입 (TTS 없이 상태만 전환 → auto-resume이 녹음 시작) ──
  const enterEditMode = useCallback(() => {
    console.log('[EditMode] enterEditMode → isEditMode=true')
    setIsEditMode(true)
  }, [])

  return {
    isEditMode,
    enterEditMode,
    exitEditMode,
  }
}
