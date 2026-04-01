'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import SettingsPanel from './SettingsPanel'

interface EstimateEditorProps {
  initialEstimate: Estimate
  priceMatrix: PriceMatrixRaw
}

export default function EstimateEditor({
  initialEstimate,
  priceMatrix,
}: EstimateEditorProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('complex-cover')
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const {
    estimate,
    isDirty,
    markClean,
    updateMeta,
    updateSheet,
    updateSheetPpp,
    updateItem,
    updateItemText,
    addItem,
    removeItem,
    removeSheet,
    moveItem,
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

  const handlePdfDownload = useCallback(async () => {
    if (!estimate.id || pdfDownloading) return
    setPdfDownloading(true)
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/pdf`, { method: 'POST' })
      if (!res.ok) throw new Error('PDF 생성 실패')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `견적서_${estimate.mgmt_no ?? estimate.id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF 다운로드 실패:', err)
    } finally { setPdfDownloading(false) }
  }, [estimate.id, estimate.mgmt_no, pdfDownloading])

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
      <header className="sticky top-0 z-40 border-b bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <a href="/estimates" className="p-1 text-gray-400 hover:text-gray-600">&larr;</a>
            <h1 className="text-sm font-bold text-brand">방수명가 견적서</h1>
            {estimate.mgmt_no && (
              <span className="hidden sm:inline text-xs text-gray-400">{estimate.mgmt_no}</span>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="설정"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving || !estimate.id}
              className="rounded bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading || !estimate.id}
              className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {downloading ? '생성 중...' : '엑셀'}
            </button>
            <button
              onClick={handlePdfDownload}
              disabled={pdfDownloading || !estimate.id}
              className="rounded border border-brand px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-red-50 disabled:opacity-50"
            >
              {pdfDownloading ? '생성 중...' : 'PDF'}
            </button>
            <button
              onClick={() => setEmailOpen(true)}
              disabled={!estimate.id}
              className="rounded border border-brand px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-red-50 disabled:opacity-50"
            >
              이메일
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (estimate.site_name) params.set('address', estimate.site_name);
                if (estimate.manager_name) params.set('manager', estimate.manager_name);
                router.push(`/proposal${params.toString() ? '?' + params.toString() : ''}`);
              }}
              disabled={!estimate.id}
              className="rounded border border-green-600 px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50"
            >
              제안서
            </button>
            {isDirty && <span className="text-xs text-amber-500">변경됨</span>}
            {!hasComplex && <button onClick={() => { addSheet('복합'); setActiveTab('complex-detail') }} className="rounded bg-blue-100 px-2.5 py-1.5 text-xs text-blue-700 hover:bg-blue-200">+ 복합</button>}
            {!hasUrethane && <button onClick={() => { addSheet('우레탄'); setActiveTab('urethane-detail') }} className="rounded bg-purple-100 px-2.5 py-1.5 text-xs text-purple-700 hover:bg-purple-200">+ 우레탄</button>}
            {activeSheetIndex >= 0 && (
              <button
                onClick={() => {
                  const type = estimate.sheets[activeSheetIndex]?.type
                  if (window.confirm(`${type} 시트를 삭제하시겠습니까?`)) {
                    removeSheet(activeSheetIndex)
                    setActiveTab('compare')
                  }
                }}
                className="rounded border border-red-300 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
              >시트 삭제</button>
            )}
          </div>
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
            wallM2={estimate.wall_m2}
            margin={getSheetMargin(activeSheetIndex)}
            onItemChange={(i, f, v) => updateItem(activeSheetIndex, i, f, v)}
            onItemTextChange={(i, f, v) => updateItemText(activeSheetIndex, i, f, v)}
            onSheetChange={(f, v) => updateSheet(activeSheetIndex, f, v)}
            onPppChange={(ppp, rebuild) => updateSheetPpp(activeSheetIndex, ppp, rebuild)}
            onMetaChange={(field, value) => updateMeta(field, value)}
            onAddItem={(item) => addItem(activeSheetIndex, item)}
            onRemoveItem={(idx) => removeItem(activeSheetIndex, idx)}
            onMoveItem={(from, to) => moveItem(activeSheetIndex, from, to)}
          />
        )}
        {activeTab === 'compare' && (
          <CompareSheet sheets={estimate.sheets} m2={estimate.m2} />
        )}
      </main>

      <EmailModal open={emailOpen} onSend={handleEmail} onClose={() => setEmailOpen(false)} sending={emailSending} />
      <VoiceBar status={voice.status} seconds={voice.seconds} lastText={voice.lastText} onToggle={voice.toggleRecording} onStop={voice.stopSpeaking} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
