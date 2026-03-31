'use client'

import { useState, useCallback, useRef } from 'react'
import type { Estimate, PriceMatrixRaw } from '@/lib/estimate/types'
import { useEstimate } from '@/hooks/useEstimate'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useEstimateVoice } from '@/hooks/useEstimateVoice'
import { downloadBlobResponse } from '@/lib/utils/downloadBlob'
import TabBar, { type TabId } from './TabBar'
import CoverSheet from './CoverSheet'
import WorkSheet from './WorkSheet'
import CompareSheet from './CompareSheet'
import VoiceBar from '@/components/voice/VoiceBar'
import EmailModal from './EmailModal'
import InitialGuide from './InitialGuide'

interface EstimateEditorProps {
  initialEstimate: Estimate
  priceMatrix: PriceMatrixRaw
}

export default function EstimateEditor({
  initialEstimate,
  priceMatrix,
}: EstimateEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('complex-cover')
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
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
    initFromVoiceFlow,
    getSheetMargin,
    saveSnapshot,
    undo,
  } = useEstimate(initialEstimate, priceMatrix)

  useAutoSave({ estimate, isDirty, onSaved: markClean, enabled: !!estimate.id })

  const activeSheetIndex =
    activeTab === 'complex-cover' || activeTab === 'complex-detail'
      ? estimate.sheets.findIndex((s) => s.type === '복합')
      : activeTab === 'urethane-cover' || activeTab === 'urethane-detail'
        ? estimate.sheets.findIndex((s) => s.type === '우레탄')
        : -1

  const playTtsRef = useRef<(text: string) => Promise<void>>(async () => {})

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

  const handleDownload = useCallback(async () => {
    if (!estimate.id || downloading) return
    setDownloading(true)
    try {
      const filename = `견적서_${estimate.mgmt_no ?? estimate.id.slice(0, 8)}.xlsx`
      const res = await fetch(`/api/estimates/${estimate.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ download: true }),
      })
      await downloadBlobResponse(res, filename)
    } catch (err) { console.error('다운로드 실패:', err) }
    finally { setDownloading(false) }
  }, [estimate.id, estimate.mgmt_no, downloading])

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

  const { voice } = useEstimateVoice({
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
    onSave: handleSave,
    onEmailOpen: () => setEmailOpen(true),
  })

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
            onClick={handleDownload}
            disabled={downloading || !estimate.id}
            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {downloading ? '생성 중...' : '엑셀'}
          </button>
          <button
            onClick={() => setEmailOpen(true)}
            disabled={!estimate.id}
            className="rounded border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-red-50 disabled:opacity-50"
          >
            이메일
          </button>
          {isDirty && <span className="text-xs text-amber-500">변경됨</span>}
          {!hasComplex && <button onClick={() => { addSheet('복합'); setActiveTab('complex-detail') }} className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200">+ 복합</button>}
          {!hasUrethane && <button onClick={() => { addSheet('우레탄'); setActiveTab('urethane-detail') }} className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:bg-purple-200">+ 우레탄</button>}
        </div>
      </header>

      {/* 탭 */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} hasComplex={hasComplex} hasUrethane={hasUrethane} />

      {/* 콘텐츠 */}
      <main className="flex-1 px-3 py-3">
        {/* 시트 없을 때 — 음성 가이드 안내 */}
        {!hasComplex && !hasUrethane && (
          <InitialGuide onCreateSheets={() => { addSheet('복합'); addSheet('우레탄'); setActiveTab('complex-detail') }} />
        )}

        {(activeTab === 'complex-cover' || activeTab === 'urethane-cover') && activeSheetIndex >= 0 && (
          <CoverSheet estimate={estimate} sheet={estimate.sheets[activeSheetIndex]} onUpdate={updateMeta} />
        )}
        {(activeTab === 'complex-detail' || activeTab === 'urethane-detail') && activeSheetIndex >= 0 && (
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

      <EmailModal open={emailOpen} onSend={handleEmail} onClose={() => setEmailOpen(false)} sending={emailSending} />
      <VoiceBar status={voice.status} seconds={voice.seconds} lastText={voice.lastText} onToggle={voice.toggleRecording} onStop={voice.stopSpeaking} />
    </div>
  )
}
