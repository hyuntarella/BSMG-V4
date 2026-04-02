'use client'

import { useState, useCallback } from 'react'
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
import VoiceBarContainer from '@/components/voice/VoiceBarContainer'
import VoiceLogPanel from '@/components/voice/VoiceLogPanel'
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

  const handleSave = useCallback(async () => {
    if (!estimate.id || saving) return
    setSaving(true)
    try {
      await fetch(`/api/estimates/${estimate.id}/generate`, { method: 'POST' })
    } catch {
      console.error('저장 실패')
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
    } catch {
      console.error('이메일 발송 실패')
    } finally { setEmailSending(false) }
  }, [estimate.id])

  const { voice, voiceLogs, updateLogFeedback, submitCorrection, getCellHighlightLevel, realtimeHighlight, bufferHint, mode, setMode, handleTextInput, handleTextSubmit, handleTextCancel, handleMultilineSubmit, commandHistory } = useEstimateVoice({
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

  const hasComplex = estimate.sheets.some((s) => s.type === '복합')
  const hasUrethane = estimate.sheets.some((s) => s.type === '우레탄')

  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-surface pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-brand-800/20 bg-brand-900 px-3 py-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <a href="/estimates" className="p-1 text-brand-300 hover:text-white transition-colors">&larr;</a>
            <h1 className="text-sm font-bold text-white">방수명가 견적서</h1>
            {estimate.mgmt_no && (
              <span className="hidden sm:inline text-xs text-brand-300">{estimate.mgmt_no}</span>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-md p-1.5 text-brand-300 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="설정"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            {isDirty && <span className="ml-1 h-2 w-2 rounded-full bg-accent animate-pulse" title="변경됨" />}
          </div>
          <div className="flex items-center gap-2">
            {/* 주요 액션 */}
            <button
              onClick={handleSave}
              disabled={saving || !estimate.id}
              className="rounded-lg bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/25 disabled:opacity-40 transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading || !estimate.id}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-40 transition-colors"
            >
              {downloading ? '생성 중...' : '엑셀'}
            </button>

            {/* 시트 추가 버튼 — 시트 없을 때 직접 노출 */}
            {!hasComplex && <button onClick={() => { addSheet('복합'); setActiveTab('complex-detail') }} className="rounded-lg bg-blue-500/20 px-2.5 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/30 transition-colors">+ 복합</button>}
            {!hasUrethane && <button onClick={() => { addSheet('우레탄'); setActiveTab('urethane-detail') }} className="rounded-lg bg-purple-500/20 px-2.5 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/30 transition-colors">+ 우레탄</button>}

            {/* 더보기 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-300 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="더보기"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl bg-white py-1 shadow-elevated">
                    <button
                      onClick={() => { handlePdfDownload(); setMoreOpen(false) }}
                      disabled={pdfDownloading || !estimate.id}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-surface-muted disabled:opacity-40"
                    >
                      <span className="text-brand">PDF</span> {pdfDownloading ? '생성 중...' : 'PDF 다운로드'}
                    </button>
                    <button
                      onClick={() => { setEmailOpen(true); setMoreOpen(false) }}
                      disabled={!estimate.id}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-surface-muted disabled:opacity-40"
                    >
                      이메일 발송
                    </button>
                    <button
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (estimate.site_name) params.set('address', estimate.site_name);
                        if (estimate.manager_name) params.set('manager', estimate.manager_name);
                        router.push(`/proposal${params.toString() ? '?' + params.toString() : ''}`);
                        setMoreOpen(false)
                      }}
                      disabled={!estimate.id}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-surface-muted disabled:opacity-40"
                    >
                      제안서 작성
                    </button>
                    <hr className="my-1 border-surface-muted" />
                    {!hasComplex && <button onClick={() => { addSheet('복합'); setActiveTab('complex-detail'); setMoreOpen(false) }} className="flex w-full px-3 py-2 text-xs text-blue-600 hover:bg-surface-muted">+ 복합 시트</button>}
                    {!hasUrethane && <button onClick={() => { addSheet('우레탄'); setActiveTab('urethane-detail'); setMoreOpen(false) }} className="flex w-full px-3 py-2 text-xs text-purple-600 hover:bg-surface-muted">+ 우레탄 시트</button>}
                    {activeSheetIndex >= 0 && (
                      <button
                        onClick={() => {
                          const type = estimate.sheets[activeSheetIndex]?.type
                          if (window.confirm(`${type} 시트를 삭제하시겠습니까?`)) {
                            removeSheet(activeSheetIndex)
                            setActiveTab('compare')
                          }
                          setMoreOpen(false)
                        }}
                        className="flex w-full px-3 py-2 text-xs text-red-500 hover:bg-surface-muted"
                      >시트 삭제</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} hasComplex={hasComplex} hasUrethane={hasUrethane} />

      {/* 콘텐츠 */}
      <main className="flex-1 px-3 py-4 mx-auto w-full max-w-5xl">
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
            getCellHighlightLevel={getCellHighlightLevel}
            sheetIndex={activeSheetIndex}
            realtimeHighlight={realtimeHighlight}
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
      <VoiceLogPanel
        logs={voiceLogs}
        onFeedback={updateLogFeedback}
        onCorrection={submitCorrection}
      />
      <VoiceBarContainer
        mode={mode}
        onModeChange={setMode}
        status={voice.status}
        seconds={voice.seconds}
        lastText={voice.lastText}
        interimText={voice.interimText}
        audioLevel={voice.audioLevel}
        processingCount={voice.processingCount}
        bufferHint={bufferHint}
        onToggle={voice.toggleRecording}
        onTextInputChange={handleTextInput}
        onTextSubmit={handleTextSubmit}
        onTextCancel={handleTextCancel}
        onMultilineSubmit={handleMultilineSubmit}
        commandHistory={commandHistory}
      />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
