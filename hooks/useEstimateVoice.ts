'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Estimate } from '@/lib/estimate/types'
import type { VoiceCommand } from '@/lib/voice/commands'
import type { ConfidenceResult } from '@/lib/voice/confidenceRouter'
import { useVoice } from '@/hooks/useVoice'
import type { TabId } from '@/components/estimate/TabBar'
import { hasTriggerWord, removeTriggerWord, isStopWord, detectCorrection } from '@/lib/voice/triggerMatcher'
import { COMPLEX_BASE, URETHANE_BASE } from '@/lib/estimate/constants'
import type { VoiceLogEntry } from '@/lib/voice/voiceLogTypes'
import type { CorrectionEntry, AvailableItem } from '@/lib/voice/prompts'
import { parseCommand, detectRealtime, matchItemName, inferField } from '@/lib/voice/realtimeParser'
import type { ParseContext } from '@/lib/voice/realtimeParser'
import type { RealtimeHighlight } from '@/components/estimate/WorkSheet'
import type { InputMode } from '@/lib/voice/inputMode'
import { INPUT_MODE_FLAGS } from '@/lib/voice/inputMode'
import { detectAnomaly } from '@/lib/voice/anomalyDetector'
import { playConfirmSound, playErrorSound, playRollbackSound } from '@/lib/voice/soundEffect'
import { playTts, onTtsStateChange } from '@/lib/voice/ttsPlayer'
import { buildSummaryText, buildMarginText, matchSummaryKeyword } from '@/lib/voice/summaryBuilder'

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

/** "넘겨" 패턴 감지 */
const SKIP_PATTERNS = /(?:넘겨|넘겨줘|넘기자|넘기|넘겨라|시작)\s*[.?!。？！]*\s*$/

/** 글로벌 턴 카운터 */
let globalTurnCounter = 0

