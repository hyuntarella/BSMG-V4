'use client'

import CostEditorCard from '@/components/settings/CostEditorCard'
import CalcRulesCard from '@/components/settings/CalcRulesCard'
import WarrantyCard from '@/components/settings/WarrantyCard'
import type { OtherSettingsState } from '@/components/settings/useOtherSettingsStore'

interface Props {
  state: OtherSettingsState
  onChange: (s: OtherSettingsState) => void
}

/**
 * "기타 설정" — 2×2 카드 그리드.
 * 개별 저장 버튼 없음. page.tsx의 통합 저장 사용.
 */
export default function OtherSettingsPage({ state, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SettingsCard title="원가 기준" icon="📊" desc="면적 구간별 원가 설정 + 품셈 단가">
        <CostEditorCard state={state} onChange={onChange} />
      </SettingsCard>

      <SettingsCard title="계산 규칙 · 장비" icon="⚙" desc="공과잡비 · 이윤 · 절사 · 장비 단가">
        <CalcRulesCard state={state} onChange={onChange} />
      </SettingsCard>

      <SettingsCard title="보증" icon="🛡" desc="공법별 하자보증 기본값">
        <WarrantyCard state={state} onChange={onChange} />
      </SettingsCard>

      <SettingsCard title="미리보기" icon="👁" desc="현재 설정 기반 예시 계산">
        <CalcPreview state={state} />
      </SettingsCard>
    </div>
  )
}

function SettingsCard({
  title,
  icon,
  desc,
  children,
}: {
  title: string
  icon: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-xl border border-ink-faint/20 bg-white">
      <header className="flex items-center gap-2 border-b border-ink-faint/10 px-4 py-3">
        <span className="text-base">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-[10px] text-ink-muted">{desc}</p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '340px' }}>
        {children}
      </div>
    </div>
  )
}

// ── 미리보기 패널 ──
import { fm } from '@/lib/utils/format'

function CalcPreview({ state }: { state: OtherSettingsState }) {
  const BASE = 1000000
  const overhead = Math.round(BASE * (state.overheadRate / 100))
  const profit = Math.round((BASE + overhead) * (state.profitRate / 100))
  const subtotal = BASE + overhead + profit
  const rounded = Math.floor(subtotal / state.roundUnit) * state.roundUnit

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">예시 소계 {fm(BASE)}원 기준</p>
      <div className="space-y-1.5 text-xs tabular-nums">
        <Row label="소계" value={fm(BASE)} />
        <Row label={`공과잡비 ${state.overheadRate}%`} value={`+ ${fm(overhead)}`} />
        <Row label={`기업이윤 ${state.profitRate}%`} value={`+ ${fm(profit)}`} />
        <div className="border-t border-ink-faint/20 pt-1.5">
          <Row label="계" value={fm(subtotal)} />
        </div>
        <div className="font-medium text-ink">
          <Row label="합계 (절사)" value={`${fm(rounded)}원`} />
        </div>
      </div>

      <div className="border-t border-ink-faint/10 pt-3">
        <p className="text-xs text-ink-muted">장비 단가 요약</p>
        <div className="mt-1.5 space-y-1 text-xs tabular-nums">
          <Row label="사다리차" value={`${fm(state.equipment.ladder.mat + state.equipment.ladder.labor + state.equipment.ladder.exp)}원`} />
          <Row label="스카이차" value={`${fm(state.equipment.sky.mat + state.equipment.sky.labor + state.equipment.sky.exp)}원`} />
          <Row label="폐기물" value={`${fm(state.equipment.waste.mat + state.equipment.waste.labor + state.equipment.waste.exp)}원`} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-secondary">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
