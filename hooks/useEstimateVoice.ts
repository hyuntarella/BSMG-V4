'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Estimate } from '@/lib/estimate/types'
import type { VoiceCommand } from '@/lib/voice/commands'
import type { ConfidenceResult } from '@/lib/voice/confidenceRouter'
import { useVoice } from '@/hooks/useVoice'
import { useVoiceEditMode } from '@/hooks/useVoiceEditMode'
import { useVoiceFlow } from '@/hooks/useVoiceFlow'
import { useWakeWord } from '@/hooks/useWakeWord'
import type { FlowState } from '@/lib/voice/voiceFlow'
import type { TabId } from '@/components/estimate/TabBar'
import { normalizeText, matchKeyword } from '@/lib/voice/keywordMatcher'

// ── 인터페이스 ──

interface UseEstimateVoiceOptions {
  estimate: Estimate
  activeSheetIndex: number
  setActiveTab: (tab: TabId) => void
  // useEstimate 메서드
  applyVoiceCommands: (commands: VoiceCommand[], sheetIndex?: number) => { executed: boolean; routing: ConfidenceResult }
  updateMeta: (field: keyof Estimate, value: string | number) => void
  addSheet: (type: '복합' | '우레탄') => void
  initFromVoiceFlow: (data: { area: number; wallM2: number; complexPpp: number | null; urethanePpp: number | null }) => void
  saveSnapshot: (description: string, type?: 'auto' | 'voice' | 'manual') => void
  undo: () => void
  getSheetMargin: (sheetIndex: number) => number
  // 저장/이메일 콜백
  onSave: () => Promise<void>
  onEmailOpen: () => void
}

