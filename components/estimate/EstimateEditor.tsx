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
import BasePriceBar from './BasePriceBar'
import VoiceBarContainer from '@/components/voice/VoiceBarContainer'
import VoiceLogPanel from '@/components/voice/VoiceLogPanel'
import EmailModal from './EmailModal'
import InitialGuide from './InitialGuide'
import SettingsPanel from './SettingsPanel'
import LoadEstimateModal from './LoadEstimateModal'
import VoiceGuidePanel from './VoiceGuidePanel'

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
  const [voiceGuideOpen, setVoiceGuideOpen] = useState(false)

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

  const [menuOpen, setMenuOpen] = useState(false)
  const [loadModalOpen, setLoadModalOpen] = useState(false)

  return (
    <div data-testid="estimate-editor" className="flex min-h-screen flex-col bg-surface pb-20">
      {/* 서브 툴바 (전체 Header 아래에 위치) */}
      <div data-testid="estimate-toolbar" className="sticky top-[49px] z-30 border-b border-ink-faint/20 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 shrink-0">
            {/* 햄버거 메뉴 */}
            <button
              data-testid="estimate-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
              aria-label="메뉴"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {estimate.mgmt_no && (
              <span className="text-xs font-semibold text-ink-secondary">{estimate.mgmt_no}</span>
            )}
            {isDirty && <span className="ml-1 h-2 w-2 rounded-full bg-accent animate-pulse" title="변경됨" />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !estimate.id}
              className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-40 transition-colors"
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
          </div>
        </div>
      </div>

      {/* 햄버거 사이드 패널 */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div data-testid="estimate-menu-panel" className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-white shadow-elevated flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-bold text-ink">견적서 메뉴</span>
              <button onClick={() => setMenuOpen(false)} className="rounded p-1 text-ink-muted hover:bg-surface-muted">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <button onClick={() => { setLoadModalOpen(true); setMenuOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
                <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                불러오기
              </button>
              <button onClick={() => { handleSave(); setMenuOpen(false) }} disabled={saving || !estimate.id} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted disabled:opacity-40">
                <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => { handleDownload(); setMenuOpen(false) }} disabled={downloading || !estimate.id} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted disabled:opacity-40">
                <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                엑셀 다운로드
              </button>
              <button onClick={() => { handlePdfDownload(); setMenuOpen(false) }} disabled={pdfDownloading || !estimate.id} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted disabled:opacity-40">
                <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                PDF 다운로드
              </button>
              <button onClick={() => { setEmailOpen(true); setMenuOpen(false) }} disabled={!estimate.id} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted disabled:opacity-40">
                <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                이메일 발송
              </button>
              <button onClick={() => { const params = new URLSearchParams(); if (estimate.site_name) params.set('address', estimate.site_name); if (estimate.manager_name) params.set('manager', estimate.manager_name); router.push(`/proposal${params.toString() ? '?' + params.toString() : ''}`); setMenuOpen(false) }} disabled={!estimate.id} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted disabled:opacity-40">
                <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                제안서 작성
              </button>
              <hr className="my-2 border-surface-muted" />
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">시트 관리</p>
              {!hasComplex && <button onClick={() => { addSheet('복합'); setActiveTab('complex-detail'); setMenuOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-surface-muted">+ 복합 시트</button>}
              {!hasUrethane && <button onClick={() => { addSheet('우레탄'); setActiveTab('urethane-detail'); setMenuOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-purple-600 hover:bg-surface-muted">+ 우레탄 시트</button>}
              {activeSheetIndex >= 0 && (
                <button onClick={() => { const type = estimate.sheets[activeSheetIndex]?.type; if (window.confirm(`${type} 시트를 삭제하시겠습니까?`)) { removeSheet(activeSheetIndex); setActiveTab('compare') } setMenuOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-surface-muted">현재 시트 삭제</button>
              )}
              <hr className="my-2 border-surface-muted" />
              <button onClick={() => { setVoiceGuideOpen(true); setMenuOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
                <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                음성 가이드
              </button>
              <button onClick={() => { setSettingsOpen(true); setMenuOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
                <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                설정
              </button>
            </div>
          </div>
        </>
      )}

      {/* 탭 */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} hasComplex={hasComplex} hasUrethane={hasUrethane} />

      {/* 평단가 현황 바 — detail 탭에서만 */}
      {(activeTab === 'complex-detail' || activeTab === 'urethane-detail') && activeSheetIndex >= 0 && (
        <div className="mx-auto w-full max-w-5xl px-3 pt-2 flex justify-end">
          <BasePriceBar sheet={estimate.sheets[activeSheetIndex]} />
        </div>
      )}

      {/* 콘텐츠 */}
      <main className="flex-1 px-3 py-4 mx-auto w-full max-w-5xl">
        {/* 시트 없을 때 — 음성 가이드 안내 */}
        {!hasComplex && !hasUrethane && (
          <InitialGuide onCreateSheets={() => { addSheet('복합'); addSheet('우레탄'); setActiveTab('complex-detail') }} onMicClick={voice.toggleRecording} interimPreview={bufferHint} isRecording={voice.status === 'recording'} />
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
      <LoadEstimateModal isOpen={loadModalOpen} onClose={() => setLoadModalOpen(false)} />
      <VoiceGuidePanel open={voiceGuideOpen} onClose={() => setVoiceGuideOpen(false)} />
    </div>
  )
}
