'use client'

import { useState, useCallback, useRef } from 'react'
import type { Estimate, PriceMatrixRaw } from '@/lib/estimate/types'
import { useEstimate } from '@/hooks/useEstimate'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useEstimateVoice } from '@/hooks/useEstimateVoice'
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
    applyVoiceCommands,
    addSheet,
    getSheetMargin,
    pushUndo,
    undo,
  } = useEstimate(initialEstimate, priceMatrix)

  // 자동 저장
  useAutoSave({ estimate, isDirty, onSaved: markClean, enabled: !!estimate.id })

  // 활성 시트 인덱스
  const activeSheetIndex =
    activeTab === 'complex'
      ? estimate.sheets.findIndex((s) => s.type === '복합')
      : activeTab === 'urethane'
        ? estimate.sheets.findIndex((s) => s.type === '우레탄')
        : -1

  // playTts ref — 저장/이메일 핸들러에서 voice보다 먼저 선언되어야 하므로 ref 사용
  const playTtsRef = useRef<(text: string) => Promise<void>>(async () => {})

  // ── 저장 ──
  const handleSave = useCallback(async () => {
    if (!estimate.id || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/generate`, { method: 'POST' })
      const data = await res.json()
      await playTtsRef.current(data.success ? `저장 완료. 관리번호 ${estimate.mgmt_no ?? ''}.` : '저장에 실패했습니다.')
    } catch {
      await playTtsRef.current('저장 중 오류가 발생했습니다.')
    } finally { setSaving(false) }
  }, [estimate.id, estimate.mgmt_no, saving])

  // ── 이메일 발송 ──
  const handleEmail = useCallback(async (to: string) => {
    if (!estimate.id) return
    setEmailSending(true)
    try {
      await fetch(`/api/estimates/${estimate.id}/generate`, { method: 'POST' })
      const res = await fetch(`/api/estimates/${estimate.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      })
      const data = await res.json()
      setEmailOpen(false)
      await playTtsRef.current(data.success ? `${to}으로 발송 완료.` : '이메일 발송에 실패했습니다.')
    } catch {
      await playTtsRef.current('이메일 발송 중 오류가 발생했습니다.')
    } finally { setEmailSending(false) }
  }, [estimate.id])

  // ── 음성 훅 ──
  const { voice } = useEstimateVoice({
    estimate,
    activeSheetIndex,
    setActiveTab,
    applyVoiceCommands,
    updateMeta,
    addSheet,
    pushUndo,
    undo,
    onSave: handleSave,
    onEmailOpen: () => setEmailOpen(true),
  })

  // playTts ref 동기화
  playTtsRef.current = voice.playTts

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
          {isDirty && <span className="text-xs text-amber-500">변경됨</span>}
          {!hasComplex && (
            <button
              onClick={() => { addSheet('복합'); setActiveTab('complex') }}
              className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
            >+ 복합</button>
          )}
          {!hasUrethane && (
            <button
              onClick={() => { addSheet('우레탄'); setActiveTab('urethane') }}
              className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:bg-purple-200"
            >+ 우레탄</button>
          )}
        </div>
      </header>

      {/* 탭 */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} hasComplex={hasComplex} hasUrethane={hasUrethane} />

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
            onItemChange={(i, f, v) => updateItem(activeSheetIndex, i, f, v)}
            onSheetChange={(f, v) => updateSheet(activeSheetIndex, f, v)}
          />
        )}
        {activeTab === 'urethane' && activeSheetIndex >= 0 && (
          <WorkSheet
            sheet={estimate.sheets[activeSheetIndex]}
            m2={estimate.m2}
            margin={getSheetMargin(activeSheetIndex)}
            onItemChange={(i, f, v) => updateItem(activeSheetIndex, i, f, v)}
            onSheetChange={(f, v) => updateSheet(activeSheetIndex, f, v)}
          />
        )}
        {activeTab === 'compare' && (
          <CompareSheet sheets={estimate.sheets} m2={estimate.m2} />
        )}
      </main>

      {/* 이메일 모달 */}
      <EmailModal open={emailOpen} onSend={handleEmail} onClose={() => setEmailOpen(false)} sending={emailSending} />

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
