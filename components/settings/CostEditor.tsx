'use client'

import { useState, useEffect } from 'react'
import type { CostBreakpoint } from '@/lib/estimate/constants'
import { COST_BREAKPOINTS, LABOR_COST_PER_PUM, MATERIAL_INCREASE_RATE } from '@/lib/estimate/constants'
import { fm } from '@/lib/utils/format'

// ── 편집 중인 셀 ──
interface EditingCell {
  index: number
  field: keyof CostBreakpoint
}

export default function CostEditor() {
  const [laborCostPerPum, setLaborCostPerPum] = useState<number>(LABOR_COST_PER_PUM)
  const [materialIncreaseRate, setMaterialIncreaseRate] = useState<number>(
    Math.round(MATERIAL_INCREASE_RATE * 100)
  )
  const [breakpoints, setBreakpoints] = useState<CostBreakpoint[]>(
    COST_BREAKPOINTS.map((bp) => ({ ...bp }))
  )
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ── 서버에서 기존 설정 로드 ──
  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/cost-config')
      const json = await res.json()
      if (res.ok && json.config) {
        const cfg = json.config as Record<string, unknown>
        if (typeof cfg.labor_cost_per_pum === 'number') {
          setLaborCostPerPum(cfg.labor_cost_per_pum)
        }
        if (typeof cfg.material_increase_rate === 'number') {
          setMaterialIncreaseRate(Math.round(cfg.material_increase_rate * 100))
        }
        if (Array.isArray(cfg.cost_breakpoints) && cfg.cost_breakpoints.length > 0) {
          setBreakpoints(cfg.cost_breakpoints as CostBreakpoint[])
        }
      }
    } catch (err) {
      console.error('원가 설정 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── 셀 편집 ──
  function startEdit(index: number, field: keyof CostBreakpoint) {
    setEditingCell({ index, field })
    setEditValue(String(breakpoints[index][field]))
  }

  function commitEdit() {
    if (!editingCell) return
    const parsed = parseInt(editValue, 10)
    if (!isNaN(parsed)) {
      setBreakpoints((prev) =>
        prev.map((bp, i) =>
          i === editingCell.index ? { ...bp, [editingCell.field]: parsed } : bp
        )
      )
    }
    setEditingCell(null)
  }

  // ── 행 추가 ──
  function addRow() {
    const last = breakpoints[breakpoints.length - 1]
    setBreakpoints((prev) => [
      ...prev,
      {
        pyeong: (last?.pyeong ?? 100) + 50,
        hado: 0,
        jungdo15: 0,
        sangdo: 0,
        sheet: 0,
        misc: 0,
        pum: 0,
      },
    ])
  }

  // ── 행 삭제 ──
  function removeRow(index: number) {
    if (!window.confirm('이 원가 데이터 행을 삭제하시겠습니까?')) return
    setBreakpoints((prev) => prev.filter((_, i) => i !== index))
  }

  // ── 저장 ──
  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/cost-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            labor_cost_per_pum: laborCostPerPum,
            material_increase_rate: materialIncreaseRate / 100,
            cost_breakpoints: breakpoints,
          },
        }),
      })
      const json = await res.json()
      if (res.ok) {
        showToast('저장됨')
      } else {
        showToast(`저장 실패: ${json.error}`)
      }
    } catch (err) {
      showToast(`저장 오류: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const BREAKPOINT_FIELDS: { field: keyof CostBreakpoint; label: string }[] = [
    { field: 'pyeong', label: '면적(평)' },
    { field: 'hado', label: '하도' },
    { field: 'jungdo15', label: '중도 1.5mm' },
    { field: 'sangdo', label: '상도' },
    { field: 'sheet', label: '시트' },
    { field: 'misc', label: '경비·잡비' },
    { field: 'pum', label: '품수' },
  ]

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">로딩 중…</div>
  }

  return (
    <div className="space-y-6">
      {/* 기본 상수 */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">기본 단가</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">1품 단가</label>
            <input
              type="number"
              value={laborCostPerPum}
              onChange={(e) => setLaborCostPerPum(parseInt(e.target.value, 10) || 0)}
              className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
            />
            <span className="text-sm text-gray-500">원</span>
            <span className="text-xs text-gray-400">
              (현재: {fm(laborCostPerPum)}원)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">재료비 인상률</label>
            <input
              type="number"
              value={materialIncreaseRate}
              onChange={(e) => setMaterialIncreaseRate(parseInt(e.target.value, 10) || 0)}
              className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
      </div>

      {/* 면적대별 원가 테이블 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">면적대별 원가 기준</h3>
          <div className="flex items-center gap-2">
            {toast && (
              <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">
                {toast}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-gray-400">
          * 금액 단위: 원. 품수는 소수점 가능. 셀을 클릭하여 편집.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                {BREAKPOINT_FIELDS.map(({ field, label }) => (
                  <th
                    key={field}
                    className="border border-gray-200 px-3 py-2 font-medium text-gray-600 whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
                <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 w-12">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody>
              {breakpoints.map((bp, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {BREAKPOINT_FIELDS.map(({ field }) => {
                    const isEditing =
                      editingCell?.index === idx && editingCell.field === field
                    return (
                      <td
                        key={field}
                        className={`border border-gray-200 px-2 py-1 text-right tabular-nums ${
                          isEditing
                            ? 'bg-yellow-50 p-0'
                            : 'cursor-pointer hover:bg-blue-50'
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
                            className="w-full bg-yellow-50 px-2 py-1 text-right text-xs outline-none"
                          />
                        ) : field === 'pyeong' || field === 'pum' ? (
                          bp[field]
                        ) : (
                          fm(bp[field])
                        )}
                      </td>
                    )
                  })}
                  <td className="border border-gray-200 px-2 py-1 text-center">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addRow}
          className="mt-2 flex items-center gap-1 rounded border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-brand hover:text-brand"
        >
          + 행 추가
        </button>
      </div>
    </div>
  )
}
