'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Estimate } from '@/lib/estimate/types'
import type { VoiceCommand } from '@/lib/voice/commands'
import { useVoice } from '@/hooks/useVoice'
import { useVoiceEditMode } from '@/hooks/useVoiceEditMode'
import { useWakeWord } from '@/hooks/useWakeWord'
import type { TabId } from '@/components/estimate/TabBar'

// ── 인터페이스 ──

interface UseEstimateVoiceOptions {
  estimate: Estimate
  activeSheetIndex: number
  setActiveTab: (tab: TabId) => void
  // useEstimate 메서드
  applyVoiceCommands: (commands: VoiceCommand[], sheetIndex?: number) => { executed: boolean }
  updateMeta: (field: keyof Estimate, value: string | number) => void
  addSheet: (type: '복합' | '우레탄') => void
  pushUndo: () => void
  undo: () => void
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
  pushUndo,
  undo,
  onSave,
  onEmailOpen,
}: UseEstimateVoiceOptions) {
  const router = useRouter()

  // ── 음성 로그 ──
  const [voiceLogs, setVoiceLogs] = useState<{ type: 'user' | 'assistant'; text: string }[]>([])

  const addLog = useCallback((type: 'user' | 'assistant', text: string) => {
    setVoiceLogs((prev) => [...prev.slice(-49), { type, text }])
  }, [])

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
  const callbacksRef = useRef({ onSave, onEmailOpen, addLog, undo })
  callbacksRef.current = { onSave, onEmailOpen, addLog, undo }

  // voice.playTts 참조 (순환 참조 방지용 ref)
  const voicePlayTtsRef = useRef<(text: string) => Promise<void>>(
    async (_text: string) => {}
  )

  // ── 음성 명령 처리 ──
  const handleVoiceCommands = useCallback(
    (commands: VoiceCommand[]) => {
      // 시스템 명령 처리
      const sysCmd = commands.find((c) =>
        ['save', 'email', 'load', 'undo', 'switch_tab', 'read_summary', 'read_margin', 'compare'].includes(c.action)
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
          case 'switch_tab':
            if (sysCmd.target) setActiveTab(sysCmd.target as TabId)
            return
          case 'compare':
            setActiveTab('compare')
            return
        }
      }

      // 수정 명령: 현재 활성 시트에 적용
      const targetSheet = activeSheetIndex >= 0 ? activeSheetIndex : 0
      pushUndo()
      applyVoiceCommands(commands, targetSheet)
    },
    [activeSheetIndex, applyVoiceCommands, pushUndo, router, setActiveTab],
  )

  // ── useVoice 훅 ──
  const voice = useVoice({
    mode: voiceMode,
    estimateContext,
    onCommands: handleVoiceCommands,
    onParsed: (parsed) => {
      if (parsed.area) updateMeta('m2', parsed.area as number)
      if (parsed.method) {
        const method = parsed.method as string
        if (method.includes('복합')) addSheet('복합')
        if (method.includes('우레탄')) addSheet('우레탄')
        if (method === '복합' || method === '복합+우레탄') setActiveTab('complex')
        else if (method === '우레탄') setActiveTab('urethane')
      }
    },
  })

  // playTts ref 동기화
  voicePlayTtsRef.current = voice.playTts

  // ── useVoiceEditMode: 수정 모드 상태 기계 ──
  const editMode = useVoiceEditMode({
    voiceStatus: voice.status,
    onAutoResume: voice.startRecording,
    onPlayTts: voice.playTts,
  })

  // ── useWakeWord: 하드웨어/키보드/Web Speech API ──
  useWakeWord({
    onToggle: voice.toggleRecording,
    onWakeWord: () => {
      // "견적" 웨이크워드: 시트 없으면 녹음 시작, 있으면 녹음 토글
      voice.startRecording()
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
    editMode,
  }
}
