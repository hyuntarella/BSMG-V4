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
import { hasTriggerWord, removeTriggerWord, isStopWord } from '@/lib/voice/triggerMatcher'
import { COMPLEX_BASE, URETHANE_BASE } from '@/lib/estimate/constants'
import type { VoiceLogEntry } from '@/lib/voice/voiceLogTypes'
import type { CorrectionEntry, AvailableItem } from '@/lib/voice/prompts'

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

/** 글로벌 턴 카운터 (하이라이트 페이드용) */
let globalTurnCounter = 0

/**
 * EstimateEditor 음성 통합 훅.
 *
 * - useVoice: MediaRecorder → GPT-4o-transcribe (STT) 파이프라인
 * - useVoiceFlow: 면적/벽체/평단가 순서 수집 상태 기계
 * - 키워드 감지: "수정", "그만", "됐어" 등 감지
 * - 트리거 단어: "넣어" 감지 → 즉시 처리
 * - LLM: Claude Sonnet (modify 모드 명령 파싱) + 풍부한 컨텍스트
 * - TTS: OpenAI gpt-4o-mini-tts
 * - 연속 녹음: 버튼 ON → 연속, VAD 2초 무음 또는 "넣어"로 발화 구분
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

  // ── 음성 로그 (풍부한 구조) ──
  const [voiceLogs, setVoiceLogs] = useState<VoiceLogEntry[]>([])
  const addLog = useCallback((
    speaker: 'user' | 'system',
    text: string,
    action?: VoiceCommand[],
    actionSummary?: string,
  ) => {
    const entry: VoiceLogEntry = {
      id: crypto.randomUUID(),
      speaker,
      text,
      action,
      actionSummary,
      feedback: null,
      timestamp: Date.now(),
    }
    setVoiceLogs((prev) => [...prev.slice(-49), entry])
    return entry.id
  }, [])

  // ── 피드백 업데이트 ──
  const updateLogFeedback = useCallback((logId: string, feedback: 'positive' | 'negative') => {
    setVoiceLogs((prev) => prev.map(l =>
      l.id === logId ? { ...l, feedback } : l
    ))
  }, [])

  // ── 교정 이력 ──
  const [corrections, setCorrections] = useState<CorrectionEntry[]>([])

  // ── 수정 모드 ──
  const [isEditMode, setIsEditMode] = useState(false)
  const isEditModeRef = useRef(false)
  isEditModeRef.current = isEditMode

  // ── pendingConfirm ──
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const pendingConfirmRef = useRef(false)
  pendingConfirmRef.current = pendingConfirm

  // ── 하이라이트 턴 추적 ──
  const [currentTurn, setCurrentTurn] = useState(0)
  const [cellTurns, setCellTurns] = useState<Map<string, number>>(new Map())

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

  // ── 사용 가능한 공종 마스터 데이터 빌드 ──
  const availableItems: AvailableItem[] = [
    ...COMPLEX_BASE.map(b => ({
      name: b.name, unit: b.unit, mat: 0, labor: 0, exp: 0,
      aliases: getAliases(b.name),
    })),
    ...URETHANE_BASE.filter(b => !COMPLEX_BASE.some(c => c.name === b.name)).map(b => ({
      name: b.name, unit: b.unit, mat: 0, labor: 0, exp: 0,
      aliases: getAliases(b.name),
    })),
  ]

  // ── 음성 명령 처리 (시트 반영 + 하이라이트 갱신) ──
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
            callbacksRef.current.addLog('system', msg)
            playTtsRef.current(msg)
            return
          }
          case 'read_margin': {
            const sheetIdx = activeSheetIndex >= 0 ? activeSheetIndex : 0
            const margin = callbacksRef.current.getSheetMargin(sheetIdx)
            const msg = buildMarginText(estimate.sheets[sheetIdx]?.type ?? '', margin)
            callbacksRef.current.addLog('system', msg)
            playTtsRef.current(msg)
            return
          }
          case 'update_meta': {
            const field = sysCmd.field as keyof Estimate
            if (sysCmd.value !== undefined && field) {
              updateMeta(field, sysCmd.value)
              const msg = `${String(field)} ${sysCmd.value}으로 변경.`
              callbacksRef.current.addLog('system', msg)
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

      if (result.executed) {
        // 턴 카운터 증가 + 셀 하이라이트 업데이트
        const newTurn = ++globalTurnCounter
        setCurrentTurn(newTurn)
        setCellTurns(prev => {
          const next = new Map(prev)
          commands.forEach(c => {
            if (c.target) {
              const key = `voice:${targetSheet}:${c.target}:${c.field ?? c.action}`
              next.set(key, newTurn)
            }
          })
          return next
        })

        if (result.routing.level === 'medium') {
          setPendingConfirm(true)
        }
      }
    },
    [activeSheetIndex, applyVoiceCommands, saveSnapshot, router, setActiveTab, estimate, updateMeta],
  )

  // ── 견적서 상태 JSON (LLM 컨텍스트 — 풍부하게) ──
  const estimateContext = JSON.stringify({
    m2: estimate.m2,
    wall_m2: estimate.wall_m2,
    sheets: estimate.sheets.map((s) => ({
      type: s.type,
      price_per_pyeong: s.price_per_pyeong,
      grand_total: s.grand_total,
      items: s.items.map((it) => ({
        name: it.name,
        spec: it.spec,
        unit: it.unit,
        qty: it.qty,
        mat: it.mat,
        labor: it.labor,
        exp: it.exp,
        mat_amount: it.mat_amount,
        labor_amount: it.labor_amount,
        exp_amount: it.exp_amount,
        total: it.total,
      })),
    })),
  })
  const estimateContextRef = useRef(estimateContext)
  estimateContextRef.current = estimateContext

  // ── LLM 호출 (Claude modify 모드 — 풍부한 컨텍스트) ──
  const sendToLlm = useCallback(async (text: string) => {
    try {
      const { getModifySystem } = require('@/lib/voice/prompts')
      const system = getModifySystem(
        estimateContextRef.current,
        '[]',
        corrections.length > 0 ? corrections.slice(-10) : undefined,
        availableItems.length > 0 ? availableItems : undefined,
      )

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
        callbacksRef.current.addLog('system', data.clarification_needed)
        await playTtsRef.current(data.clarification_needed)
        return
      }

      // 명령 실행 — 시트 반영을 TTS보다 먼저
      if (data.commands && data.commands.length > 0) {
        // 명령 실행 요약 생성
        const summary = data.commands.map((c: VoiceCommand) =>
          `${c.target ?? ''} ${c.field ?? c.action} ${c.value ?? (c.delta ? (c.delta > 0 ? '+' : '') + c.delta : '')}`.trim()
        ).join(', ')

        // 유저 로그에 파싱 결과 첨부
        const logId = callbacksRef.current.addLog('user', text, data.commands, summary)

        handleVoiceCommands(data.commands)

        // TTS 응답 — 시트 반영 이후 병렬 실행
        if (data.tts_response) {
          callbacksRef.current.addLog('system', data.tts_response)
          playTtsRef.current(data.tts_response)  // await 제거 → 병렬
        }

        return logId
      }

      // TTS 응답만 있는 경우
      if (data.tts_response) {
        callbacksRef.current.addLog('system', data.tts_response)
        await playTtsRef.current(data.tts_response)
      }
    } catch (err) {
      console.error('[LLM] error:', err)
    }
  }, [handleVoiceCommands, corrections, availableItems])

  const sendToLlmRef = useRef(sendToLlm)
  sendToLlmRef.current = sendToLlm

  // ── STT 전사 콜백 ──
  const handleTranscript = useCallback((text: string) => {
    let processedText = text
    const normalized = normalizeText(text)
    console.log('[Voice] transcript:', JSON.stringify(text), '→ normalized:', JSON.stringify(normalized))

    // Whisper 프롬프트 환각 방지
    if (text.startsWith('방수 복합 우레탄 견적 바탕정리')) {
      console.log('[Voice] prompt hallucination, discarding')
      return
    }

    // 종료 단어 감지 ("됐어", "끝" → 연속 녹음 종료)
    if (isStopWord(normalized)) {
      console.log('[Voice] stop word detected → exit')
      setIsEditMode(false)
      setPendingConfirm(false)
      callbacksRef.current.addLog('system', '종료합니다.')
      playTtsRef.current('종료합니다.')
      return
    }

    // 트리거 단어 감지 ("넣어" → 트리거 단어 제거 후 처리)
    if (hasTriggerWord(processedText)) {
      processedText = removeTriggerWord(processedText)
      console.log('[Voice] trigger word detected, cleaned text:', processedText)
      if (!processedText || processedText.trim().length === 0) {
        return  // 트리거 단어만 있는 경우
      }
    }

    const normalizedProcessed = normalizeText(processedText)

    callbacksRef.current.addLog('user', processedText)

    // 1. 키워드 매칭
    const action = matchKeyword(normalizedProcessed, isEditModeRef.current, estimate.sheets.length > 0)

    if (action === 'exit_edit') {
      console.log('[Voice] "그만" → 수정 모드 종료')
      setIsEditMode(false)
      setPendingConfirm(false)
      callbacksRef.current.addLog('system', '종료합니다.')
      playTtsRef.current('종료합니다.')
      return
    }
    if (action === 'enter_edit') {
      console.log('[Voice] "수정" → 수정 모드 진입')
      setIsEditMode(true)
      callbacksRef.current.addLog('system', '수정 모드.')
      playTtsRef.current('수정 모드.')
      return
    }
    if (action === 'confirm') {
      console.log('[Voice] "됐어" → 확정')
      callbacksRef.current.addLog('system', '확인.')
      playTtsRef.current('확인.')
      return
    }

    // 2. 상태 요약
    const summaryAction = matchSummaryKeyword(normalizedProcessed)
    if (summaryAction && estimate.sheets.length > 0) {
      const sheetIdx = activeSheetIndex >= 0 ? activeSheetIndex : 0
      const sheet = estimate.sheets[sheetIdx]
      if (summaryAction === 'read_summary' && sheet) {
        const margin = callbacksRef.current.getSheetMargin(sheetIdx)
        const msg = buildSummaryText(sheet.type, estimate.m2, sheet.items.length, sheet.grand_total ?? 0, margin)
        callbacksRef.current.addLog('system', msg)
        playTtsRef.current(msg)
      } else if (summaryAction === 'read_margin') {
        const margin = callbacksRef.current.getSheetMargin(sheetIdx)
        const msg = buildMarginText(estimate.sheets[sheetIdx]?.type ?? '', margin)
        callbacksRef.current.addLog('system', msg)
        playTtsRef.current(msg)
      }
      return
    }

    // 3. 시트 없을 때 → voiceFlow
    if (estimate.sheets.length === 0) {
      if (!voiceFlowRef.current.isActive) {
        voiceFlowRef.current.startFlow()
      }
      voiceFlowRef.current.processText(processedText)
      return
    }

    // 4. voiceFlow 활성 시
    if (voiceFlowRef.current.isActive) {
      voiceFlowRef.current.processText(processedText)
      return
    }

    // 5. pendingConfirm 응답
    if (pendingConfirmRef.current) {
      setPendingConfirm(false)
      if (/^(아니|아니오|아니요|틀려|틀렸|달라|다르)/.test(normalizedProcessed)) {
        callbacksRef.current.undo()
        callbacksRef.current.addLog('system', '되돌렸습니다.')
        playTtsRef.current('되돌렸습니다.')
        return
      }
      // 긍정이면 그냥 유지, 새 명령이면 아래로 진행
    }

    // 6. Claude LLM으로 전달
    sendToLlmRef.current(processedText)
  }, [estimate, activeSheetIndex])

  // ── useVoice 훅 (MediaRecorder → Whisper STT + 연속 녹음) ──
  const voiceHook = useVoice({
    mode: 'modify',
    skipLlm: true,
    continuousRecording: {
      enabled: true,
      silenceDurationMs: 2000,
      triggerWordEnabled: true,
    },
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
    addLog: (type: 'user' | 'assistant', text: string) => {
      addLog(type === 'assistant' ? 'system' : 'user', text)
    },
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

  // ── 교정 처리 ──
  const submitCorrection = useCallback(async (
    logId: string,
    correctionText: string,
  ) => {
    // 원본 로그 찾기
    const originalLog = voiceLogs.find(l => l.id === logId)
    if (!originalLog) return

    // 교정 입력도 LLM에 보내서 재파싱
    callbacksRef.current.addLog('user', correctionText)
    await sendToLlmRef.current(correctionText)

    // 교정 이력에 추가
    const entry: CorrectionEntry = {
      original_text: originalLog.text,
      corrected_action: { correction: correctionText },
      context: {
        targetItem: originalLog.action?.[0]?.target,
        targetField: originalLog.action?.[0]?.field,
      },
    }
    setCorrections(prev => [...prev.slice(-9), entry])

    // 피드백 업데이트
    updateLogFeedback(logId, 'negative')
  }, [voiceLogs, updateLogFeedback])

  // ── 셀 하이라이트 레벨 계산 (0=없음, 1=직전, 2=2턴전, 3=3턴전) ──
  const getCellHighlightLevel = useCallback((cellKey: string): number => {
    const cellTurn = cellTurns.get(cellKey)
    if (cellTurn === undefined) return 0
    const diff = currentTurn - cellTurn
    if (diff <= 0) return 1  // 직전 수정
    if (diff === 1) return 2  // 2턴 전
    if (diff === 2) return 3  // 3턴 전
    return 0  // 4턴 이상 → 하이라이트 제거
  }, [cellTurns, currentTurn])

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
    isContinuousMode: voiceHook.isContinuousMode,
    toggleContinuousRecording: voiceHook.toggleContinuousRecording,
  }

  return {
    voice,
    voiceLogs,
    addLog,
    updateLogFeedback,
    submitCorrection,
    editMode: {
      isEditMode,
      enterEditMode: () => setIsEditMode(true),
      exitEditMode: () => { setIsEditMode(false); setPendingConfirm(false) },
    },
    voiceFlow,
    pendingConfirm,
    getCellHighlightLevel,
    currentTurn,
  }
}

// ── 공종 줄임말 매핑 ──
function getAliases(name: string): string[] {
  const map: Record<string, string[]> = {
    '바탕정리': ['바정', '바탕'],
    '바탕조정제미장': ['바미', '바탕미장', '미장'],
    '하도 프라이머': ['하도', '프라이머'],
    '복합 시트': ['시트', '복합시트'],
    '노출 우레탄': ['우레탄 중도', '중도'],
    '노출 우레탄 1차': ['우레탄1차', '1차'],
    '노출 우레탄 2차': ['우레탄2차', '2차'],
    '벽체 우레탄': ['벽체', '벽체우레탄'],
    '우레탄 상도': ['상도', '탑코트', '톱코트', '탑코팅'],
    '사다리차': ['사다리'],
    '폐기물처리': ['폐기물', '폐기'],
    '드라이비트하부절개': ['드비', '드라이비트'],
    '쪼인트 실란트\n보강포 부착': ['보강포', '실란트', '쪼인트'],
  }
  return map[name] ?? []
}