/**
 * EstimateEditor 음성 통합 훅 — 3모드 + 3단 파이프라인.
 *
 * 모드:
 *   - office: 사무실 (타이핑)
 *   - field: 현장 (음성+눈, 효과음)
 *   - driving: 운전 (음성만, TTS 전면)
 *
 * Layer 1: Web Speech API (실시간, 무료, 항상 ON)
 * Layer 2: Whisper API (정확, 백그라운드)
 * Layer 3: Claude Sonnet LLM (복잡한 명령만)
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

  // ── 입력 모드 ──
  const [mode, setMode] = useState<InputMode>('field')

  // ── 명령 히스토리 (사무실 모드, 최근 20개) ──
  const [commandHistory, setCommandHistory] = useState<string[]>([])

  // ── 음성 로그 ──
  const [voiceLogs, setVoiceLogs] = useState<VoiceLogEntry[]>([])
  const addLog = useCallback((
    speaker: 'user' | 'system',
    text: string,
    action?: VoiceCommand[],
    actionSummary?: string,
    executionDetail?: { prevValue?: number; fieldInferred?: boolean },
    inputSource?: 'typing' | 'voice',
  ) => {
    const entry: VoiceLogEntry = {
      id: crypto.randomUUID(),
      speaker,
      text,
      action,
      actionSummary,
      executionDetail,
      inputSource,
      feedback: null,
      timestamp: Date.now(),
    }
    setVoiceLogs((prev) => [...prev.slice(-49), entry])
    return entry.id
  }, [])

  // ── 피드백 ──
  const updateLogFeedback = useCallback((logId: string, feedback: 'positive' | 'negative') => {
    setVoiceLogs((prev) => prev.map(l =>
      l.id === logId ? { ...l, feedback } : l
    ))
  }, [])

  // ── 교정 이력 ──
  const [corrections, setCorrections] = useState<CorrectionEntry[]>([])

  // ── 최초 생성 모드: 텍스트 축적 ──
  const accumulatedTextRef = useRef<string[]>([])

  // ── 하이라이트 ──
  const [currentTurn, setCurrentTurn] = useState(0)
  const [cellTurns, setCellTurns] = useState<Map<string, number>>(new Map())

  // ── 실시간 하이라이트 (Web Speech API interim) ──
  const [realtimeHighlight, setRealtimeHighlight] = useState<RealtimeHighlight>({})

  // ── 규칙 파서로 즉시 실행한 결과 추적 (Whisper 검증용) ──
  const lastRuleResultRef = useRef<{
    command: VoiceCommand
    webSpeechText: string
    snapshotSaved: boolean
  } | null>(null)

  // ── 빠른 교정 루프: 마지막 실행 명령 추적 ──
  const lastExecutedCommandRef = useRef<VoiceCommand | null>(null)

  // ── 불완전 명령 버퍼 (Step 4) ──
  const pendingBufferRef = useRef<string>('')
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [bufferHint, setBufferHint] = useState<string>('')

  // stale closure 방지
  const modeRef = useRef(mode)
  modeRef.current = mode
  const estimateRef = useRef(estimate)
  estimateRef.current = estimate
  const activeSheetIndexRef = useRef(activeSheetIndex)
  activeSheetIndexRef.current = activeSheetIndex
  const callbacksRef = useRef({ onSave, onEmailOpen, undo, getSheetMargin, addLog, saveSnapshot, applyVoiceCommands, updateMeta, addSheet, initFromVoiceFlow, setActiveTab })
  callbacksRef.current = { onSave, onEmailOpen, undo, getSheetMargin, addLog, saveSnapshot, applyVoiceCommands, updateMeta, addSheet, initFromVoiceFlow, setActiveTab }

  // ── 공종 마스터 데이터 ──
  const availableItems: AvailableItem[] = [
    ...COMPLEX_BASE.map(b => ({ name: b.name, unit: b.unit, mat: 0, labor: 0, exp: 0, aliases: getAliases(b.name) })),
    ...URETHANE_BASE.filter(b => !COMPLEX_BASE.some(c => c.name === b.name)).map(b => ({
      name: b.name, unit: b.unit, mat: 0, labor: 0, exp: 0, aliases: getAliases(b.name),
    })),
  ]

  /** 현재 시트의 공종명 목록 */
  const getSheetItemNames = useCallback((): string[] => {
    const est = estimateRef.current
    const idx = activeSheetIndexRef.current
    if (idx < 0 || idx >= est.sheets.length) return []
    return est.sheets[idx].items.map(it => it.name)
  }, [])

  /** 명령의 이전 값 추출 (실행 상세 로그용) */
  const getPrevValue = useCallback((cmd: VoiceCommand): number | undefined => {
    const est = estimateRef.current
    const idx = activeSheetIndexRef.current
    if (idx < 0 || idx >= est.sheets.length) return undefined
    if (cmd.action !== 'update_item' || !cmd.target || !cmd.field) return undefined
    const item = est.sheets[idx].items.find(it => it.name === cmd.target)
    if (!item) return undefined
    const fieldKey = cmd.field as keyof typeof item
    const val = item[fieldKey]
    return typeof val === 'number' ? val : undefined
  }, [])

  /** ParseContext 빌드 (필드 추론용) */
  const buildParseContext = useCallback((): ParseContext => {
    const est = estimateRef.current
    const idx = activeSheetIndexRef.current
    const sheetState = (idx >= 0 && idx < est.sheets.length)
      ? est.sheets[idx].items.map(it => ({
          name: it.name,
          mat: it.mat,
          labor: it.labor,
          exp: it.exp,
          is_equipment: it.is_equipment ?? false,
        }))
      : undefined
    return {
      lastCommand: lastExecutedCommandRef.current ?? undefined,
      sheetState,
    }
  }, [])

  // ── 견적서 상태 JSON ──
  const buildEstimateContext = useCallback(() => {
    const est = estimateRef.current
    return JSON.stringify({
      m2: est.m2, wall_m2: est.wall_m2,
      sheets: est.sheets.map((s) => ({
        type: s.type, price_per_pyeong: s.price_per_pyeong, grand_total: s.grand_total,
        items: s.items.map((it) => ({
          name: it.name, spec: it.spec, unit: it.unit, qty: it.qty,
          mat: it.mat, labor: it.labor, exp: it.exp,
          mat_amount: it.mat_amount, labor_amount: it.labor_amount, exp_amount: it.exp_amount,
          total: it.total,
        })),
      })),
    })
  }, [])

  // ── LLM modify 호출 (Layer 3) ──
  const sendToModifyLlm = useCallback(async (text: string) => {
    try {
      const { getModifySystem } = require('@/lib/voice/prompts')
      const system = getModifySystem(
        buildEstimateContext(),
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

      if (data.clarification_needed) {
        callbacksRef.current.addLog('system', data.clarification_needed)
        return
      }

      if (data.commands && data.commands.length > 0) {
        handleModifyCommands(data.commands, text)
      }
    } catch (err) {
      console.error('[LLM] error:', err)
      callbacksRef.current.addLog('system', '처리 실패')
    }
  }, [buildEstimateContext, corrections, availableItems])

  // ── LLM extract 호출 (최초 생성) ──
  const sendToExtractLlm = useCallback(async (text: string) => {
    try {
      const { EXTRACT_SYSTEM } = require('@/lib/voice/prompts')

      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: EXTRACT_SYSTEM, user: text }),
      })
      if (!res.ok) throw new Error('LLM 실패')
      const data = await res.json()
      console.log('[LLM] extract:', data)

      const area = data.area ?? 100
      const wallM2 = data.wallM2 ?? data.wall_m2 ?? 0
      const complexPpp = data.complexPpp ?? null
      const urethanePpp = data.urethanePpp ?? null

      callbacksRef.current.initFromVoiceFlow({ area, wallM2, complexPpp, urethanePpp })
      callbacksRef.current.setActiveTab('complex-detail')

      const summary = `면적 ${area}㎡ 벽체 ${wallM2}㎡ 복합 ${complexPpp ?? '자동'} 우레탄 ${urethanePpp ?? '자동'}`
      callbacksRef.current.addLog('system', `견적서 생성: ${summary}`)
    } catch (err) {
      console.error('[LLM] extract error:', err)
      callbacksRef.current.addLog('system', '생성 실패')
    }
  }, [])

  // ── 수정 명령 적용 (모드 인식) ──
  const handleModifyCommands = useCallback((commands: VoiceCommand[], originalText: string) => {
    const currentMode = modeRef.current
    const flags = INPUT_MODE_FLAGS[currentMode]

    // 시스템 명령 먼저 확인
    const sysCmd = commands.find((c) =>
      ['save', 'email', 'load', 'undo', 'switch_tab', 'read_summary', 'read_margin', 'compare', 'update_meta'].includes(c.action)
    )

    if (sysCmd) {
      handleSystemCommand(sysCmd)
      // 운전 모드: undo에 TTS
      if (flags.ttsEnabled && sysCmd.action === 'undo') {
        playTts('취소했습니다.')
      }
      // 현장 모드: undo에 롤백 효과음
      if (flags.soundEffectsEnabled && sysCmd.action === 'undo') {
        playRollbackSound()
      }
      return
    }

    // 수정 명령 — 이전값 추출 (로그용 + 이상치 감지)
    const firstCmd = commands[0]
    const prevValue = firstCmd ? getPrevValue(firstCmd) : undefined

    // 이상치 감지
    if (firstCmd) {
      const anomaly = detectAnomaly(firstCmd, prevValue)
      if (anomaly.isAnomaly) {
        if (flags.ttsEnabled) playTts(anomaly.message)
        callbacksRef.current.addLog('system', `⚠ ${anomaly.message}`, undefined, undefined, undefined, 'voice')
      }
    }

    const targetSheet = activeSheetIndexRef.current >= 0 ? activeSheetIndexRef.current : 0
    callbacksRef.current.saveSnapshot('음성 수정', 'voice')
    const result = callbacksRef.current.applyVoiceCommands(commands, targetSheet)

    // 로그 + 하이라이트
    const summary = commands.map((c: VoiceCommand) =>
      `${c.target ?? ''} ${c.field ?? c.action} ${c.value ?? (c.delta ? (c.delta > 0 ? '+' : '') + c.delta : '')}`.trim()
    ).join(', ')

    callbacksRef.current.addLog('user', originalText, commands, summary, { prevValue }, 'voice')

    // 빠른 교정용 마지막 명령 저장
    lastExecutedCommandRef.current = commands[commands.length - 1]

    if (result.executed) {
      // 효과음 (현장 모드만)
      if (flags.soundEffectsEnabled) playConfirmSound()
      // TTS (운전 모드)
      if (flags.ttsEnabled) playTts(`${summary} 반영.`)

      const newTurn = ++globalTurnCounter
      setCurrentTurn(newTurn)
      setCellTurns(prev => {
        const next = new Map(prev)
        commands.forEach(c => {
          if (c.target) next.set(`voice:${targetSheet}:${c.target}:${c.field ?? c.action}`, newTurn)
        })
        return next
      })
    } else {
      if (flags.soundEffectsEnabled) playErrorSound()
      if (flags.ttsEnabled) playTts('실행 실패.')
    }
  }, [])

  // ── 시스템 명령 처리 ──
  const handleSystemCommand = useCallback((cmd: VoiceCommand) => {
    const currentMode = modeRef.current
    const flags = INPUT_MODE_FLAGS[currentMode]

    switch (cmd.action) {
      case 'save':
        callbacksRef.current.onSave()
        if (flags.ttsEnabled) playTts('저장합니다.')
        break
      case 'email':
        callbacksRef.current.onEmailOpen()
        if (flags.ttsEnabled) playTts('이메일 발송 준비.')
        break
      case 'undo':
        callbacksRef.current.undo()
        callbacksRef.current.addLog('system', '취소')
        break
      case 'load': {
        const query = cmd.query ?? cmd.target ?? ''
        const date = cmd.date ?? ''
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        if (date) params.set('date', date)
        fetch(`/api/estimates/search?${params}`)
          .then(r => r.json())
          .then(data => {
            if (data.estimates?.length > 0) router.push(`/estimate/${data.estimates[0].id}`)
          })
        break
      }
      case 'switch_tab': {
        const t = cmd.target
        if (t === '복합' || t === 'complex') callbacksRef.current.setActiveTab('complex-detail')
        else if (t === '우레탄' || t === 'urethane') callbacksRef.current.setActiveTab('urethane-detail')
        else if (t === '비교' || t === 'compare') callbacksRef.current.setActiveTab('compare')
        break
      }
      case 'compare': callbacksRef.current.setActiveTab('compare'); break
      case 'read_summary': {
        const est = estimateRef.current
        const idx = activeSheetIndexRef.current
        if (idx >= 0 && idx < est.sheets.length) {
          const sheet = est.sheets[idx]
          const margin = callbacksRef.current.getSheetMargin(idx)
          const text = buildSummaryText(sheet.type, est.m2, sheet.items.length, sheet.grand_total, margin)
          callbacksRef.current.addLog('system', text)
          if (flags.ttsEnabled) playTts(text)
        }
        break
      }
      case 'read_margin': {
        const est = estimateRef.current
        const idx = activeSheetIndexRef.current
        if (idx >= 0 && idx < est.sheets.length) {
          const sheet = est.sheets[idx]
          const margin = callbacksRef.current.getSheetMargin(idx)
          const text = buildMarginText(sheet.type, margin)
          callbacksRef.current.addLog('system', text)
          if (flags.ttsEnabled) playTts(text)
        }
        break
      }
      case 'update_meta': {
        const field = cmd.field as keyof Estimate
        if (cmd.value !== undefined && field) {
          callbacksRef.current.updateMeta(field, cmd.value)
          callbacksRef.current.addLog('system', `${String(field)} → ${cmd.value}`)
        }
        break
      }
    }
  }, [router])

  const sendToModifyLlmRef = useRef(sendToModifyLlm)
  sendToModifyLlmRef.current = sendToModifyLlm
  const sendToExtractLlmRef = useRef(sendToExtractLlm)
  sendToExtractLlmRef.current = sendToExtractLlm
  const handleModifyCommandsRef = useRef(handleModifyCommands)
  handleModifyCommandsRef.current = handleModifyCommands

  // ── Layer 1: Web Speech API interim result 처리 (실시간 피드백) ──
  const handleInterim = useCallback((text: string) => {
    if (estimateRef.current.sheets.length === 0) return // 최초 모드에서는 무시

    // 빠른 교정 루프: "아니" 계열 감지
    const correction = detectCorrection(text)
    if (correction) {
      const lastCmd = lastExecutedCommandRef.current
      if (!lastCmd) return

      // "아니" 뒤에 공종명이 오면 교정이 아니라 새 명령 → 무시
      const afterNi = text.trim().replace(/^(?:아니야|아닌데|아니)\s*/, '').trim()
      if (afterNi && matchItemName(afterNi, getSheetItemNames())) return

      if (correction.type === 'undo_only') {
        callbacksRef.current.undo()
        callbacksRef.current.addLog('system', '취소')
        lastExecutedCommandRef.current = null
        const currentMode = modeRef.current
        const flags = INPUT_MODE_FLAGS[currentMode]
        if (flags.soundEffectsEnabled) playRollbackSound()
        if (flags.ttsEnabled) playTts('취소했습니다.')
        return
      }
      if (correction.type === 'undo_and_replace_value' && correction.newValue !== undefined) {
        callbacksRef.current.undo()
        const newCmd: VoiceCommand = { ...lastCmd, value: correction.newValue, delta: undefined }
        handleModifyCommandsRef.current([newCmd], text)
        return
      }
      if (correction.type === 'undo_and_replace_field' && correction.newField) {
        callbacksRef.current.undo()
        const newCmd: VoiceCommand = { ...lastCmd, field: correction.newField }
        handleModifyCommandsRef.current([newCmd], text)
        return
      }
    }

    const sheetItems = getSheetItemNames()
    const detection = detectRealtime(text, sheetItems)

    setRealtimeHighlight({
      itemName: detection.itemName,
      field: detection.field,
      previewValue: detection.previewValue,
    })
  }, [getSheetItemNames])

  // ── Layer 1: 종결 어미 감지 시 규칙 파서로 즉시 실행 ──
  const handleEndingDetected = useCallback((interimText: string) => {
    if (estimateRef.current.sheets.length === 0) return // 최초 모드 제외

    // 실시간 하이라이트 초기화
    setRealtimeHighlight({})

    // 불완전 버퍼 합치기
    let textToProcess = interimText
    if (pendingBufferRef.current) {
      textToProcess = pendingBufferRef.current + ' ' + interimText
      pendingBufferRef.current = ''
      setBufferHint('')
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current)
        bufferTimerRef.current = null
      }
    }

    // 조회 명령 감지 ("현황", "총액", "요약", "마진")
    const summaryKeyword = matchSummaryKeyword(textToProcess)
    if (summaryKeyword) {
      handleModifyCommandsRef.current([{ action: summaryKeyword, confidence: 0.98 }], textToProcess)
      return
    }

    const sheetItems = getSheetItemNames()
    const ctx = buildParseContext()
    const result = parseCommand(textToProcess, sheetItems, ctx)

    if (result.success && result.command) {
      // 다중 명령 (commands 배열) 처리
      const commands = result.commands ?? [result.command]

      // undo 명령은 직접 처리
      if (commands.length === 1 && commands[0].action === 'undo') {
        handleModifyCommandsRef.current(commands, textToProcess)
        return
      }

      // 이전값 추출 (로그용)
      const prevValue = getPrevValue(commands[0])
      const currentMode = modeRef.current
      const flags = INPUT_MODE_FLAGS[currentMode]

      // 이상치 감지
      const anomaly = detectAnomaly(commands[0], prevValue)
      if (anomaly.isAnomaly) {
        if (flags.ttsEnabled) playTts(anomaly.message)
        callbacksRef.current.addLog('system', `⚠ ${anomaly.message}`, undefined, undefined, undefined, 'voice')
      }

      // 규칙 파서 즉시 실행
      console.log('[RuleParser] 즉시 실행:', commands, result.fieldInferred ? `(추론: ${result.inferredConfidence})` : '')
      callbacksRef.current.saveSnapshot('음성 수정 (규칙파서)', 'voice')
      const targetSheet = activeSheetIndexRef.current >= 0 ? activeSheetIndexRef.current : 0
      callbacksRef.current.applyVoiceCommands(commands, targetSheet)

      // Whisper 검증용 저장 (첫 번째 명령만)
      lastRuleResultRef.current = {
        command: commands[0],
        webSpeechText: textToProcess,
        snapshotSaved: true,
      }

      // 빠른 교정용 마지막 명령 저장
      lastExecutedCommandRef.current = commands[commands.length - 1]

      // 효과음 (현장 모드)
      if (flags.soundEffectsEnabled) playConfirmSound()

      // TTS (운전 모드)
      const inferTag = result.fieldInferred ? ' (추론)' : ''
      const summary = commands.map((c: VoiceCommand) =>
        `${c.target ?? ''} ${c.field ?? c.action} ${c.value ?? (c.delta ? (c.delta > 0 ? '+' : '') + c.delta : '')}`.trim()
      ).join(', ') + inferTag
      if (flags.ttsEnabled) playTts(`${summary} 반영.`)

      // 로그
      callbacksRef.current.addLog('user', textToProcess, commands, summary, {
        prevValue,
        fieldInferred: result.fieldInferred,
      }, 'voice')

      const newTurn = ++globalTurnCounter
      setCurrentTurn(newTurn)
      setCellTurns(prev => {
        const next = new Map(prev)
        commands.forEach(c => {
          if (c.target) next.set(`voice:${targetSheet}:${c.target}:${c.field ?? c.action}`, newTurn)
        })
        return next
      })
    } else if (result.needsLlm) {
      // 불완전 명령 버퍼: 공종명만 감지됐으면 버퍼에 저장
      const detection = detectRealtime(textToProcess, sheetItems)
      if (detection.itemName && !detection.previewValue) {
        pendingBufferRef.current = textToProcess
        setBufferHint(detection.itemName)
        // 2초 후 힌트 클리어
        bufferTimerRef.current = setTimeout(() => {
          pendingBufferRef.current = ''
          setBufferHint('')
          bufferTimerRef.current = null
        }, 2000)
      }
      // needsLlm인 경우 → Whisper(onSegment)에서 LLM으로 처리됨
    }
  }, [getSheetItemNames, buildParseContext])

  // ── Layer 2: Whisper 세그먼트 처리 (검증 + 복잡 명령) ──
  const handleSegment = useCallback((text: string) => {
    console.log('[Voice] segment:', JSON.stringify(text))
    let processedText = text

    // 종료 단어 ("끝", "그만")
    if (isStopWord(processedText.trim())) {
      if (estimateRef.current.sheets.length === 0 && accumulatedTextRef.current.length > 0) {
        const combined = accumulatedTextRef.current.join(' ')
        accumulatedTextRef.current = []
        callbacksRef.current.addLog('user', combined)
        sendToExtractLlmRef.current(combined)
      }
      return
    }

    // "넣어" 트리거 단어 감지 + 제거
    const hadTrigger = hasTriggerWord(processedText)
    if (hadTrigger) {
      processedText = removeTriggerWord(processedText)
    }

    // "넘겨" 감지 (최초 생성 트리거)
    const hadSkip = SKIP_PATTERNS.test(processedText.trim())
    if (hadSkip) {
      processedText = processedText.trim().replace(SKIP_PATTERNS, '').trim()
    }

    const hasContent = processedText.trim().length > 0

    // ── 최초 생성 모드 (시트 없음) ──
    if (estimateRef.current.sheets.length === 0) {
      if (hasContent) {
        accumulatedTextRef.current.push(processedText)
      }

      if (hadSkip || hadTrigger) {
        const combined = accumulatedTextRef.current.join(' ')
        accumulatedTextRef.current = []
        if (combined.trim()) {
          callbacksRef.current.addLog('user', combined)
          sendToExtractLlmRef.current(combined)
        }
      }
      return
    }

    // ── 수정 모드 (시트 있음) — Whisper 검증 + LLM 폴백 ──
    if (!hasContent) return

    // 규칙 파서가 이미 실행했는지 확인 (Whisper 검증)
    const lastRule = lastRuleResultRef.current
    if (lastRule) {
      lastRuleResultRef.current = null // 1회 소모

      // Whisper 텍스트로 다시 규칙 파서 실행
      const sheetItems = getSheetItemNames()
      const whisperResult = parseCommand(processedText, sheetItems, buildParseContext())

      if (whisperResult.success && whisperResult.command) {
        // Whisper 결과와 비교
        const same = isSameCommand(lastRule.command, whisperResult.command)
        if (!same) {
          // 다르다! → 롤백 + Whisper 결과로 재실행
          console.log('[Whisper] 검증 실패 — 롤백 + 재실행:', whisperResult.command)
          callbacksRef.current.undo()
          handleModifyCommandsRef.current([whisperResult.command], processedText)
        } else {
          console.log('[Whisper] 검증 통과')
        }
        return
      }

      if (whisperResult.needsLlm) {
        // 규칙 파서가 이미 처리했지만 Whisper에서 다른 패턴 → 롤백 + LLM
        console.log('[Whisper] 규칙 파서 결과 롤백 → LLM으로')
        callbacksRef.current.undo()
        sendToModifyLlmRef.current(processedText)
        return
      }
    }

    // 규칙 파서 시도 (종결어미 없이 2초 무음으로 온 경우)
    const sheetItems = getSheetItemNames()
    const ruleResult = parseCommand(processedText, sheetItems, buildParseContext())

    if (ruleResult.success && ruleResult.command) {
      // 규칙 파서 성공 → 즉시 실행 (Whisper 텍스트이므로 검증 불필요)
      const commands = ruleResult.commands ?? [ruleResult.command]
      handleModifyCommandsRef.current(commands, processedText)
      return
    }

    // 규칙 파서 실패 → LLM (Layer 3)
    sendToModifyLlmRef.current(processedText)
  }, [getSheetItemNames, buildParseContext])

  // ── useVoice 훅 (Layer 1 + Layer 2) ──
  const voiceHook = useVoice({
    onSegment: handleSegment,
    onInterim: handleInterim,
    onEndingDetected: handleEndingDetected,
    onError: (err) => console.error('[Voice]', err),
    silenceDurationMs: 2000,
  })

  // ── TTS-음성입력 겹침 방지 (조치 3) ──
  useEffect(() => {
    const unsubscribe = onTtsStateChange((playing) => {
      if (playing) {
        voiceHook.pauseRecognition()
      } else {
        voiceHook.resumeRecognition()
      }
    })
    return unsubscribe
  }, [voiceHook.pauseRecognition, voiceHook.resumeRecognition])

  // ── 교정 처리 ──
  const submitCorrection = useCallback(async (logId: string, correctionText: string) => {
    const originalLog = voiceLogs.find(l => l.id === logId)
    if (!originalLog) return

    callbacksRef.current.addLog('user', correctionText)
    sendToModifyLlmRef.current(correctionText)

    setCorrections(prev => [...prev.slice(-9), {
      original_text: originalLog.text,
      corrected_action: { correction: correctionText },
      context: { targetItem: originalLog.action?.[0]?.target, targetField: originalLog.action?.[0]?.field },
    }])
    updateLogFeedback(logId, 'negative')
  }, [voiceLogs, updateLogFeedback])

  // ── 셀 하이라이트 ──
  const getCellHighlightLevel = useCallback((cellKey: string): number => {
    const cellTurn = cellTurns.get(cellKey)
    if (cellTurn === undefined) return 0
    const diff = currentTurn - cellTurn
    if (diff <= 0) return 1
    if (diff === 1) return 2
    if (diff === 2) return 3
    return 0
  }, [cellTurns, currentTurn])

  // ── 사무실 모드: 텍스트 입력 처리 ──

  /** 실시간 입력 → 하이라이트 */
  const handleTextInput = useCallback((text: string) => {
    if (!text.trim()) {
      setRealtimeHighlight({})
      return
    }
    const sheetItems = getSheetItemNames()
    const detection = detectRealtime(text, sheetItems)
    setRealtimeHighlight({
      itemName: detection.itemName,
      field: detection.field,
      previewValue: detection.previewValue,
    })
  }, [getSheetItemNames])

  /** Enter → 명령 실행 */
  const handleTextSubmit = useCallback((text: string) => {
    setRealtimeHighlight({})
    if (estimateRef.current.sheets.length === 0) return

    // 히스토리 추가
    setCommandHistory(prev => [...prev.slice(-19), text])

    const sheetItems = getSheetItemNames()
    const ctx = buildParseContext()
    const result = parseCommand(text, sheetItems, ctx)

    if (result.success) {
      const commands = result.commands ?? (result.command ? [result.command] : [])
      if (commands.length > 0) {
        // undo 명령 처리
        if (commands.length === 1 && commands[0].action === 'undo') {
          callbacksRef.current.undo()
          callbacksRef.current.addLog('system', '취소', undefined, undefined, undefined, 'typing')
          return
        }

        // 수정 명령 — 이전값 추출 (로그용)
        const firstCmd = commands[0]
        const prevValue = firstCmd ? getPrevValue(firstCmd) : undefined

        const targetSheet = activeSheetIndexRef.current >= 0 ? activeSheetIndexRef.current : 0
        callbacksRef.current.saveSnapshot('타이핑 수정', 'voice')
        callbacksRef.current.applyVoiceCommands(commands, targetSheet)

        // 로그 + 하이라이트
        const summary = commands.map((c: VoiceCommand) =>
          `${c.target ?? ''} ${c.field ?? c.action} ${c.value ?? (c.delta ? (c.delta > 0 ? '+' : '') + c.delta : '')}`.trim()
        ).join(', ')

        callbacksRef.current.addLog('user', text, commands, summary, { prevValue }, 'typing')

        lastExecutedCommandRef.current = commands[commands.length - 1]

        const newTurn = ++globalTurnCounter
        setCurrentTurn(newTurn)
        setCellTurns(prev => {
          const next = new Map(prev)
          commands.forEach(c => {
            if (c.target) next.set(`voice:${targetSheet}:${c.target}:${c.field ?? c.action}`, newTurn)
          })
          return next
        })
      }
    } else if (result.needsLlm) {
      callbacksRef.current.addLog('user', text, undefined, undefined, undefined, 'typing')
      sendToModifyLlmRef.current(text)
    }
  }, [getSheetItemNames, buildParseContext])

  /** ESC → 미리보기 취소 */
  const handleTextCancel = useCallback(() => {
    setRealtimeHighlight({})
  }, [])

  /** 멀티라인 붙여넣기 → 줄 단위 처리 */
  const handleMultilineSubmit = useCallback((lines: string[]) => {
    for (const line of lines) {
      handleTextSubmit(line)
    }
  }, [handleTextSubmit])

  // ── 녹음 시작 시 축적 텍스트 초기화 ──
  const startRecording = useCallback(async () => {
    accumulatedTextRef.current = []
    setRealtimeHighlight({})
    voiceHook.startRecording()
  }, [voiceHook])

  // ── 녹음 종료 시 미처리 축적 텍스트 처리 ──
  const stopRecording = useCallback(() => {
    setRealtimeHighlight({})
    if (estimateRef.current.sheets.length === 0 && accumulatedTextRef.current.length > 0) {
      const combined = accumulatedTextRef.current.join(' ')
      accumulatedTextRef.current = []
      if (combined.trim()) {
        callbacksRef.current.addLog('user', combined)
        sendToExtractLlmRef.current(combined)
      }
    }
    voiceHook.stopRecording()
  }, [voiceHook])

  return {
    voice: {
      status: voiceHook.status,
      seconds: voiceHook.seconds,
      lastText: voiceHook.lastText,
      interimText: voiceHook.interimText,
      audioLevel: voiceHook.audioLevel,
      processingCount: voiceHook.processingCount,
      toggleRecording: voiceHook.toggleRecording,
      startRecording,
      stopRecording,
    },
    voiceLogs,
    addLog,
    updateLogFeedback,
    submitCorrection,
    getCellHighlightLevel,
    currentTurn,
    realtimeHighlight,
    bufferHint,
    mode,
    setMode,
    handleTextInput,
    handleTextSubmit,
    handleTextCancel,
    handleMultilineSubmit,
    commandHistory,
  }
}

// ── 명령 비교 (검증용) ──

function isSameCommand(a: VoiceCommand, b: VoiceCommand): boolean {
  if (a.action !== b.action) return false
  if (a.target !== b.target) return false
  if (a.field !== b.field) return false
  if (a.value !== undefined && b.value !== undefined) return a.value === b.value
  if (a.delta !== undefined && b.delta !== undefined) return a.delta === b.delta
  return true
}

// ── 공종 줄임말 매핑 ──
export function getAliases(name: string): string[] {
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
