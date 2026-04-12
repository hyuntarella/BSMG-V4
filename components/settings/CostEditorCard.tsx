'use client'

import { useState, useCallback } from 'react'
import type { CostBreakpoint } from '@/lib/estimate/constants'
import type { OtherSettingsState } from '@/components/settings/useOtherSettingsStore'
import { fm } from '@/lib/utils/format'

interface Props {
  state: OtherSettingsState
  onChange: (s: OtherSettingsState) => void
}

interface EditingCell {
  index: number
  field: keyof CostBreakpoint
}

const FIELDS: { field: keyof CostBreakpoint; label: string }[] = [
  { field: 'pyeong', label: '평' },
  { field: 'hado', label: '하도' },
  { field: 'jungdo15', label: '중도' },
  { field: 'sangdo', label: '상도' },
  { field: 'sheet', label: '시트' },
  { field: 'misc', label: '경비' },
  { field: 'pum', label: '품수' },
]

/**
 * 원가 기준 카드 내부 — 1품 단가 + 면적대별 원가 테이블.
 */
export default function CostEditorCard({ state, onChange }: Props) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = useCallback(
    (index: number, field: keyof CostBreakpoint) => {
      setEditingCell({ index, field })
      setEditValue(String(state.breakpoints[index][field]))
    },
    [state.breakpoints],
  )

  const commitEdit = useCallback(() => {
    if (!editingCell) return
    const parsed = editingCell.field === 'pum'
      ? parseFloat(editValue)
      : parseInt(editValue, 10)
    if (!isNaN(parsed)) {
      const updated = state.breakpoints.map((bp, i) =>
        i === editingCell.index ? { ...bp, [editingCell.field]: parsed } : bp,
      )
      onChange({ ...state, breakpoints: updated })
    }
    setEditingCell(null)
  }, [editingCell, editValue, state, onChange])

  return (
    <div className="space-y-4">
      {/* 1품 단가 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-secondary">1품 단가</span>
        <input
          type="number"
          value={state.laborCostPerPum}
          onChange={(e) =>
            onChange({ ...state, laborCostPerPum: parseInt(e.target.value, 10) || 0 })
          }
          className="w-24 rounded-lg border border-ink-faint/30 px-2 py-1 text-right text-xs tabular-nums"
        />
        <span className="text-xs text-ink-muted">원 ({fm(state.laborCostPerPum)})</span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-surface-muted">
              {FIELDS.map(({ field, label }) => (
                <th
                  key={field}
                  className="border border-ink-faint/20 px-1.5 py-1 font-medium text-ink-secondary whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.breakpoints.map((bp, idx) => (
              <tr key={idx} className="hover:bg-surface-muted/50">
                {FIELDS.map(({ field }) => {
                  const isEditing =
                    editingCell?.index === idx && editingCell.field === field
                  return (
                    <td
                      key={field}
                      className={`border border-ink-faint/20 text-right tabular-nums ${
                        isEditing ? 'bg-accent-50 p-0' : 'cursor-pointer px-1.5 py-1 hover:bg-v-sel'
                      }`}
                      onClick={() => !isEditing && startEdit(idx, field)}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          step={field === 'pum' ? '0.5' : '1'}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditingCell(null)
                          }}
                          className="w-full bg-accent-50 px-1.5 py-1 text-right text-[11px] outline-none"
                        />
                      ) : field === 'pyeong' || field === 'pum' ? (
                        bp[field]
                      ) : (
                        fm(bp[field])
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
