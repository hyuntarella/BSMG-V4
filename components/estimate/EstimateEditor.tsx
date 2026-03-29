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
  const [activeTab, setActiveTab] = useState<TabId>('complex-cover')
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

  useAutoSave({
    estimate,
    isDirty,
    onSaved: markClean,
    enabled: !!estimate.id,
  })

  // 활성 시트 인덱스 (탭 기반)
  const activeSheetIndex =
    activeTab === 'complex-cover' || activeTab === 'complex-detail'
      ? estimate.sheets.findIndex(s => s.type === '복합')
      : activeTab === 'urethane-cover' || activeTab === 'urethane-detail'
        ? estimate.sheets.findIndex(s => s.type === '우레탄')
        : -1

  // ── 저장 ──
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

  // ── 이메일 ──
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
      voice.playTts(data.success ? `${to}으로 발송 완료.` : '이메일 발송에 실패했습니다.')
    } catch {
      voice.playTts('이메일 발송 중 오류가 발생했습니다.')
    } finally {
      setEmailSending(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.id])

  // 음성 모드
  const voiceMode = estimate.sheets.length === 0 ? 'extract' as const : 'modify' as const

  const estimateContext = JSON.stringify({
    m2: estimate.m2,
    sheets: estimate.sheets.map(s => ({
      type: s.type,
      grand_total: s.grand_total,
      items: s.items.map(it => ({
        name: it.name, qty: it.qty, mat: it.mat, labor: it.labor, exp: it.exp, total: it.total,
      })),
    })),
  })

  // 음성 명령 처리
  const handleVoiceCommands = useCallback(
    (commands: VoiceCommand[]) => {
      const sysCmd = commands.find(c =>
        ['save', 'email', 'load', 'undo', 'switch_tab', 'read_summary', 'read_margin', 'compare'].includes(c.action)
      )

      if (sysCmd) {
        switch (sysCmd.action) {
          case 'save': handleSave(); return
          case 'email': setEmailOpen(true); return
          case 'undo': undo(); return
          case 'compare': setActiveTab('compare'); return
          case 'switch_tab': {
            const tab = sysCmd.tab ?? sysCmd.target
            if (tab === 'complex' || tab === '복합') setActiveTab('complex-detail')
            else if (tab === 'urethane' || tab === '우레탄') setActiveTab('urethane-detail')
            else if (tab === 'compare' || tab === '비교') setActiveTab('compare')
            return
          }
          case 'load': {
            const query = sysCmd.query ?? sysCmd.target ?? ''
            fetch(`/api/estimates/search?q=${query}`)
              .then(r => r.json())
              .then(data => {
                if (data.estimates?.length > 0) router.push(`/estimate/${data.estimates[0].id}`)
                else voice.playTts('해당 견적서를 찾을 수 없습니다.')
              })
            return
          }
        }
      }

      // 수정 명령
      const targetSheet = activeSheetIndex >= 0 ? activeSheetIndex : 0
      if (estimate.sheets[targetSheet]) {
        pushUndo()
        applyVoiceCommands(commands, targetSheet)
      }
    },
    [activeSheetIndex, estimate.sheets, applyVoiceCommands, pushUndo, undo, handleSave, router],
  )

  const voice = useVoice({
    mode: voiceMode,
    estimateContext,
    onCommands: handleVoiceCommands,
    onParsed: (parsed) => {
      if (parsed.area) updateMeta('m2', parsed.area as number)
      // 항상 복합+우레탄 둘 다 생성
      const method = parsed.method as string | null
      if (method || parsed.area) {
        if (!estimate.sheets.some(s => s.type === '복합')) addSheet('복합')
        if (!estimate.sheets.some(s => s.type === '우레탄')) addSheet('우레탄')
        setActiveTab('complex-detail')
      }
    },
  })

  useWakeWord({ onToggle: voice.toggleRecording, enabled: true })

  const hasComplex = estimate.sheets.some(s => s.type === '복합')
  const hasUrethane = estimate.sheets.some(s => s.type === '우레탄')

  // 활성 시트 가져오기
  const activeSheet = activeSheetIndex >= 0 ? estimate.sheets[activeSheetIndex] : null

  return (
    <div className="flex min-h-screen flex-col bg-bg pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <a href="/estimates" className="text-gray-400 hover:text-gray-600">&larr;</a>
          <h1 className="text-sm font-bold text-brand">방수명가 견적서</h1>
          {estimate.mgmt_no && (
            <span className="text-xs text-gray-400">{estimate.mgmt_no}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            disabled={saving || !estimate.id}
            className="rounded bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? '저장중' : '저장'}
          </button>
          <button
            onClick={() => setEmailOpen(true)}
            disabled={!estimate.id}
            className="rounded border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-red-50 disabled:opacity-50"
          >
            이메일
          </button>
          {isDirty && <span className="text-xs text-amber-500">변경됨</span>}
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
      <main className="flex-1 px-2 py-3">
        {/* 시트 없을 때 */}
        {!hasComplex && !hasUrethane && (
          <div className="flex h-60 flex-col items-center justify-center gap-4 text-gray-400">
            <p className="text-sm">음성으로 면적과 평단가를 말하면 견적서가 자동 생성됩니다</p>
            <p className="text-xs">또는 아래 버튼을 누르세요</p>
            <div className="flex gap-2">
              <button
                onClick={() => { addSheet('복합'); addSheet('우레탄'); setActiveTab('complex-detail') }}
                className="rounded bg-brand px-4 py-2 text-sm font-medium text-white"
              >
                복합+우레탄 생성
              </button>
            </div>
          </div>
        )}

        {/* 복합 표지 */}
        {activeTab === 'complex-cover' && activeSheet && (
          <CoverSheet estimate={estimate} sheet={activeSheet} onUpdate={updateMeta} />
        )}

        {/* 복합 세부내역 */}
        {activeTab === 'complex-detail' && activeSheet && (
          <WorkSheet
            sheet={activeSheet}
            m2={estimate.m2}
            margin={getSheetMargin(activeSheetIndex)}
            onItemChange={(itemIdx, field, value) => updateItem(activeSheetIndex, itemIdx, field, value)}
            onSheetChange={(field, value) => updateSheet(activeSheetIndex, field, value)}
          />
        )}

        {/* 우레탄 표지 */}
        {activeTab === 'urethane-cover' && activeSheet && (
          <CoverSheet estimate={estimate} sheet={activeSheet} onUpdate={updateMeta} />
        )}

        {/* 우레탄 세부내역 */}
        {activeTab === 'urethane-detail' && activeSheet && (
          <WorkSheet
            sheet={activeSheet}
            m2={estimate.m2}
            margin={getSheetMargin(activeSheetIndex)}
            onItemChange={(itemIdx, field, value) => updateItem(activeSheetIndex, itemIdx, field, value)}
            onSheetChange={(field, value) => updateSheet(activeSheetIndex, field, value)}
          />
        )}

        {/* 비교 */}
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