/**
 * EstimateEditor에서 추출된 음성 관련 핸들러, 상태, 콜백 통합 훅.
 *
 * - useVoice: 녹음 + STT + LLM + TTS 파이프라인
 * - useVoiceEditMode: 수정 모드 상태 기계 (진입/종료/자동재개)
 * - useWakeWord: "수정"/"견적" 키워드 감지
 * - handleVoiceCommands: 시스템 명령 + modify 명령 라우팅
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

  // voice ref — voiceFlow에서 startRecording/stopRecording/playTts 접근용
  const voiceRef = useRef<{ startRecording: () => void; stopRecording: () => void; playTts: (text: string) => Promise<void> }>({
    startRecording: () => {},
    stopRecording: () => {},
    playTts: async () => {},
  })

  // ── voiceFlow: 면적→벽체→복합평단가→우레탄평단가 순서 수집 ──
  const voiceFlow = useVoiceFlow({
    startRecording: () => voiceRef.current.startRecording(),
    stopRecording: () => voiceRef.current.stopRecording(),
    playTts: (text: string) => voiceRef.current.playTts(text),
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

  // ── medium confidence 확인 대기 상태 ──
  // useState (not useRef): pendingConfirm이 true일 때 skipLlm이 reactive하게 true가 되어야 함.
  // re-render를 트리거해야 useVoice에 전달되는 skipLlm prop이 최신값을 가짐.
  const [pendingConfirm, setPendingConfirm] = useState(false)

  // ── 음성 모드 결정 ──
  const voiceMode = estimate.sheets.length === 0 ? 'extract' as const : 'modify' as const

  // ── 견적서 상태 JSON (LLM 컨텍스트) ──
  const estimateContext = JSON.stringify({
    m2: estimate.m2,
    sheets: estimate.sheets.map((s) => ({
      type: s.type,
      grand_total: s.grand_total,
      items: s.items.map((it) => ({
        name: it.name,
        qty: it.qty,
        mat: it.mat,
        labor: it.labor,
        exp: it.exp,
        total: it.total,
      })),
    })),
  })

  // stale closure 방지
  const callbacksRef = useRef({ onSave, onEmailOpen, addLog, undo, getSheetMargin })
  callbacksRef.current = { onSave, onEmailOpen, addLog, undo, getSheetMargin }

  // voice.playTts 참조 (순환 참조 방지용 ref)
  const voicePlayTtsRef = useRef<(text: string) => Promise<void>>(
    async (_text: string) => {}
  )

  // ── 음성 명령 처리 ──
  const handleVoiceCommands = useCallback(
    (commands: VoiceCommand[]) => {
      // 시스템 명령 처리
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
                  voicePlayTtsRef.current('해당 견적서를 찾을 수 없습니다.')
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
            const total = sheet?.grand_total ?? 0
            const itemCount = sheet?.items.length ?? 0
            const margin = callbacksRef.current.getSheetMargin(sheetIdx)
            const formatWon = (v: number) => `${Math.round(v / 10000).toLocaleString()}만원`
            const msg = `${sheet?.type ?? ''} 면적 ${estimate.m2}제곱미터, 공종 ${itemCount}개, 총액 ${formatWon(total)}, 마진 ${Math.round(margin)}퍼센트.`
            callbacksRef.current.addLog('assistant', msg)
            voicePlayTtsRef.current(msg)
            return
          }
          case 'read_margin': {
            const sheetIdx = activeSheetIndex >= 0 ? activeSheetIndex : 0
            const sheetType = estimate.sheets[sheetIdx]?.type ?? ''
            const margin = callbacksRef.current.getSheetMargin(sheetIdx)
            const msg = `${sheetType} 마진 ${Math.round(margin)}퍼센트.`
            callbacksRef.current.addLog('assistant', msg)
            voicePlayTtsRef.current(msg)
            return
          }
          case 'update_meta': {
            const field = sysCmd.field as keyof Estimate
            if (sysCmd.value !== undefined && field) {
              updateMeta(field, sysCmd.value)
              const msg = `${String(field)} ${sysCmd.value}으로 변경.`
              callbacksRef.current.addLog('assistant', msg)
              voicePlayTtsRef.current(msg)
            }
            return
          }
        }
      }

      // 수정 명령: 현재 활성 시트에 적용
      const targetSheet = activeSheetIndex >= 0 ? activeSheetIndex : 0
      saveSnapshot('음성 수정', 'voice')
      const result = applyVoiceCommands(commands, targetSheet)

      // medium confidence: 실행 후 "맞습니까?" 확인 대기
      if (result.executed && result.routing.level === 'medium') {
        setPendingConfirm(true)
      }
    },
    [activeSheetIndex, applyVoiceCommands, saveSnapshot, router, setActiveTab, estimate, updateMeta],
  )

  // editMode ref for onSttText closure
  const editModeRef = useRef({ isEditMode: false, exitEditMode: () => {} })

  // pendingConfirm ref for onSttText closure (always-fresh read)
  const pendingConfirmRef = useRef(false)
  pendingConfirmRef.current = pendingConfirm

  // enterEditMode ref for onSttText closure
  const enterEditModeRef = useRef<() => void>(() => {})

  // voiceClearLastCommandRef for onSttText closure
  const voiceClearLastCommandRef = useRef<() => void>(() => {})

  // voiceFlow ref for onSttText closure
  const voiceFlowRef = useRef(voiceFlow)
  voiceFlowRef.current = voiceFlow

  // ── useVoice 훅 ──
  const voice = useVoice({
    mode: voiceMode,
    estimateContext,
    skipLlm: pendingConfirm || voiceFlow.isActive,
    onSttText: (text) => {
      // STT 텍스트 정규화 + 키워드 매칭 (순수 함수)
      const normalized = normalizeText(text)
      console.log('[STT] raw:', JSON.stringify(text), '→ normalized:', JSON.stringify(normalized))
      console.log('[KeywordMatch]', { normalized, isEditMode: editModeRef.current.isEditMode, sheetsLen: estimate.sheets.length })

      const action = matchKeyword(normalized, editModeRef.current.isEditMode, estimate.sheets.length > 0)
      if (action === 'exit_edit') {
        console.log('[그만] 키워드 감지 → exitEditMode 호출')
        editModeRef.current.exitEditMode()
        callbacksRef.current.addLog('assistant', '종료합니다.')
        voicePlayTtsRef.current('종료합니다.')
        return true
      }
      if (action === 'confirm') {
        console.log('[확정] 키워드 감지 → 수정 확정, 자동 녹음 재개 대기')
        callbacksRef.current.addLog('assistant', '확인했습니다.')
        voicePlayTtsRef.current('확인했습니다.')
        return true
      }
      if (action === 'enter_edit') {
        console.log('[수정] 키워드 감지 → enterEditMode 호출 (무음 진입)')
        enterEditModeRef.current()
        callbacksRef.current.addLog('assistant', '수정 모드 진입.')
        return true
      }

      // 시트 없을 때(extract 모드): voiceFlow가 비활성이면 자동 시작 후 전달
      if (estimate.sheets.length === 0) {
        if (!voiceFlowRef.current.isActive) {
          voiceFlowRef.current.startFlow()
        }
        voiceFlowRef.current.processText(text)
        return true
      }

      // voiceFlow 활성 시 → voiceFlow에 전달, LLM 건너뜀
      if (voiceFlowRef.current.isActive) {
        voiceFlowRef.current.processText(text)
        return true
      }

      // medium confidence 확인 응답 체크 (pendingConfirmRef: always-fresh in callback)
      if (pendingConfirmRef.current) {
        setPendingConfirm(false)
        if (/^(아니|아니오|아니요|틀려|틀렸|달라|다르)/.test(normalized)) {
          callbacksRef.current.undo()
          voiceClearLastCommandRef.current()
          callbacksRef.current.addLog('assistant', '되돌렸습니다.')
          voicePlayTtsRef.current('되돌렸습니다.')
          return true
        }
        // 긍정("네"/"응"/"맞아") 또는 새 명령 → LLM으로 전달
        return false
      }

      return false
    },
    onCommands: handleVoiceCommands,
    onParsed: (parsed) => {
      if (parsed.area) updateMeta('m2', parsed.area as number)
      if (parsed.method) {
        const method = parsed.method as string
        if (method.includes('복합')) addSheet('복합')
        if (method.includes('우레탄')) addSheet('우레탄')
        if (method === '복합' || method === '복합+우레탄') setActiveTab('complex-detail')
        else if (method === '우레탄') setActiveTab('urethane-detail')
      }
    },
  })

  // ref 동기화
  voicePlayTtsRef.current = voice.playTts
  voiceClearLastCommandRef.current = voice.clearLastCommand
  voiceRef.current = { startRecording: voice.startRecording, stopRecording: voice.stopRecording, playTts: voice.playTts }

  // ── useVoiceEditMode: 수정 모드 상태 기계 ──
  const editMode = useVoiceEditMode({
    voiceStatus: voice.status,
    onAutoResume: voice.startRecording,
    onPlayTts: voice.playTts,
    onStopRecording: voice.stopRecording,
  })

  // ── 수정 모드 종료 래퍼: clarificationCountRef 리셋 + pendingConfirm 초기화 ──
  const handleExitEditMode = useCallback(() => {
    editMode.exitEditMode()
    voice.resetClarificationCount()
    setPendingConfirm(false)
  }, [editMode, voice])

  // editModeRef 동기화 (onSttText 클로저에서 최신 editMode 참조)
  editModeRef.current = { isEditMode: editMode.isEditMode, exitEditMode: handleExitEditMode }
  enterEditModeRef.current = editMode.enterEditMode

  // ── useWakeWord: 하드웨어/키보드/Web Speech API ──
  useWakeWord({
    onToggle: voice.toggleRecording,
    onWakeWord: () => {
      // "견적" 웨이크워드: 시트 없으면 voiceFlow 시작, 있으면 녹음 토글
      if (estimate.sheets.length === 0) {
        voiceFlow.startFlow()
      } else {
        voice.startRecording()
      }
    },
    onEditMode: () => {
      // "수정" 웨이크워드: 수정 모드 진입
      if (estimate.sheets.length > 0 && !editMode.isEditMode) {
        editMode.enterEditMode()
      }
    },
    enabled: voice.status === 'idle' || voice.status === 'speaking',
  })

  return {
    voice,
    voiceLogs,
    addLog,
    editMode: {
      ...editMode,
      exitEditMode: handleExitEditMode,
    },
    voiceFlow,
    pendingConfirm,
  }
}
