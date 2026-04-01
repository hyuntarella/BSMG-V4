'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Estimate } from '@/lib/estimate/types'
import type { VoiceCommand } from '@/lib/voice/commands'
import type { ConfidenceResult } from '@/lib/voice/confidenceRouter'
import { useVoice } from '@/hooks/useVoice'
import { useVoiceFlow } from '@/hooks/useVoiceFlow'
import type { FlowState } from '@/lib/voice/voiceFlow'
import type { TabId } from '@/components/estimate/TabBar'
import { normalizeText, matchKeyword } from '@/lib/voice/keywordMatcher'
import { matchSummaryKeyword, buildSummaryText, buildMarginText } from '@/lib/voice/summaryBuilder'

// ── 인터페이스 ──

interface UseEstimateVoiceOptions {
  estimate: Estimate
  activeSheetIndex: number
  setActiveTab: (tab: TabId) => void
  applyVoiceCommands: (commands: VoiceCommand[], sheetIndex?: number) => { executed: boolean; routing: ConfidenceResult }
  updateMeta: (field: keyof Estimate, value: string | number) => void
  addSheet: (type: '복합' | '우레탄') => void
  initFromVoiceFlow: (data: { area: number; wallM2: number; complexPpp: number | null; urethanePpp: number | null }) => void
  saveSnapshot: (description: string, type?: 'auto' | 'voice' | 'manual') => void
  undo: () => void
  getSheetMargin: (sheetIndex: number) => number
  onSave: () => Promise<void>
  onEmailOpen: () => void
}

/**
 * EstimateEditor 음성 통합 훅.
 *
 * - useVoice: MediaRecorder → GPT-4o-transcribe (STT) 파이프라인
 * - useVoiceFlow: 면적/벽체/평단가 순서 수집 상태 기계
 * - 키워드 감지: "수정", "그만", "됐어" 등 감지
 * - LLM: Claude Sonnet (modify 모드 명령 파싱)
 * - TTS: OpenAI gpt-4o-mini-tts
 * - 트리거: 스페이스바/볼륨 버튼 push-to-talk (keydown=시작, keyup=종료)
 */
