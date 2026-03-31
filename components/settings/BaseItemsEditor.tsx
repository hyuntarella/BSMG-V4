'use client'

import { useState } from 'react'
import type { BaseItem } from '@/lib/estimate/types'
import { COMPLEX_BASE, URETHANE_BASE } from '@/lib/estimate/constants'

// ── 초기 데이터 ──
function cloneBase(arr: BaseItem[]): BaseItem[] {
  return arr.map((item) => ({ ...item }))
}

// ── 편집 중인 셀 ──
interface EditingCell {
  index: number
  field: 'name' | 'spec' | 'unit'
}

export default function BaseItemsEditor() {
  const [method, setMethod] = useState<'복합' | '우레탄'>('복합')
  const [complexItems, setComplexItems] = useState<BaseItem[]>(cloneBase(COMPLEX_BASE))
  const [urethaneItems, setUrethaneItems] = useState<BaseItem[]>(cloneBase(URETHANE_BASE))
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const items = method === '복합' ? complexItems : urethaneItems
  const setItems = method === '복합' ? setComplexItems : setUrethaneItems

  // ── 셀 편집 시작 ──
  function startEdit(index: number, field: 'name' | 'spec' | 'unit') {
    setEditingCell({ index, field })
    setEditValue(items[index][field] ?? '')
  }

  // ── 셀 편집 완료 ──
  function commitEdit() {
    if (!editingCell) return
    setItems((prev) =>
      prev.map((item, i) =>
        i === editingCell.index ? { ...item, [editingCell.field]: editValue } : item
      )
    )
    setEditingCell(null)
  }

  // ── boolean 토글 ──
  function toggleBool(index: number, field: keyof BaseItem) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: !item[field as keyof BaseItem] } : item
      )
    )
  }

  // ── 행 추가 ──
  function addRow() {
    const newItem: BaseItem = { name: '새 공종', spec: '', unit: 'm²' }
    setItems((prev) => [...prev, newItem])
  }

  // ── 행 삭제 ──
  function removeRow(index: number) {
    if (!window.confirm('이 공종을 삭제하시겠습니까?')) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // ── 순서 이동 ──
  function moveRow(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return
    setItems((prev) => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  // ── 저장 (cost_config JSONB에 base_items 키로 저장) ──
  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/cost-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'base_items',
          value: { complex: complexItems, urethane: urethaneItems },
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

  return (
    <div className="space-y-4">
      {/* 컨트롤 바 */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['복합', '우레탄'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                method === m ? 'bg-brand text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
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

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="border border-gray-200 px-2 py-2 w-8 text-center">#</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-gray-600">공종명</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-gray-600">규격</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-gray-600 w-16">단위</th>
              <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 w-16">면적연동</th>
              <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 w-16">벽체연동</th>
              <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 w-12">장비</th>
              <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 w-16">고정수량</th>
              <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 w-20">순서/삭제</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">
                  {idx + 1}
                </td>

                {/* 공종명 */}
                <td
                  className={`border border-gray-200 px-2 py-1 ${
                    editingCell?.index === idx && editingCell.field === 'name'
                      ? 'bg-yellow-50 p-0'
                      : 'cursor-pointer hover:bg-blue-50'
                  }`}
                  onClick={() =>
                    !(editingCell?.index === idx && editingCell.field === 'name') &&
                    startEdit(idx, 'name')
                  }
                >
                  {editingCell?.index === idx && editingCell.field === 'name' ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') setEditingCell(null)
                      }}
                      className="w-full bg-yellow-50 px-2 py-1 text-xs outline-none"
                    />
                  ) : (
                    <span className="whitespace-pre-line">{item.name}</span>
                  )}
                </td>

                {/* 규격 */}
                <td
                  className={`border border-gray-200 px-2 py-1 ${
                    editingCell?.index === idx && editingCell.field === 'spec'
                      ? 'bg-yellow-50 p-0'
                      : 'cursor-pointer hover:bg-blue-50'
                  }`}
                  onClick={() =>
                    !(editingCell?.index === idx && editingCell.field === 'spec') &&
                    startEdit(idx, 'spec')
                  }
                >
                  {editingCell?.index === idx && editingCell.field === 'spec' ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') setEditingCell(null)
                      }}
                      className="w-full bg-yellow-50 px-2 py-1 text-xs outline-none"
                    />
                  ) : (
                    item.spec || <span className="text-gray-300">-</span>
                  )}
                </td>

                {/* 단위 */}
                <td
                  className={`border border-gray-200 px-2 py-1 ${
                    editingCell?.index === idx && editingCell.field === 'unit'
                      ? 'bg-yellow-50 p-0'
                      : 'cursor-pointer hover:bg-blue-50'
                  }`}
                  onClick={() =>
                    !(editingCell?.index === idx && editingCell.field === 'unit') &&
                    startEdit(idx, 'unit')
                  }
                >
                  {editingCell?.index === idx && editingCell.field === 'unit' ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') setEditingCell(null)
                      }}
                      className="w-full bg-yellow-50 px-2 py-1 text-xs outline-none"
                    />
                  ) : (
                    item.unit
                  )}
                </td>

                {/* Boolean 체크박스들 */}
                {(['isArea', 'isWall', 'isEquipment', 'isFixedQty'] as const).map((field) => (
                  <td key={field} className="border border-gray-200 px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!item[field]}
                      onChange={() => toggleBool(idx, field)}
                      className="h-3.5 w-3.5 cursor-pointer accent-brand"
                    />
                  </td>
                ))}

                {/* 순서/삭제 */}
                <td className="border border-gray-200 px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => moveRow(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded px-1 py-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                      title="위로"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveRow(idx, 'down')}
                      disabled={idx === items.length - 1}
                      className="rounded px-1 py-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                      title="아래로"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => removeRow(idx)}
                      className="rounded px-1 py-0.5 text-red-400 hover:text-red-600"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 행 추가 버튼 */}
      <button
        onClick={addRow}
        className="flex items-center gap-1 rounded border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-brand hover:text-brand"
      >
        + 공종 추가
      </button>
    </div>
  )
}
