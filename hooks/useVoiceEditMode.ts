'use client'

import { useState, useEffect, useRef } from 'react'
import type { VoiceStatus } from '@/hooks/useVoice'

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
 */
export function useVoiceEditMode({
  voiceStatus,
  onAutoResume,
  onPlayTts,
}: UseVoiceEditModeOptions) {
  const [isEditMode, setIsEditMode] = useState(false)

  // stale closure 방지
  const callbacksRef = useRef({ onAutoResume, onPlayTts })
  callbacksRef.current = { onAutoResume, onPlayTts }

  const isEditModeRef = useRef(false)
  isEditModeRef.current = isEditMode

  // 이전 상태 추적
  const prevStatusRef = useRef<VoiceStatus>('idle')

  // 자동 재개 타이머
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 자동 재개 useEffect ──
  useEffect(() => {
    const wasActiveStatus =
      prevStatusRef.current === 'speaking' || prevStatusRef.current === 'processing'
    const isNowIdle = voiceStatus === 'idle'

    if (wasActiveStatus && isNowIdle && isEditModeRef.current) {
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

  // ── 수정 모드 진입 ──
  const enterEditMode = async () => {
    setIsEditMode(true)
    await callbacksRef.current.onPlayTts('수정 모드입니다. 말씀하세요.')
  }

  // ── 수정 모드 종료 ──
  const exitEditMode = () => {
    setIsEditMode(false)
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }

  return {
    isEditMode,
    enterEditMode,
    exitEditMode,
  }
}
