'use client'

import { useState } from 'react'
import { COST_BREAKPOINTS, LABOR_COST_PER_PUM, MATERIAL_INCREASE_RATE, OVERHEAD_RATE, PROFIT_RATE, DEFAULT_EQUIPMENT_PRICES } from '@/lib/estimate/constants'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState(0)

  if (!isOpen) return null

  const sections = [
    { label: 'P매트릭스', content: <PMatrixSection /> },
    { label: '원가 데이터', content: <CostSection /> },
    { label: '비율', content: <RatesSection /> },
    { label: '장비', content: <EquipmentSection /> },
    { label: '음성', content: <VoiceSection /> },
    { label: '정보', content: <InfoSection /> },
  ]

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b px-3 py-2">
          {sections.map((s, i) => (
            <button key={s.label} onClick={() => setActiveSection(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${activeSection === i ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="p-4">{sections[activeSection].content}</div>
      </div>
    </div>
  )
}

function PMatrixSection() {
  return (
    <div className="text-xs">
      <p className="mb-2 font-semibold">P매트릭스 — 면적대×공법×평단가별 단가</p>
      <p className="text-gray-400">Supabase price_matrix 테이블에서 관리됩니다.</p>
      <p className="mt-2 text-gray-400">향후 인라인 편집 기능 추가 예정.</p>
    </div>
  )
}

function CostSection() {
  return (
    <div className="space-y-3 text-xs">
      <p className="font-semibold">원가 브레이크포인트</p>
      {COST_BREAKPOINTS.map(bp => (
        <div key={bp.pyeong} className="rounded border p-2">
          <p className="font-bold">{bp.pyeong}평</p>
          <div className="mt-1 grid grid-cols-2 gap-1 text-gray-600">
            <span>하도: {bp.hado.toLocaleString()}</span>
            <span>중도: {bp.jungdo15.toLocaleString()}</span>
            <span>상도: {bp.sangdo.toLocaleString()}</span>
            <span>시트: {bp.sheet.toLocaleString()}</span>
            <span>잡비: {bp.misc.toLocaleString()}</span>
            <span>품수: {bp.pum}</span>
          </div>
        </div>
      ))}
      <div className="flex justify-between border-t pt-2">
        <span className="text-gray-500">1품 단가</span>
        <span className="font-medium">{LABOR_COST_PER_PUM.toLocaleString()}원</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">재료비 인상률</span>
        <span className="font-medium">{MATERIAL_INCREASE_RATE * 100}%</span>
      </div>
    </div>
  )
}

function RatesSection() {
  return (
    <div className="space-y-2 text-xs">
      <Row label="공과잡비" value={`${OVERHEAD_RATE * 100}%`} />
      <Row label="기업이윤" value={`${PROFIT_RATE * 100}%`} />
      <Row label="절사 단위" value="100,000원" />
    </div>
  )
}

function EquipmentSection() {
  return (
    <div className="space-y-2 text-xs">
      <Row label="사다리차" value={`${DEFAULT_EQUIPMENT_PRICES.ladder.toLocaleString()}원/일`} />
      <Row label="스카이차" value={`${DEFAULT_EQUIPMENT_PRICES.sky.toLocaleString()}원/일`} />
      <Row label="폐기물" value={`${DEFAULT_EQUIPMENT_PRICES.waste.toLocaleString()}원/일`} />
    </div>
  )
}

function VoiceSection() {
  return (
    <div className="space-y-2 text-xs">
      <p className="font-semibold">음성 설정</p>
      <Row label="STT 모델" value="gpt-4o-transcribe" />
      <Row label="TTS 모델" value="gpt-4o-mini-tts" />
      <Row label="TTS 속도" value="1.5배" />
      <Row label="웨이크워드" value="견적" />
      <Row label="마디 종료" value="됐어 / 넘겨" />
      <Row label="취소" value="그만" />
      <Row label="확신도 (높)" value="95%" />
      <Row label="확신도 (중)" value="70%" />
    </div>
  )
}

function InfoSection() {
  return (
    <div className="space-y-2 text-xs">
      <Row label="버전" value="v4.0" />
      <Row label="STT" value="GPT-4o Transcribe" />
      <Row label="LLM" value="Claude Sonnet" />
      <Row label="TTS" value="GPT-4o-mini TTS (1.5x)" />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
