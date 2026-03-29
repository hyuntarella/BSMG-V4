'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Estimate, PriceMatrixRaw } from '@/lib/estimate/types'
import type { VoiceCommand } from '@/lib/voice/commands'
import { useEstimate } from '@/hooks/useEstimate'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useVoice } from '@/hooks/useVoice'
import { useVoiceFlow } from '@/hooks/useVoiceFlow'
import { useWakeWord } from '@/hooks/useWakeWord'
import { findPriceForMargin } from '@/lib/estimate/costBreakdown'
// jsonIO는 저장 시 내부적으로만 사용 (헤더 버튼 제거됨)
import TabBar, { type TabId } from './TabBar'
import CoverSheet from './CoverSheet'
import WorkSheet from './WorkSheet'
import CompareSheet from './CompareSheet'
import VoiceBar from '@/components/voice/VoiceBar'
import EmailModal from './EmailModal'
import ChangeLogPanel from './ChangeLogPanel'
import ContractRefPanel from './ContractRefPanel'
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
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [showChangeLog, setShowChangeLog] = useState(false)
  const [showContractRef, setShowContractRef] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [voiceLogs, setVoiceLogs] = useState<{ type: 'user' | 'assistant'; text: string }[]>([])

  const {
    estimate, isDirty, markClean, updateMeta, updateSheet, updateItem,
    applyVoiceCommands, addSheet, getSheetMargin, undo,
    snapshots, restoreTo, modifiedCells,
  } = useEstimate(initialEstimate, priceMatrix)

  useAutoSave({ estimate, isDirty, onSaved: markClean, enabled: !!estimate.id })

  const activeSheetIndex =
    activeTab === 'complex-cover' || activeTab === 'complex-detail'
      ? estimate.sheets.findIndex(s => s.type === '복합')
      : activeTab === 'urethane-cover' || activeTab === 'urethane-detail'
        ? estimate.sheets.findIndex(s => s.type === '우레탄')
        : -1

  const addLog = useCallback((type: 'user' | 'assistant', text: string) => {
    setVoiceLogs(prev => [...prev.slice(-19), { type, text }])
  }, [])

  // ── 저장 ──
  const handleSave = useCallback(async () => {
    if (!estimate.id || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/generate`, { method: 'POST' })
      const data = await res.json()
      const msg = data.success ? `저장 완료. 관리번호 ${estimate.mgmt_no ?? ''}.` : '저장 실패.'
      addLog('assistant', msg)
      voice.playTts(msg)
    } catch {
      addLog('assistant', '저장 오류')
    } finally { setSaving(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.id, estimate.mgmt_no, saving, addLog])

  // ── 이메일 ──
  const handleEmail = useCallback(async (to: string) => {
    if (!estimate.id) return
    setEmailSending(true)
    try {
      await fetch(`/api/estimates/${estimate.id}/generate`, { method: 'POST' })
      const res = await fetch(`/api/estimates/${estimate.id}/email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      })
      const data = await res.json()
      setEmailOpen(false)
      const msg = data.success ? `${to} 발송 완료.` : '발송 실패.'
      addLog('assistant', msg)
      voice.playTts(msg)
    } catch { addLog('assistant', '발송 오류') }
    finally { setEmailSending(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.id, addLog])

  // ── 음성 모드 ──
  const voiceMode = estimate.sheets.length === 0 ? 'extract' as const : 'modify' as const

  const estimateContext = JSON.stringify({
    m2: estimate.m2,
    sheets: estimate.sheets.map(s => ({
      type: s.type, grand_total: s.grand_total,
      items: s.items.map(it => ({ name: it.name, qty: it.qty, mat: it.mat, labor: it.labor, exp: it.exp, total: it.total })),
    })),
  })

  // ── 음성 명령 처리 ──
  const handleVoiceCommands = useCallback(
    (commands: VoiceCommand[]) => {
      const sysCmd = commands.find(c =>
        ['save', 'email', 'load', 'undo', 'switch_tab', 'read_summary', 'read_margin', 'compare', 'set_margin', 'restore_to'].includes(c.action)
      )
      if (sysCmd) {
        switch (sysCmd.action) {
          case 'save': handleSave(); return
          case 'email': setEmailOpen(true); return
          case 'undo': undo(); addLog('assistant', '되돌림.'); return
          case 'compare': setActiveTab('compare'); return
          case 'set_margin': {
            const pct = sysCmd.marginPercent ?? 50
            const newPpp = findPriceForMargin(pct, estimate.m2 / 3.306)
            if (newPpp > 0 && activeSheetIndex >= 0) {
              updateSheet(activeSheetIndex, 'price_per_pyeong', newPpp)
              const msg = `마진 ${pct}%. 평단가 ${newPpp.toLocaleString()}원 적용.`
              addLog('assistant', msg)
              voice.playTts(msg)
            }
            return
          }
          case 'restore_to': {
            const idx = sysCmd.snapshotIndex ?? (snapshots.length - 1)
            if (idx >= 0 && idx < snapshots.length) {
              restoreTo(idx)
              addLog('assistant', `${idx + 1}번째 시점 복원.`)
            }
            return
          }
          case 'switch_tab': {
            const tab = sysCmd.tab ?? sysCmd.target
            if (tab === 'complex' || tab === '복합') setActiveTab('complex-detail')
            else if (tab === 'urethane' || tab === '우레탄') setActiveTab('urethane-detail')
            else if (tab === 'compare' || tab === '비교') setActiveTab('compare')
            return
          }
          case 'load': {
            fetch(`/api/estimates/search?q=${sysCmd.query ?? ''}`)
              .then(r => r.json())
              .then(data => {
                if (data.estimates?.length > 0) router.push(`/estimate/${data.estimates[0].id}`)
                else { addLog('assistant', '못 찾음.'); voice.playTts('해당 견적서를 찾을 수 없습니다.') }
              })
            return
          }
        }
      }
      const targetSheet = activeSheetIndex >= 0 ? activeSheetIndex : 0
      if (estimate.sheets[targetSheet]) applyVoiceCommands(commands, targetSheet)
    },
    [activeSheetIndex, estimate, applyVoiceCommands, undo, handleSave, router, snapshots, restoreTo, updateSheet, addLog],
  )

  // ── useVoiceFlow를 먼저 선언 (voiceFlow.isActive를 useVoice에서 참조) ──
  const voiceFlowRef = useRef<{ processText: (text: string) => void; isActive: boolean }>({
    processText: () => {},
    isActive: false,
  })

  // ── useVoice ──
  const voice = useVoice({
    mode: voiceMode,
    estimateContext,
    skipLlm: voiceFlowRef.current.isActive,
    onCommands: handleVoiceCommands,
    onTtsText: (text) => addLog('assistant', text),
    onSttText: (text) => {
      // voiceFlow 활성 중이면 STT 결과를 voiceFlow에 전달
      if (voiceFlowRef.current.isActive) {
        voiceFlowRef.current.processText(text)
      } else {
        addLog('user', text)
      }
    },
    onParsed: (parsed) => {
      if (parsed.area) updateMeta('m2', parsed.area as number)
      const method = parsed.method as string | null
      if (method || parsed.area) {
        if (!estimate.sheets.some(s => s.type === '복합')) addSheet('복합')
        if (!estimate.sheets.some(s => s.type === '우레탄')) addSheet('우레탄')
        setActiveTab('complex-detail')
      }
    },
  })

  // ── useVoiceFlow (가이드 수집 모드) ──
  const voiceFlow = useVoiceFlow({
    startRecording: voice.startRecording,
    stopRecording: voice.stopRecording,
    playTts: voice.playTts,
    addLog,
    onComplete: (state) => {
      if (state.area) updateMeta('m2', state.area)
      if (state.wallM2) updateMeta('wall_m2', state.wallM2)
      if (!estimate.sheets.some(s => s.type === '복합')) addSheet('복합')
      if (!estimate.sheets.some(s => s.type === '우레탄')) addSheet('우레탄')
      // 평단가 적용
      const cIdx = estimate.sheets.findIndex(s => s.type === '복합')
      const uIdx = estimate.sheets.findIndex(s => s.type === '우레탄')
      if (state.complexPpp && cIdx >= 0) updateSheet(cIdx, 'price_per_pyeong', state.complexPpp)
      if (state.urethanePpp && uIdx >= 0) updateSheet(uIdx, 'price_per_pyeong', state.urethanePpp)
      setActiveTab('complex-detail')
    },
  })

  // voiceFlowRef 동기화
  voiceFlowRef.current = { processText: voiceFlow.processText, isActive: voiceFlow.isActive }

  // ── 웨이크워드 "견적" ──
  useWakeWord({
    onToggle: voice.toggleRecording,
    onWakeWord: () => {
      if (estimate.sheets.length === 0) {
        voiceFlow.startFlow()
      } else {
        voice.startRecording()
      }
    },
    enabled: voice.status === 'idle',
  })

  const hasComplex = estimate.sheets.some(s => s.type === '복합')
  const hasUrethane = estimate.sheets.some(s => s.type === '우레탄')
  const activeSheet = activeSheetIndex >= 0 ? estimate.sheets[activeSheetIndex] : null

  return (
    <div className="flex min-h-screen flex-col bg-bg pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <a href="/estimates" className="text-gray-400 hover:text-gray-600">&larr;</a>
          <h1 className="text-sm font-bold text-brand">방수명가 견적서</h1>
          {estimate.mgmt_no && <span className="text-xs text-gray-400">{estimate.mgmt_no}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleSave} disabled={saving} className="rounded bg-brand px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
            {saving ? '저장중' : '저장'}
          </button>
          <button onClick={() => setEmailOpen(true)} className="rounded border border-brand px-2.5 py-1 text-xs text-brand">이메일</button>
          <button onClick={() => window.open('/proposal.html', '_blank')} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">제안서</button>
          {snapshots.length > 0 && (
            <button onClick={() => setShowChangeLog(!showChangeLog)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">
              이력 {snapshots.length}
            </button>
          )}
          <button onClick={() => setShowContractRef(true)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">계약참조</button>
          <button onClick={() => setShowSettings(true)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">설정</button>
        </div>
      </header>

      {/* 이력 패널 */}
      {showChangeLog && (
        <div className="border-b bg-white shadow-sm">
          <ChangeLogPanel snapshots={snapshots} onRestore={restoreTo} onClose={() => setShowChangeLog(false)} />
        </div>
      )}

      {/* 탭 */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} hasComplex={hasComplex} hasUrethane={hasUrethane} />

      {/* 콘텐츠 */}
      <main className="flex-1 px-2 py-3">
        {/* 시트 없을 때 — 음성 가이드 안내 */}
        {!hasComplex && !hasUrethane && (
          <div className="mx-auto max-w-md space-y-4 py-8">
            <h2 className="text-center text-lg font-bold text-gray-800">견적서 작성</h2>

            {/* 수집 항목 안내 */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">음성으로 다음 정보를 순서대로 수집합니다:</p>
              <div className="space-y-2">
                {[
                  { num: '1', label: '면적', example: '"150헤베" 또는 "50평"' },
                  { num: '2', label: '벽체 면적', example: '"벽체 30미터" 또는 "없어"' },
                  { num: '3', label: '복합 평단가', example: '"3만5천" 또는 "마진 50%에 맞춰줘"' },
                  { num: '4', label: '우레탄 평단가', example: '"3만" 또는 마진 기반' },
                ].map(item => (
                  <div key={item.num} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{item.num}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.example}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 녹음 가이드 */}
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="mb-2 text-xs font-semibold text-blue-700">음성 조작 방법</p>
              <div className="space-y-1 text-xs text-blue-600">
                <p><span className="font-bold">"견적"</span> — 녹음 시작 (웨이크워드)</p>
                <p><span className="font-bold">"됐어" / "넘겨"</span> — 마디 종료, 다음 항목</p>
                <p><span className="font-bold">"그만"</span> — 녹음 취소</p>
                <p><span className="font-bold">Space / 볼륨 버튼</span> — 수동 녹음 토글</p>
              </div>
            </div>

            {/* 수동 생성 버튼 */}
            <button
              onClick={() => { addSheet('복합'); addSheet('우레탄'); setActiveTab('complex-detail') }}
              className="w-full rounded-lg bg-brand py-3 text-sm font-bold text-white"
            >
              복합+우레탄 바로 생성
            </button>

            {/* 음성 플로우 상태 */}
            {voiceFlow.isActive && (
              <div className="rounded-lg border-2 border-brand/30 bg-brand/5 p-3 text-center">
                <p className="text-sm font-semibold text-brand">음성 수집 중...</p>
                <p className="text-xs text-gray-600">{voiceFlow.flowState.step}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'complex-cover' && activeSheet && (
          <CoverSheet estimate={estimate} sheet={activeSheet} onUpdate={updateMeta} />
        )}
        {activeTab === 'complex-detail' && activeSheet && (
          <WorkSheet sheet={activeSheet} m2={estimate.m2} margin={getSheetMargin(activeSheetIndex)}
            modifiedCells={modifiedCells}
            onItemChange={(i, f, v) => updateItem(activeSheetIndex, i, f, v)}
            onSheetChange={(f, v) => updateSheet(activeSheetIndex, f, v)} />
        )}
        {activeTab === 'urethane-cover' && activeSheet && (
          <CoverSheet estimate={estimate} sheet={activeSheet} onUpdate={updateMeta} />
        )}
        {activeTab === 'urethane-detail' && activeSheet && (
          <WorkSheet sheet={activeSheet} m2={estimate.m2} margin={getSheetMargin(activeSheetIndex)}
            modifiedCells={modifiedCells}
            onItemChange={(i, f, v) => updateItem(activeSheetIndex, i, f, v)}
            onSheetChange={(f, v) => updateSheet(activeSheetIndex, f, v)} />
        )}
        {activeTab === 'compare' && (
          <CompareSheet sheets={estimate.sheets} m2={estimate.m2} />
        )}
      </main>

      {/* 음성 로그 (STT/TTS 내용 표시) */}
      {voiceLogs.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 mx-auto max-w-md px-3">
          <div className="rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur">
            <div className="max-h-24 overflow-y-auto space-y-1">
              {voiceLogs.slice(-5).map((log, i) => (
                <div key={i} className={`rounded px-2 py-1 text-xs ${
                  log.type === 'user' ? 'bg-blue-50 text-blue-800 text-right' : 'bg-gray-50 text-gray-700'
                }`}>
                  <span className="mr-1 font-medium text-gray-400">{log.type === 'user' ? '나' : 'AI'}</span>
                  {log.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 패널들 */}
      <EmailModal open={emailOpen} onSend={handleEmail} onClose={() => setEmailOpen(false)} sending={emailSending} />
      <ContractRefPanel isOpen={showContractRef} onClose={() => setShowContractRef(false)} currentPyeong={estimate.m2 / 3.306} />
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* 음성 바 */}
      <VoiceBar
        status={voice.status}
        seconds={voice.seconds}
        lastText={voice.lastText}
        onToggle={() => {
          if (estimate.sheets.length === 0 && !voiceFlow.isActive) {
            voiceFlow.startFlow()
          } else {
            voice.toggleRecording()
          }
        }}
        onStop={voice.stopSpeaking}
      />
    </div>
  )
}
