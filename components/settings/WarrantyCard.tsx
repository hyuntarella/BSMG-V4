'use client'

import type { OtherSettingsState } from '@/components/settings/useOtherSettingsStore'
import {
  WARRANTY_OPTIONS,
  deriveYearsBond,
  formatWarrantyOption,
  type WarrantyOption,
} from '@/lib/estimate/warrantyOptions'

interface Props {
  state: OtherSettingsState
  onChange: (s: OtherSettingsState) => void
}

/**
 * 보증 설정 카드.
 */
export default function WarrantyCardComponent({ state, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-muted">
        공법별 하자보증 옵션. 견적서에서 개별 변경 가능.
      </p>
      <div className="space-y-4">
        <WarrantyMethodSection
          title="복합방수"
          value={state.warrantyComplex}
          onChange={(v) => onChange({ ...state, warrantyComplex: v })}
        />
        <WarrantyMethodSection
          title="우레탄방수"
          value={state.warrantyUrethane}
          onChange={(v) => onChange({ ...state, warrantyUrethane: v })}
        />
      </div>
    </div>
  )
}

function WarrantyMethodSection({
  title,
  value,
  onChange,
}: {
  title: string
  value: WarrantyOption
  onChange: (v: WarrantyOption) => void
}) {
  const derived = deriveYearsBond(value)
  return (
    <div>
      <div className="mb-1.5">
        <span className="text-xs font-medium text-ink">{title}</span>
        <span className="ml-2 text-[10px] text-ink-muted">
          보증 {derived.years}년 / 보증서 {derived.bond}년
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {WARRANTY_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
              value === opt
                ? 'border-brand bg-brand/5 font-medium text-brand'
                : 'border-ink-faint/20 text-ink-secondary hover:bg-surface-muted'
            }`}
          >
            {opt}
            <span className="ml-1 text-[10px] text-ink-muted">
              ({formatWarrantyOption(opt)})
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
