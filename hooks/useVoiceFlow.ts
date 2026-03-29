'use client'

import { useState, useCallback, useRef } from 'react'
import {
  type FlowState,
  type FlowStep,
  FLOW_STEPS,
  createInitialFlowState,
  isAdvanceCommand,
  isCancelCommand,
  parseFlowInput,
  getApplyFeedback,
} from '@/lib/voice/voiceFlow'
import { findPriceForMargin } from '@/lib/estimate/costBreakdown'

export interface VoiceFlowCallbacks {
  /** STT 호출 */
  startRecording: () => void
  stopRecording: () => void
  /** TTS 재생 (완료 후 resolve) */
  playTts: (text: string) => Promise<void>
  /** 수집 완료 시 호출 */
  onComplete: (state: FlowState) => void
  /** 로그 추가 */
  addLog: (type: 'user' | 'assistant', text: string) => void
}

const AUTO_RESUME_DELAY = 2000

export function useVoiceFlow(callbacks: VoiceFlowCallbacks) {
  const [flowState, setFlowState] = useState<FlowState>(createInitialFlowState())
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 플로우 시작 (웨이크워드 "견적" 후 호출) */
  const startFlow = useCallback(async () => {
    const initial = createInitialFlowState()
    initial.step = 'collecting_area'
    setFlowState(initial)

    const config = FLOW_STEPS['collecting_area']
    callbacks.addLog('assistant', config.ttsPrompt)
    await callbacks.playTts(config.ttsPrompt)

    // 2초 후 녹음 시작
    resumeTimerRef.current = setTimeout(() => {
      callbacks.startRecording()
    }, AUTO_RESUME_DELAY)
  }, [callbacks])

  /** STT 텍스트를 플로우에 전달 */
  const processText = useCallback(async (text: string) => {
    callbacks.addLog('user', text)

    // 취소 감지
    if (isCancelCommand(text)) {
      setFlowState(createInitialFlowState())
      callbacks.addLog('assistant', '취소했습니다.')
      await callbacks.playTts('취소했습니다.')
      return
    }

    const currentStep = flowState.step
    const config = FLOW_STEPS[currentStep]
    if (!config) return

    // "됐어/넘겨" — 마디 종료 (입력 없이 넘기기)
    if (isAdvanceCommand(text)) {
      await advanceToNext(config.nextStep)
      return
    }

    // 값 파싱
    const parsed = parseFlowInput(text, config.parseField)
    if (!parsed) {
      // 인식 실패 — 다시 녹음
      const msg = '잘 못 알아들었습니다. 다시 말씀해주세요.'
      callbacks.addLog('assistant', msg)
      await callbacks.playTts(msg)
      resumeTimerRef.current = setTimeout(() => {
        callbacks.startRecording()
      }, AUTO_RESUME_DELAY)
      return
    }

    // 마진 기반 → 평단가 변환
    let finalValue = parsed.value
    if (parsed.type === 'margin') {
      const pyeong = (flowState.area ?? 100) / 3.306
      finalValue = findPriceForMargin(parsed.value, pyeong)
      callbacks.addLog('assistant', `마진 ${parsed.value}% → 평단가 ${finalValue.toLocaleString()}원`)
    }

    // 상태 업데이트
    const updated: FlowState = { ...flowState, [config.parseField]: finalValue }
    setFlowState(updated)

    // 피드백
    const feedback = getApplyFeedback(config.parseField, finalValue)
    callbacks.addLog('assistant', feedback)
    await callbacks.playTts(feedback)

    // 다음 단계로
    await advanceToNext(config.nextStep, updated)
  }, [flowState, callbacks])

  /** 다음 단계로 진행 */
  const advanceToNext = useCallback(async (nextStep: FlowStep, state?: FlowState) => {
    const current = state ?? flowState

    if (nextStep === 'generating') {
      // 수집 완료
      const finalState = { ...current, step: 'done' as FlowStep }
      setFlowState(finalState)

      const msg = '견적서를 생성합니다.'
      callbacks.addLog('assistant', msg)
      await callbacks.playTts(msg)
      callbacks.onComplete(finalState)
      return
    }

    // 다음 질문
    const nextConfig = FLOW_STEPS[nextStep]
    if (!nextConfig) return

    setFlowState(prev => ({ ...prev, step: nextStep }))

    callbacks.addLog('assistant', nextConfig.ttsPrompt)
    await callbacks.playTts(nextConfig.ttsPrompt)

    // 2초 후 녹음
    resumeTimerRef.current = setTimeout(() => {
      callbacks.startRecording()
    }, AUTO_RESUME_DELAY)
  }, [flowState, callbacks])

  /** 플로우 리셋 */
  const resetFlow = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }
    setFlowState(createInitialFlowState())
  }, [])

  return {
    flowState,
    startFlow,
    processText,
    resetFlow,
    isActive: flowState.step !== 'idle' && flowState.step !== 'done',
  }
}
