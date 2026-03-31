'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Estimate, PriceMatrixRaw } from '@/lib/estimate/types'
import type { VoiceCommand } from '@/lib/voice/commands'
import { useEstimate } from '@/hooks/useEstimate'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useVoice } from '@/hooks/useVoice'
import { useWakeWord } from '@/hooks/useWakeWord'
import TabBar, { type TabId } from './TabBar'
import CoverSheet from './CoverSheet'
import WorkSheet from './WorkSheet'
import CompareSheet from './CompareSheet'
import VoiceBar from '@/components/voice/VoiceBar'
import EmailModal from './EmailModal'

interface EstimateEditorProps {
  initialEstimate: Estimate
  priceMatrix: PriceMatrixRaw
}

export default function EstimateEditor({
  initialEstimate,
  priceMatrix,
}: EstimateEditorProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('cover')
  const [saving, setSaving] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  const {
    estimate,
    isDirty,
    markClean,
    updateMeta,
    updateSheet,
    updateItem,
    addItem,
    applyVoiceCommands,
    addSheet,
    getSheetMargin,
    pushUndo,
    undo,
  } = useEstimate(initialEstimate, priceMatrix)

  // 자동 저장
  useAutoSave({
    estimate,
    isDirty,
    onSaved: markClean,
    enabled: !!estimate.id,
  })

  // 활성 시트 인덱스
  const activeSheetIndex =
    activeTab === 'complex'
      ? estimate.sheets.findIndex((s) => s.type === '복합')
      : activeTab === 'urethane'
        ? estimate.sheets.findIndex((s) => s.type === '우레탄')
        : -1

  // ── 저장 (generate API) ──
  const handleSave = useCallback(async () => {
    if (!estimate.id || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/generate`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        voice.playTts(`저장 완료. 관리번호 ${estimate.mgmt_no ?? ''}.`)
      } else {
        voice.playTts('저장에 실패했습니다.')
      }
    } catch {
      voice.playTts('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.id, estimate.mgmt_no, saving])

  // ── 이메일 발송 ──
  const handleEmail = useCallback(async (to: string) => {
    if (!estimate.id) return
    setEmailSending(true)
    try {
      // 먼저 저장
      await fetch(`/api/estimates/${estimate.id}/generate`, { method: 'POST' })

      const res = await fetch(`/api/estimates/${estimate.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      })
      const data = await res.json()
      setEmailOpen(false)
      if (data.success) {
        voice.playTts(`${to}으로 발송 완료.`)
      } else {
        voice.playTts('이메일 발송에 실패했습니다.')
      }
    } catch {
      voice.playTts('이메일 발송 중 오류가 발생했습니다.')
    } finally {
      setEmailSending(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.id])

  // 음성 모드 결정
  const voiceMode =
    estimate.sheets.length === 0 ? 'extract' as const : 'modify' as const

  // 견적서 상태 JSON (LLM 컨텍스트)
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

  // 음성 명령 처리
  const handleVoiceCommands = useCallback(
    (commands: VoiceCommand[]) => {
      // 시스템 명령 처리
      const sysCmd = commands.find((c) =>
        ['save', 'email', 'load', 'undo', 'switch_tab', 'read_summary', 'read_margin', 'compare'].includes(c.action)
      )

      if (sysCmd) {
        switch (sysCmd.action) {
          case 'save':
            handleSave()
            return
          case 'email':
            setEmailOpen(true)
            return
          case 'load': {
            const cmd = sysCmd
            const query = cmd.query ?? cmd.target ?? ''
            const date = cmd.date ?? ''
            const params = new URLSearchParams()
            if (query) params.set('q', query)
            if (date) params.set('date', date)
            fetch(`/api/estimates/search?${params}`)
              .then(r => r.json())
              .then(data => {
                if (data.estimates?.length > 0) {
                  router.push(`/estimate/${data.estimates[0].id}`)
                } else {
                  voice.playTts('해당 견적서를 찾을 수 없습니다.')
                }
              })
            return
          }
          case 'undo':
            undo()
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
      if (estimate.sheets[targetSheet]) {
        pushUndo()
        applyVoiceCommands(commands, targetSheet)
      }
    },
    [activeSheetIndex, estimate.sheets, applyVoiceCommands, pushUndo, undo, handleSave],
  )

  // 음성 훅
  const voice = useVoice({
    mode: voiceMode,
    estimateContext,
    onCommands: handleVoiceCommands,
    onParsed: (parsed) => {
      // extract 결과 → 면적 등 반영
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

  // 웨이크워드
  useWakeWord({
    onToggle: voice.toggleRecording,
    enabled: true,
  })

  const hasComplex = estimate.sheets.some((s) => s.type === '복합')
  const hasUrethane = estimate.sheets.some((s) => s.type === '우레탄')

  return (
    <div className="flex min-h-screen flex-col pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <a href="/estimates" className="text-gray-400 hover:text-gray-600">&larr;</a>
          <h1 className="text-sm font-bold text-brand">방수명가 견적서</h1>
          {estimate.mgmt_no && (
            <span className="text-xs text-gray-400">{estimate.mgmt_no}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !estimate.id}
            className="rounded bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={() => setEmailOpen(true)}
            disabled={!estimate.id}
            className="rounded border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-red-50 disabled:opacity-50"
          >
            이메일
          </button>
          {isDirty && (
            <span className="text-xs text-amber-500">변경됨</span>
          )}
          {!hasComplex && (
            <button
              onClick={() => { addSheet('복합'); setActiveTab('complex') }}
              className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
            >
              + 복합
            </button>
          )}
          {!hasUrethane && (
            <button
              onClick={() => { addSheet('우레탄'); setActiveTab('urethane') }}
              className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:bg-purple-200"
            >
              + 우레탄
            </button>
          )}
        </div>
      </header>

      {/* 탭 */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasComplex={hasComplex}
        hasUrethane={hasUrethane}
      />

      {/* 콘텐츠 */}
      <main className="flex-1 px-3 py-3">
        {activeTab === 'cover' && (
          <CoverSheet estimate={estimate} onUpdate={updateMeta} />
        )}

        {activeTab === 'complex' && activeSheetIndex >= 0 && (
          <WorkSheet
            sheet={estimate.sheets[activeSheetIndex]}
            m2={estimate.m2}
            margin={getSheetMargin(activeSheetIndex)}
            onItemChange={(itemIdx, field, value) =>
              updateItem(activeSheetIndex, itemIdx, field, value)
            }
            onSheetChange={(field, value) =>
              updateSheet(activeSheetIndex, field, value)
            }
            onAddItem={(item) => addItem(activeSheetIndex, item)}
          />
        )}

        {activeTab === 'urethane' && activeSheetIndex >= 0 && (
          <WorkSheet
            sheet={estimate.sheets[activeSheetIndex]}
            m2={estimate.m2}
            margin={getSheetMargin(activeSheetIndex)}
            onItemChange={(itemIdx, field, value) =>
              updateItem(activeSheetIndex, itemIdx, field, value)
            }
            onSheetChange={(field, value) =>
              updateSheet(activeSheetIndex, field, value)
            }
            onAddItem={(item) => addItem(activeSheetIndex, item)}
          />
        )}

        {activeTab === 'compare' && (
          <CompareSheet sheets={estimate.sheets} m2={estimate.m2} />
        )}
      </main>

      {/* 이메일 모달 */}
      <EmailModal
        open={emailOpen}
        onSend={handleEmail}
        onClose={() => setEmailOpen(false)}
        sending={emailSending}
      />

      {/* 음성 바 */}
      <VoiceBar
        status={voice.status}
        seconds={voice.seconds}
        lastText={voice.lastText}
        onToggle={voice.toggleRecording}
        onStop={voice.stopSpeaking}
      />
    </div>
  )
}
