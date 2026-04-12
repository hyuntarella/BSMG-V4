'use client'

import type { OtherSettingsState } from '@/components/settings/useOtherSettingsStore'
import { fm } from '@/lib/utils/format'

interface Props {
  state: OtherSettingsState
  onChange: (s: OtherSettingsState) => void
}

type EquipmentKey = 'ladder' | 'sky' | 'waste' | 'forklift' | 'crane' | 'ropeman'

const ROUND_OPTIONS = [
  { value: 10000, label: '1만' },
  { value: 50000, label: '5만' },
  { value: 100000, label: '10만' },
  { value: 500000, label: '50만' },
  { value: 1000000, label: '100만' },
]

const EQUIPMENT_LABELS: { key: EquipmentKey; name: string }[] = [
  { key: 'ladder', name: '사다리차' },
  { key: 'sky', name: '스카이차' },
  { key: 'waste', name: '폐기물' },
  { key: 'forklift', name: '포크레인' },
  { key: 'crane', name: '크레인' },
  { key: 'ropeman', name: '로프공' },
]

/**
 * 계산 규칙 + 장비 단가 카드.
 */
export default function CalcRulesCard({ state, onChange }: Props) {
  function updateEquipment(key: EquipmentKey, field: 'mat' | 'labor' | 'exp', value: number) {
    onChange({
      ...state,
      equipment: {
        ...state.equipment,
        [key]: { ...state.equipment[key], [field]: value },
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* 계산 규칙 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-secondary">공과잡비</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={state.overheadRate}
              min={0}
              max={50}
              step={0.01}
              onChange={(e) =>
                onChange({ ...state, overheadRate: parseFloat(e.target.value) || 0 })
              }
              className="w-16 rounded border border-ink-faint/30 px-2 py-1 text-right text-xs tabular-nums"
            />
            <span className="text-xs text-ink-muted">%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-secondary">기업이윤</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={state.profitRate}
              min={0}
              max={50}
              step={0.01}
              onChange={(e) =>
                onChange({ ...state, profitRate: parseFloat(e.target.value) || 0 })
              }
              className="w-16 rounded border border-ink-faint/30 px-2 py-1 text-right text-xs tabular-nums"
            />
            <span className="text-xs text-ink-muted">%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-secondary">절사</span>
          <select
            value={state.roundUnit}
            onChange={(e) => onChange({ ...state, roundUnit: parseInt(e.target.value, 10) })}
            className="rounded border border-ink-faint/30 px-2 py-1 text-xs"
          >
            {ROUND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}원
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 장비 단가 */}
      <div className="border-t border-ink-faint/10 pt-3">
        <p className="mb-2 text-xs font-medium text-ink-secondary">장비 단가</p>
        <div className="space-y-2">
          {EQUIPMENT_LABELS.map(({ key, name }) => {
            const entry = state.equipment[key]
            const total = entry.mat + entry.labor + entry.exp
            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="w-16 text-xs text-ink-secondary">{name}</span>
                <div className="flex items-center gap-1">
                  {(['mat', 'labor', 'exp'] as const).map((field) => (
                    <input
                      key={field}
                      type="number"
                      value={entry[field]}
                      min={0}
                      step={10000}
                      onChange={(e) =>
                        updateEquipment(key, field, parseInt(e.target.value, 10) || 0)
                      }
                      className="w-20 rounded border border-ink-faint/30 px-1.5 py-1 text-right text-[11px] tabular-nums"
                      title={field === 'mat' ? '재료' : field === 'labor' ? '인건' : '경비'}
                    />
                  ))}
                  <span className="w-16 text-right text-[10px] text-ink-muted tabular-nums">
                    {fm(total)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
