'use client'

import { useState, useCallback, useRef } from 'react'
import {
  type FlowState,
  type FlowStep,
  FLOW_STEPS,
  createInitialFlowState,
  isAdvanceCommand,
  isCancelCommand,
  parseAllFields,
  parseFlowInput,
  getNextEmptyStep,
  getApplyFeedback,
} from '@/lib/voice/voiceFlow'
import { findPriceForMargin } from '@/lib/estimate/costBreakdown'

export interface VoiceFlowCallbacks {
  startRecording: () => void
  stopRecording: () => void
  playTts: (text: string) => Promise<void>
  onComplete: (state: FlowState) => void
  addLog: (type: 'user' | 'assistant', text: string) => void
}

const AUTO_RESUME_DELAY = 1500

export function useVoiceFlow(callbacks: VoiceFlowCallbacks) {
  const [flowState, setFlowState] = useState<FlowState>(createInitialFlowState())
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef<FlowState>(createInitialFlowState())

  const clearTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }

  const updateState = (s: FlowState) => {
    stateRef.current = s
    setFlowState(s)
  }

  /** 플로우 시작 — TTS 없이 바로 녹음 */
  const startFlow = useCallback(async () => {
    clearTimer()
    const initial = createInitialFlowState()
    initial.step = 'collecting_area'
    updateState(initial)

    callbacks.addLog('assistant', '말씀하세요.')
    callbacks.startRecording()
  }, [callbacks])

  /** STT 텍스트를 플로우에 전달 */
  const processText = useCallback(async (text: string) => {
    clearTimer()

    const current = stateRef.current
    // 플로우가 완료되었거나 비활성 상태면 무시 (늦게 도착한 STT 결과 방어)
    if (current.step === 'idle' || current.step === 'done') return

    callbacks.addLog('user', text)

    // 취소 감지
    if (isCancelCommand(text)) {
      const reset = createInitialFlowState()
      updateState(reset)
      callbacks.addLog('assistant', '취소.')
      await callbacks.playTts('취소했습니다.')
      return
    }

    // "됐어" 단독 → 현재 필드 건너뛰기
    if (isAdvanceCommand(text)) {
      const config = FLOW_STEPS[current.step]
      if (config) {
        // 빈 필드는 0으로 채움
        const updated: FlowState = { ...current, [config.parseField]: current[config.parseField] ?? 0 }
        updateState(updated)
        await goToNextEmpty(updated)
      }
      return
    }

    // 핵심: 모든 필드를 한 번에 파싱 시도
    const parsed = parseAllFields(text, current)
    const parsedKeys = Object.keys(parsed) as (keyof typeof parsed)[]

    if (parsedKeys.length > 0) {
      // 파싱된 필드 적용
      let updated = { ...current }
      const feedbacks: string[] = []

      for (const key of parsedKeys) {
        let val = parsed[key] as number
        // 마진 기반 (음수로 표시됨)
        if (val < 0 && (key === 'complexPpp' || key === 'urethanePpp')) {
          const pyeong = (updated.area ?? 100) / 3.306
          val = findPriceForMargin(-val, pyeong)
          feedbacks.push(`${key === 'complexPpp' ? '복합' : '우레탄'} 마진 ${-parsed[key]!}% → ${val.toLocaleString()}원`)
        } else {
          feedbacks.push(getApplyFeedback(key, val))
        }
        updated = { ...updated, [key]: val }
      }

      updateState(updated)

      // 피드백 한 번에
      const feedbackText = feedbacks.join(' ')
      callbacks.addLog('assistant', feedbackText)
      await callbacks.playTts(feedbackText)

      // 다음 빈 필드로
      await goToNextEmpty(updated)
      return
    }

    // 현재 단계 단일 필드 파싱 시도
    const config = FLOW_STEPS[current.step]
    if (config) {
      const single = parseFlowInput(text, config.parseField)
      if (single) {
        let finalValue = single.value
        if (single.type === 'margin') {
          const pyeong = (current.area ?? 100) / 3.306
          finalValue = findPriceForMargin(single.value, pyeong)
        }

        const updated: FlowState = { ...current, [config.parseField]: finalValue }
        updateState(updated)

        const feedback = getApplyFeedback(config.parseField, finalValue)
        callbacks.addLog('assistant', feedback)
        await callbacks.playTts(feedback)

        await goToNextEmpty(updated)
        return
      }
    }

    // 아무것도 파싱 못 함 → 다시 녹음
    callbacks.addLog('assistant', '다시 말씀해주세요.')
    await callbacks.playTts('다시 말씀해주세요.')
    resumeTimerRef.current = setTimeout(() => {
      callbacks.startRecording()
    }, AUTO_RESUME_DELAY)
  }, [callbacks])

  /** 다음 빈 필드로 이동. 다 채워져 있으면 완료 */
  const goToNextEmpty = useCallback(async (state: FlowState) => {
    const nextStep = getNextEmptyStep(state)

    if (nextStep === 'generating') {
      const finalState = { ...state, step: 'done' as FlowStep }
      updateState(finalState)
      callbacks.addLog('assistant', '견적서 생성.')
      await callbacks.playTts('견적서를 생성합니다.')
      callbacks.onComplete(finalState)
      return
    }

    // 다음 질문
    const nextConfig = FLOW_STEPS[nextStep]
    if (!nextConfig) return

    updateState({ ...state, step: nextStep })
    callbacks.addLog('assistant', nextConfig.ttsPrompt)
    await callbacks.playTts(nextConfig.ttsPrompt)

    resumeTimerRef.current = setTimeout(() => {
      callbacks.startRecording()
    }, AUTO_RESUME_DELAY)
  }, [callbacks])

  /** 플로우 리셋 */
  const resetFlow = useCallback(() => {
    clearTimer()
    const reset = createInitialFlowState()
    updateState(reset)
  }, [])

  return {
    flowState,
    startFlow,
    processText,
    resetFlow,
    isActive: flowState.step !== 'idle' && flowState.step !== 'done',
  }
}
