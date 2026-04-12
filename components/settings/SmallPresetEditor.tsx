'use client'

import { memo, useState, useCallback, useEffect, useRef } from 'react'
import type { Method } from '@/lib/estimate/types'
import { COMPLEX_BASE, URETHANE_BASE, SMALL_PRESET_KEYS } from '@/lib/estimate/constants'
import { fm } from '@/lib/utils/format'
import type { SmallPresetsState } from '@/components/settings/PriceMatrixEditor'

interface Props {
  method: Method
  presets: SmallPresetsState
  onChange: (v: SmallPresetsState) => void
}

type CostRow = [mat: number, labor: number, exp: number]

/**
 * 20평이하 전용 프리셋 편집기.
 *
 * - 복합: SMALL_PRESETS 3개 총액 카드 (공종별 재료/인건/경비 편집 가능, 총액 자동 갱신)
 * - 우레탄: 빈 입력 폼 + "현재 미사용 규모" 안내
 */
function SmallPresetEditorInner({ method, presets, onChange }: Props) {
  const methodKey = method === '복합' ? 'complex' : 'urethane'
  const baseItems = method === '복합' ? COMPLEX_BASE : URETHANE_BASE
  const currentPresets = presets[methodKey]

  const presetKeys = Object.keys(currentPresets)
    .map(Number)
    .sort((a, b) => a - b)

  const hasData = presetKeys.length > 0 &&
    presetKeys.some((k) => {
      const rows = currentPresets[String(k)]
      return rows && rows.some((r) => r[0] !== 0 || r[1] !== 0 || r[2] !== 0)
    })

  // 우레탄: 프리셋 키가 없으면 기본 키 3개 생성
  const effectiveKeys = presetKeys.length > 0
    ? presetKeys
    : (method === '우레탄' ? [3300000, 3800000, 4300000] : SMALL_PRESET_KEYS)

  const handleCellChange = useCallback(
    (presetKey: number, itemIndex: number, field: 0 | 1 | 2, value: number) => {
      const key = String(presetKey)
      const rows: CostRow[] = currentPresets[key]
        ? currentPresets[key].map((r) => [...r] as CostRow)
        : baseItems.map(() => [0, 0, 0] as CostRow)

      rows[itemIndex][field] = value

      onChange({
        ...presets,
        [methodKey]: {
          ...currentPresets,
          [key]: rows,
        },
      })
    },
    [presets, currentPresets, methodKey, baseItems, onChange],
  )

  return (
    <div className="space-y-4">
      {/* 우레탄 미사용 안내 */}
      {method === '우레탄' && !hasData && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          현재 미사용 규모. 데이터 입력 시 활성화됨
        </div>
      )}

      {/* 프리셋 카드 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {effectiveKeys.map((presetKey) => {
          const key = String(presetKey)
          const rows: CostRow[] = currentPresets[key]
            ? currentPresets[key].map((r) => [...r] as CostRow)
            : baseItems.map(() => [0, 0, 0] as CostRow)

          const total = rows.reduce((sum, r) => sum + r[0] + r[1] + r[2], 0)

          return (
            <PresetCard
              key={key}
              presetKey={presetKey}
              baseItems={baseItems}
              rows={rows}
              total={total}
              onCellChange={handleCellChange}
            />
          )
        })}
      </div>
    </div>
  )
}

const SmallPresetEditor = memo(SmallPresetEditorInner)
export default SmallPresetEditor

// ── 개별 프리셋 카드 ──

interface PresetCardProps {
  presetKey: number
  baseItems: { name: string; spec: string; unit: string }[]
  rows: CostRow[]
  total: number
  onCellChange: (presetKey: number, itemIndex: number, field: 0 | 1 | 2, value: number) => void
}

interface EditingSmallCell {
  itemIndex: number
  field: 0 | 1 | 2
}

function PresetCard({ presetKey, baseItems, rows, total, onCellChange }: PresetCardProps) {
  const [editingCell, setEditingCell] = useState<EditingSmallCell | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = useCallback(
    (itemIndex: number, field: 0 | 1 | 2) => {
      setEditingCell({ itemIndex, field })
      setEditValue(String(rows[itemIndex]?.[field] ?? 0))
    },
    [rows],
  )

  const commitEdit = useCallback(() => {
    if (!editingCell) return
    const parsed = parseInt(editValue, 10)
    if (!isNaN(parsed)) {
      onCellChange(presetKey, editingCell.itemIndex, editingCell.field, parsed)
    }
    setEditingCell(null)
  }, [editingCell, editValue, presetKey, onCellChange])

  // unmount 시 편집 중인 값 자동 커밋 (탭 전환 소실 방지)
  const editingRef = useRef(editingCell)
  const editValueRef = useRef(editValue)
  editingRef.current = editingCell
  editValueRef.current = editValue
  useEffect(() => {
    return () => {
      const cell = editingRef.current
      if (!cell) return
      const parsed = parseInt(editValueRef.current, 10)
      if (!isNaN(parsed)) {
        onCellChange(presetKey, cell.itemIndex, cell.field, parsed)
      }
    }
  }, [presetKey, onCellChange])

  const FIELD_LABELS = ['재료', '인건', '경비'] as const

  return (
    <div className="rounded-xl border border-ink-faint/20 bg-white">
      {/* 헤더: 총액 */}
      <div className="flex items-center justify-between border-b border-ink-faint/10 px-4 py-3">
        <span className="text-sm font-semibold text-ink tabular-nums">
          {fm(presetKey)}원
        </span>
        <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs text-ink-muted tabular-nums">
          합계 {fm(total)}원
        </span>
      </div>

      {/* 공종 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-surface-muted">
              <th className="border-b border-ink-faint/10 px-2 py-1.5 text-left font-medium text-ink-secondary">
                공종
              </th>
              {FIELD_LABELS.map((label) => (
                <th
                  key={label}
                  className="border-b border-ink-faint/10 px-2 py-1.5 text-right font-medium text-ink-secondary"
                >
                  {label}
                </th>
              ))}
              <th className="border-b border-ink-faint/10 px-2 py-1.5 text-right font-medium text-brand">
                합
              </th>
            </tr>
          </thead>
          <tbody>
            {baseItems.map((item, idx) => {
              const row = rows[idx] ?? [0, 0, 0]
              const rowSum = row[0] + row[1] + row[2]
              return (
                <tr key={idx} className="hover:bg-surface-muted/50">
                  <td className="border-b border-ink-faint/10 px-2 py-1.5 text-ink whitespace-pre-line">
                    {item.name}
                  </td>
                  {([0, 1, 2] as const).map((field) => {
                    const isEditing =
                      editingCell?.itemIndex === idx && editingCell?.field === field
                    return (
                      <td
                        key={field}
                        className={`border-b border-ink-faint/10 text-right font-mono tabular-nums ${
                          isEditing
                            ? 'bg-accent-50 p-0'
                            : 'cursor-pointer px-2 py-1.5 hover:bg-v-sel'
                        }`}
                        onClick={() => !isEditing && startEdit(idx, field)}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                            className="w-full bg-accent-50 px-2 py-1.5 text-right font-mono text-xs outline-none"
                          />
                        ) : (
                          fm(row[field])
                        )}
                      </td>
                    )
                  })}
                  <td className="border-b border-ink-faint/10 px-2 py-1.5 text-right font-mono tabular-nums font-semibold text-brand">
                    {fm(rowSum)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
