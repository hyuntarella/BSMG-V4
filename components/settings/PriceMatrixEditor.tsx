'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AreaRange, Method, PriceMatrixRow } from '@/lib/estimate/types'
import { AREA_BOUNDARIES, COMPLEX_BASE, URETHANE_BASE } from '@/lib/estimate/constants'
import { fm } from '@/lib/utils/format'

// ── 편집 중인 셀 식별자 ──
interface EditingCell {
  price_per_pyeong: number
  item_index: number
  field: 'mat' | 'labor' | 'exp'
}

const AREA_RANGES: AreaRange[] = AREA_BOUNDARIES
  .filter((b) => b.max !== Infinity)
  .map((b) => b.label)
  .concat(['200평이상'])

const METHODS: Method[] = ['복합', '우레탄']

export default function PriceMatrixEditor() {
  const [areaRange, setAreaRange] = useState<AreaRange>('50~100평')
  const [method, setMethod] = useState<Method>('복합')
  const [rows, setRows] = useState<PriceMatrixRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // ── 데이터 로드 ──
  const loadData = useCallback(async () => {
    setLoading(true)
    setEditingCell(null)
    try {
      const res = await fetch(
        `/api/settings/price-matrix?area_range=${encodeURIComponent(areaRange)}&method=${encodeURIComponent(method)}`
      )
      const json = await res.json()
      if (res.ok) {
        setRows(json.rows ?? [])
      } else {
        console.error('P매트릭스 로드 실패:', json.error)
        setRows([])
      }
    } catch (err) {
      console.error('P매트릭스 로드 오류:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [areaRange, method])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── 평단가 목록 ──
  const pppList = Array.from(
    new Set(rows.map((r) => r.price_per_pyeong))
  ).sort((a, b) => a - b)

  // ── 공종명 목록 ──
  const baseItems = method === '복합' ? COMPLEX_BASE : URETHANE_BASE

  // ── 셀 값 조회 ──
  function getCellValue(
    ppp: number,
    itemIndex: number,
    field: 'mat' | 'labor' | 'exp'
  ): number {
    const row = rows.find(
      (r) => r.price_per_pyeong === ppp && r.item_index === itemIndex
    )
    return row ? row[field] : 0
  }

  // ── 셀 편집 시작 ──
  function startEdit(ppp: number, itemIndex: number, field: 'mat' | 'labor' | 'exp') {
    const val = getCellValue(ppp, itemIndex, field)
    setEditingCell({ price_per_pyeong: ppp, item_index: itemIndex, field })
    setEditValue(String(val))
  }

  // ── 셀 편집 완료 ──
  function commitEdit() {
    if (!editingCell) return
    const parsed = parseInt(editValue, 10)
    if (isNaN(parsed)) {
      setEditingCell(null)
      return
    }
    setRows((prev) => {
      const existing = prev.find(
        (r) =>
          r.price_per_pyeong === editingCell.price_per_pyeong &&
          r.item_index === editingCell.item_index
      )
      if (existing) {
        return prev.map((r) =>
          r.price_per_pyeong === editingCell.price_per_pyeong &&
          r.item_index === editingCell.item_index
            ? { ...r, [editingCell.field]: parsed }
            : r
        )
      }
      // 새 행 추가 (DB에 없었던 경우)
      return [
        ...prev,
        {
          company_id: '',
          area_range: areaRange,
          method,
          price_per_pyeong: editingCell.price_per_pyeong,
          item_index: editingCell.item_index,
          mat: editingCell.field === 'mat' ? parsed : 0,
          labor: editingCell.field === 'labor' ? parsed : 0,
          exp: editingCell.field === 'exp' ? parsed : 0,
        },
      ]
    })
    setEditingCell(null)
  }

  // ── 저장 ──
  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/price-matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
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

  // ── 렌더링 ──
  return (
    <div className="space-y-4">
      {/* 컨트롤 바 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">면적대</label>
          <select
            value={areaRange}
            onChange={(e) => setAreaRange(e.target.value as AreaRange)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {AREA_RANGES.map((ar) => (
              <option key={ar} value={ar}>
                {ar}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">공법</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Method)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {toast && (
            <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">
              {toast}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || rows.length === 0}
            className="rounded bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">로딩 중…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
          해당 면적대/공법의 단가 데이터가 없습니다
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              {/* 평단가 그룹 헤더 */}
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">
                  공종
                </th>
                {pppList.map((ppp) => (
                  <th
                    key={ppp}
                    colSpan={3}
                    className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700"
                  >
                    평당 {fm(ppp)}원
                  </th>
                ))}
              </tr>
              {/* 재료/노무/경비 서브 헤더 */}
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2" />
                {pppList.map((ppp) => (
                  <>
                    <th
                      key={`${ppp}-mat`}
                      className="border border-gray-200 px-2 py-1 text-center text-gray-500"
                    >
                      재료
                    </th>
                    <th
                      key={`${ppp}-labor`}
                      className="border border-gray-200 px-2 py-1 text-center text-gray-500"
                    >
                      노무
                    </th>
                    <th
                      key={`${ppp}-exp`}
                      className="border border-gray-200 px-2 py-1 text-center text-gray-500"
                    >
                      경비
                    </th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {baseItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                    {item.name}
                  </td>
                  {pppList.map((ppp) =>
                    (['mat', 'labor', 'exp'] as const).map((field) => {
                      const isEditing =
                        editingCell?.price_per_pyeong === ppp &&
                        editingCell?.item_index === idx &&
                        editingCell?.field === field
                      const val = getCellValue(ppp, idx, field)
                      return (
                        <td
                          key={`${ppp}-${field}`}
                          className={`border border-gray-200 px-2 py-1 text-right ${
                            isEditing ? 'bg-yellow-50 p-0' : 'cursor-pointer hover:bg-blue-50'
                          }`}
                          onClick={() => !isEditing && startEdit(ppp, idx, field)}
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
                              className="w-full bg-yellow-50 px-2 py-1 text-right text-xs outline-none"
                            />
                          ) : (
                            fm(val)
                          )}
                        </td>
                      )
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