export function useEstimateVoice({
  estimate,
  activeSheetIndex,
  setActiveTab,
  applyVoiceCommands,
  updateMeta,
  addSheet,
  initFromVoiceFlow,
  saveSnapshot,
  undo,
  getSheetMargin,
  onSave,
  onEmailOpen,
}: UseEstimateVoiceOptions) {
  const router = useRouter()

  // ── 음성 로그 ──
  const [voiceLogs, setVoiceLogs] = useState<{ type: 'user' | 'assistant'; text: string }[]>([])
  const addLog = useCallback((type: 'user' | 'assistant', text: string) => {
    setVoiceLogs((prev) => [...prev.slice(-49), { type, text }])
  }, [])

  // ── 수정 모드 ──
  const [isEditMode, setIsEditMode] = useState(false)
  const isEditModeRef = useRef(false)
  isEditModeRef.current = isEditMode

  // ── pendingConfirm ──
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const pendingConfirmRef = useRef(false)
  pendingConfirmRef.current = pendingConfirm

  // stale closure 방지
  const callbacksRef = useRef({ onSave, onEmailOpen, addLog, undo, getSheetMargin })
  callbacksRef.current = { onSave, onEmailOpen, addLog, undo, getSheetMargin }

  // playTts ref (순환 참조 방지)
  const playTtsRef = useRef<(text: string) => Promise<void>>(async () => {})

  // ── voiceFlow 참조 ──
  const voiceFlowRef = useRef<{ isActive: boolean; startFlow: () => void; processText: (text: string) => void }>({
    isActive: false,
    startFlow: () => {},
    processText: () => {},
  })

  // ── 음성 명령 처리 ──
  const handleVoiceCommands = useCallback(
    (commands: VoiceCommand[]) => {
      const sysCmd = commands.find((c) =>
        ['save', 'email', 'load', 'undo', 'switch_tab', 'read_summary', 'read_margin', 'compare', 'update_meta'].includes(c.action)
      )

      if (sysCmd) {
        switch (sysCmd.action) {
          case 'save':
            callbacksRef.current.onSave()
            return
          case 'email':
            callbacksRef.current.onEmailOpen()
            return
          case 'load': {
            const query = sysCmd.query ?? sysCmd.target ?? ''
            const date = sysCmd.date ?? ''
            const params = new URLSearchParams()
            if (query) params.set('q', query)
            if (date) params.set('date', date)
            fetch(`/api/estimates/search?${params}`)
              .then((r) => r.json())
              .then((data) => {
                if (data.estimates?.length > 0) {
                  router.push(`/estimate/${data.estimates[0].id}`)
                } else {
                  playTtsRef.current('해당 견적서를 찾을 수 없습니다.')
                }
              })
            return
          }
          case 'undo':
            callbacksRef.current.undo()
            return
          case 'switch_tab': {
            const t = sysCmd.target
            if (t === '복합' || t === 'complex') setActiveTab('complex-detail')
            else if (t === '우레탄' || t === 'urethane') setActiveTab('urethane-detail')
            else if (t === '비교' || t === 'compare') setActiveTab('compare')
            return
          }
          case 'compare':
            setActiveTab('compare')
            return
          case 'read_summary': {
            const sheetIdx = activeSheetIndex >= 0 ? activeSheetIndex : 0
            const sheet = estimate.sheets[sheetIdx]
            const margin = callbacksRef.current.getSheetMargin(sheetIdx)
            const msg = buildSummaryText(sheet?.type ?? '', estimate.m2, sheet?.items.length ?? 0, sheet?.grand_total ?? 0, margin)
            callbacksRef.current.addLog('assistant', msg)
            playTtsRef.current(msg)
            return
          }
          case 'read_margin': {
            const sheetIdx = activeSheetIndex >= 0 ? activeSheetIndex : 0
            const margin = callbacksRef.current.getSheetMargin(sheetIdx)
            const msg = buildMarginText(estimate.sheets[sheetIdx]?.type ?? '', margin)
            callbacksRef.current.addLog('assistant', msg)
            playTtsRef.current(msg)
            return
          }
          case 'update_meta': {
            const field = sysCmd.field as keyof Estimate
            if (sysCmd.value !== undefined && field) {
              updateMeta(field, sysCmd.value)
              const msg = `${String(field)} ${sysCmd.value}으로 변경.`
              callbacksRef.current.addLog('assistant', msg)
              playTtsRef.current(msg)
            }
            return
          }
        }
      }

      // 수정 명령: 현재 활성 시트에 적용
      const targetSheet = activeSheetIndex >= 0 ? activeSheetIndex : 0
      saveSnapshot('음성 수정', 'voice')
      const result = applyVoiceCommands(commands, targetSheet)

      if (result.executed && result.routing.level === 'medium') {
        setPendingConfirm(true)
      }
    },
    [activeSheetIndex, applyVoiceCommands, saveSnapshot, router, setActiveTab, estimate, updateMeta],
  )

  // ── 견적서 상태 JSON (LLM 컨텍스트) ──
  const estimateContext = JSON.stringify({
    m2: estimate.m2,
    sheets: estimate.sheets.map((s) => ({
      type: s.type,
      grand_total: s.grand_total,
      items: s.items.map((it) => ({
        name: it.name, qty: it.qty, mat: it.mat,
        labor: it.labor, exp: it.exp, total: it.total,
      })),
    })),
  })
  const estimateContextRef = useRef(estimateContext)
  estimateContextRef.current = estimateContext

  // ── LLM 호출 (Claude modify 모드) ──
  const sendToLlm = useCallback(async (text: string) => {
    try {
      const { getModifySystem } = require('@/lib/voice/prompts')
      const system = getModifySystem(estimateContextRef.current, '[]')

      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, user: text }),
      })
      if (!res.ok) throw new Error('LLM 실패')
      const data = await res.json()
      console.log('[LLM] modify:', data)

      // 되묻기
      if (data.clarification_needed) {
        callbacksRef.current.addLog('assistant', data.clarification_needed)
        await playTtsRef.current(data.clarification_needed)
        return
      }

      // 명령 실행
      if (data.commands && data.commands.length > 0) {
        handleVoiceCommands(data.commands)
      }

      // TTS 응답
      if (data.tts_response) {
        callbacksRef.current.addLog('assistant', data.tts_response)
        await playTtsRef.current(data.tts_response)
      }
    } catch (err) {
      console.error('[LLM] error:', err)
    }
  }, [handleVoiceCommands])

  const sendToLlmRef = useRef(sendToLlm)
  sendToLlmRef.current = sendToLlm

  // ── STT 전사 콜백 ──
  const handleTranscript = useCallback((text: string) => {
    const normalized = normalizeText(text)
    console.log('[Voice] transcript:', JSON.stringify(text), '→ normalized:', JSON.stringify(normalized))

    // Whisper 프롬프트 환각 방지
    if (text.startsWith('방수 복합 우레탄 견적 바탕정리')) {
      console.log('[Voice] prompt hallucination, discarding')
      return
    }

    callbacksRef.current.addLog('user', text)

    // 1. 키워드 매칭
    const action = matchKeyword(normalized, isEditModeRef.current, estimate.sheets.length > 0)

    if (action === 'exit_edit') {
      console.log('[Voice] "그만" → 수정 모드 종료')
      setIsEditMode(false)
      setPendingConfirm(false)
      callbacksRef.current.addLog('assistant', '종료합니다.')
      playTtsRef.current('종료합니다.')
      return
    }
    if (action === 'enter_edit') {
      console.log('[Voice] "수정" → 수정 모드 진입')
      setIsEditMode(true)
      callbacksRef.current.addLog('assistant', '수정 모드.')
      playTtsRef.current('수정 모드.')
      return
    }
    if (action === 'confirm') {
      console.log('[Voice] "됐어" → 확정')
      callbacksRef.current.addLog('assistant', '확인.')
      playTtsRef.current('확인.')
      return
    }

    // 2. 상태 요약
    const summaryAction = matchSummaryKeyword(normalized)
    if (summaryAction && estimate.sheets.length > 0) {
      const sheetIdx = activeSheetIndex >= 0 ? activeSheetIndex : 0
      const sheet = estimate.sheets[sheetIdx]
      if (summaryAction === 'read_summary' && sheet) {
        const margin = callbacksRef.current.getSheetMargin(sheetIdx)
        const msg = buildSummaryText(sheet.type, estimate.m2, sheet.items.length, sheet.grand_total ?? 0, margin)
        callbacksRef.current.addLog('assistant', msg)
        playTtsRef.current(msg)
      } else if (summaryAction === 'read_margin') {
        const margin = callbacksRef.current.getSheetMargin(sheetIdx)
        const msg = buildMarginText(estimate.sheets[sheetIdx]?.type ?? '', margin)
        callbacksRef.current.addLog('assistant', msg)
        playTtsRef.current(msg)
      }
      return
    }

    // 3. 시트 없을 때 → voiceFlow
    if (estimate.sheets.length === 0) {
      if (!voiceFlowRef.current.isActive) {
        voiceFlowRef.current.startFlow()
      }
      voiceFlowRef.current.processText(text)
      return
    }

    // 4. voiceFlow 활성 시
    if (voiceFlowRef.current.isActive) {
      voiceFlowRef.current.processText(text)
      return
    }

    // 5. pendingConfirm 응답
    if (pendingConfirmRef.current) {
      setPendingConfirm(false)
      if (/^(아니|아니오|아니요|틀려|틀렸|달라|다르)/.test(normalized)) {
        callbacksRef.current.undo()
        callbacksRef.current.addLog('assistant', '되돌렸습니다.')
        playTtsRef.current('되돌렸습니다.')
        return
      }
      // 긍정이면 그냥 유지, 새 명령이면 아래로 진행
    }

    // 6. 수정 모드 → Claude LLM
    if (isEditModeRef.current) {
      sendToLlmRef.current(text)
      return
    }

    // 7. 수정 모드가 아닌데 시트 있음 → 일반 명령 (LLM)
    sendToLlmRef.current(text)
  }, [estimate, activeSheetIndex])

  // ── useVoice 훅 (MediaRecorder → Whisper STT) ──
  const voiceHook = useVoice({
    mode: 'modify',
    skipLlm: true,
    onSttText: (text: string) => {
      handleTranscript(text)
      return true // LLM 건너뜀 — handleTranscript 내부에서 sendToLlm 호출
    },
    onError: (err) => {
      console.error('[Voice] error:', err)
    },
  })

  // playTts ref 동기화
  playTtsRef.current = voiceHook.playTts

  // ── voiceFlow 훅 ──
  const voiceFlow = useVoiceFlow({
    startRecording: voiceHook.startRecording,
    stopRecording: voiceHook.stopRecording,
    playTts: voiceHook.playTts,
    onComplete: (state: FlowState) => {
      initFromVoiceFlow({
        area: state.area ?? 100,
        wallM2: state.wallM2 ?? 0,
        complexPpp: state.complexPpp,
        urethanePpp: state.urethanePpp,
      })
      setActiveTab('complex-detail')
    },
    addLog,
  })

  // voiceFlowRef 동기화
  voiceFlowRef.current = voiceFlow

  // ── 키보드 단축키: push-to-talk (keydown=시작, keyup=종료) ──
  const isKeyDownRef = useRef(false)

  useEffect(() => {
    const isVoiceKey = (e: KeyboardEvent) =>
      e.key === 'VolumeUp' || e.key === 'VolumeDown' || e.key === ' ' || e.code === 'Space'

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (!isVoiceKey(e)) return

      e.preventDefault()
      if (isKeyDownRef.current) return // 키 반복 무시
      isKeyDownRef.current = true
      voiceHook.startRecording()
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isVoiceKey(e)) return
      if (!isKeyDownRef.current) return
      isKeyDownRef.current = false
      voiceHook.stopRecording()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [voiceHook.startRecording, voiceHook.stopRecording])

  // ── VoiceBar 호환 인터페이스 ──
  const voice = {
    status: voiceHook.status,
    seconds: voiceHook.seconds,
    lastText: voiceHook.lastText,
    toggleRecording: voiceHook.toggleRecording,
    stopSpeaking: voiceHook.stopSpeaking,
    playTts: voiceHook.playTts,
    startRecording: voiceHook.startRecording,
    stopRecording: voiceHook.stopRecording,
  }

  return {
    voice,
    voiceLogs,
    addLog,
    editMode: {
      isEditMode,
      enterEditMode: () => setIsEditMode(true),
      exitEditMode: () => { setIsEditMode(false); setPendingConfirm(false) },
    },
    voiceFlow,
    pendingConfirm,
  }
}
