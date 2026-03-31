'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { VoiceStatus } from '@/hooks/useVoice'
import { shouldAutoResume } from '@/lib/voice/autoResumeLogic'
import { rmsToDb, isSilent, shouldStopByVad, shouldEnableVad } from '@/lib/voice/vadLogic'

// ── 상수 ──
const AUTO_RESUME_DELAY = 2000  // D-03: TTS 완료 후 2초 뒤 자동 재개

// ── 인터페이스 ──

interface UseVoiceEditModeOptions {
  /** useVoice의 현재 상태 */
  voiceStatus: VoiceStatus
  /** 자동 재개 시 호출 (voice.startRecording) */
  onAutoResume: () => void
  /** TTS 재생 함수 (voice.playTts) */
  onPlayTts: (text: string) => Promise<void>
  /** VAD 무음 감지 시 녹음 중지 (voice.stopRecording) — 일반 중지 */
  onStopRecording?: () => void
  /** 녹음 강제 중지 (processAudio 호출 안 함) — VAD/그만 종료 시 사용 */
  onForceStopRecording?: () => void
  /** VAD feature flag (갤럭시탭 dual-stream 위험 대응). 기본값 true */
  enableVad?: boolean
  /** 녹음용 MediaStream (VAD에서 재사용, 별도 getUserMedia 불필요) */
  recordingStream?: MediaStream | null
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
  onForceStopRecording,
  enableVad = true,
  recordingStream,
}: UseVoiceEditModeOptions) {
  const [isEditMode, setIsEditMode] = useState(false)

  // stale closure 방지
  const callbacksRef = useRef({ onAutoResume, onPlayTts, onStopRecording, onForceStopRecording })
  callbacksRef.current = { onAutoResume, onPlayTts, onStopRecording, onForceStopRecording }

  const isEditModeRef = useRef(false)
  isEditModeRef.current = isEditMode

  const voiceStatusRef = useRef<VoiceStatus>(voiceStatus)
  voiceStatusRef.current = voiceStatus

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
    // 자동 재개 타이머 취소
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
    // VAD interval 정리
    vadCleanupRef.current?.()
    vadCleanupRef.current = null
    // 녹음 중이면 강제 중지 (processAudio 호출 안 함)
    if (voiceStatusRef.current === 'recording') {
      callbacksRef.current.onForceStopRecording?.()
    }
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
    if (!shouldEnableVad(isEditMode, enableVad, voiceStatus)) {
      vadCleanupRef.current?.()
      vadCleanupRef.current = null
      return
    }

    // 녹음용 stream이 없으면 VAD 불가
    if (!recordingStream) return

    let active = true

    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(recordingStream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const dataArray = new Float32Array(analyser.frequencyBinCount)
    let silenceStart: number | null = null

    const check = () => {
      if (!active) return
      analyser.getFloatTimeDomainData(dataArray)
      const db = rmsToDb(dataArray)

      if (isSilent(db)) {
        if (!silenceStart) {
          silenceStart = Date.now()
        } else if (shouldStopByVad(silenceStart, Date.now())) {
          console.log('[VAD] 5s silence → force stop + schedule restart')
          callbacksRef.current.onForceStopRecording?.()
          // shouldAutoResume 경유 안 함 — VAD에서 직접 재개
          resumeTimerRef.current = setTimeout(() => {
            if (isEditModeRef.current) {
              callbacksRef.current.onAutoResume()
            }
          }, AUTO_RESUME_DELAY)
          return
        }
      } else {
        silenceStart = null
      }
    }

    const intervalId = setInterval(check, 100)

    vadCleanupRef.current = () => {
      active = false
      clearInterval(intervalId)
      ctx.close().catch(() => {})
    }

    return () => {
      active = false
      vadCleanupRef.current?.()
      vadCleanupRef.current = null
    }
  }, [isEditMode, voiceStatus, enableVad, recordingStream, exitEditMode])

  // ── 수정 모드 진입: 상태 전환 + 녹음 즉시 시작 ──
  const enterEditMode = useCallback(() => {
    console.log('[EditMode] enterEditMode → isEditMode=true + startRecording')
    setIsEditMode(true)
    // idle이면 500ms 후 녹음 시작 (state 반영 대기)
    if (voiceStatusRef.current === 'idle') {
      resumeTimerRef.current = setTimeout(() => {
        callbacksRef.current.onAutoResume()
      }, 500)
    }
  }, [])

  return {
    isEditMode,
    enterEditMode,
    exitEditMode,
  }
}
