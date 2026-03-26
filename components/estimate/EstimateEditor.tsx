'use client'

import { useState, useCallback } from 'react'
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

interface EstimateEditorProps {
  initialEstimate: Estimate
  priceMatrix: PriceMatrixRaw
}

export default function EstimateEditor({
  initialEstimate,
  priceMatrix,
}: EstimateEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('cover')

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
        ['save', 'undo', 'switch_tab', 'read_summary', 'read_margin', 'compare'].includes(c.action)
      )

      if (sysCmd) {
        switch (sysCmd.action) {
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
    [activeSheetIndex, estimate.sheets, applyVoiceCommands, pushUndo, undo],
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
          <h1 className="text-sm font-bold text-brand">방수명가 견적서</h1>
          {estimate.mgmt_no && (
            <span className="text-xs text-gray-400">{estimate.mgmt_no}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-amber-500">저장 중...</span>
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
          />
        )}

        {activeTab === 'compare' && (
          <CompareSheet sheets={estimate.sheets} m2={estimate.m2} />
        )}
      </main>

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
