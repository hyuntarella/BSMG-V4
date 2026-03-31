'use client'

import { useState, useEffect } from 'react'
import type { PresetRow } from '@/lib/estimate/types'
import { fm } from '@/lib/utils/format'

// ── 새 프리셋 기본값 ──
function emptyPreset(): Omit<PresetRow, 'id' | 'company_id' | 'used_count' | 'last_used'> {
  return { name: '', spec: '', unit: 'm²', mat: 0, labor: 0, exp: 0, category: 'custom' }
}

type EditingPreset = Omit<PresetRow, 'id' | 'company_id' | 'used_count' | 'last_used'>

export default function PresetsEditor() {
  const [presets, setPresets] = useState<PresetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [editValues, setEditValues] = useState<EditingPreset>(emptyPreset())
  const [categoryFilter, setCategoryFilter] = useState<string>('전체')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // ── 데이터 로드 ──
  useEffect(() => {
    loadPresets()
  }, [])

  async function loadPresets() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/presets')
      const json = await res.json()
      if (res.ok) {
        setPresets(json.presets ?? [])
      } else {
        console.error('프리셋 로드 실패:', json.error)
      }
    } catch (err) {
      console.error('프리셋 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── 카테고리 목록 ──
  const categories = ['전체', ...Array.from(new Set(presets.map((p) => p.category))).sort()]

  // ── 필터된 프리셋 ──
  const filtered =
    categoryFilter === '전체' ? presets : presets.filter((p) => p.category === categoryFilter)

  // ── 편집 시작 ──
  function startEdit(preset: PresetRow) {
    setEditingId(preset.id ?? null)
    setEditValues({
      name: preset.name,
      spec: preset.spec,
      unit: preset.unit,
      mat: preset.mat,
      labor: preset.labor,
      exp: preset.exp,
      category: preset.category,
    })
  }

  // ── 편집 취소 ──
  function cancelEdit() {
    setEditingId(null)
    setEditValues(emptyPreset())
  }

  // ── 새 프리셋 추가 모드 ──
  function startAddNew() {
    setEditingId('new')
    setEditValues(emptyPreset())
  }

  // ── 저장 (추가 or 수정) ──
  async function handleSave() {
    if (!editValues.name.trim()) {
      showToast('공종명을 입력하세요')
      return
    }

    setSaving(true)
    try {
      if (editingId === 'new') {
        // POST
        const res = await fetch('/api/settings/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editValues),
        })
        const json = await res.json()
        if (res.ok) {
          setPresets((prev) => [...prev, json.preset])
          showToast('추가됨')
        } else {
          showToast(`추가 실패: ${json.error}`)
        }
      } else {
        // PATCH
        const res = await fetch('/api/settings/presets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...editValues }),
        })
        const json = await res.json()
        if (res.ok) {
          setPresets((prev) =>
            prev.map((p) => (p.id === editingId ? json.preset : p))
          )
          showToast('저장됨')
        } else {
          showToast(`저장 실패: ${json.error}`)
        }
      }
      cancelEdit()
    } catch (err) {
      showToast(`오류: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  // ── 삭제 ──
  async function handleDelete(id: string) {
    if (!window.confirm('이 프리셋을 삭제하시겠습니까?')) return
    try {
      const res = await fetch('/api/settings/presets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setPresets((prev) => prev.filter((p) => p.id !== id))
        showToast('삭제됨')
      } else {
        const json = await res.json()
        showToast(`삭제 실패: ${json.error}`)
      }
    } catch (err) {
      showToast(`오류: ${err}`)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">로딩 중…</div>
  }

  return (
    <div className="space-y-4">
      {/* 상단 컨트롤 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 카테고리 필터 칩 */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
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
            onClick={startAddNew}
            disabled={editingId !== null}
            className="rounded bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            + 프리셋 추가
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="border border-gray-200 px-3 py-2 font-medium text-gray-600">공종명</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-gray-600">규격</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-gray-600 w-16">단위</th>
              <th className="border border-gray-200 px-3 py-2 text-right font-medium text-gray-600 w-20">재료비</th>
              <th className="border border-gray-200 px-3 py-2 text-right font-medium text-gray-600 w-20">노무비</th>
              <th className="border border-gray-200 px-3 py-2 text-right font-medium text-gray-600 w-20">경비</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-gray-600 w-20">카테고리</th>
              <th className="border border-gray-200 px-3 py-2 text-right font-medium text-gray-600 w-16">사용횟수</th>
              <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 w-20">액션</th>
            </tr>
          </thead>
          <tbody>
            {/* 새 프리셋 추가 행 */}
            {editingId === 'new' && (
              <EditRow
                values={editValues}
                onChange={setEditValues}
                onSave={handleSave}
                onCancel={cancelEdit}
                saving={saving}
                isNew
              />
            )}

            {filtered.map((preset) =>
              editingId === preset.id ? (
                <EditRow
                  key={preset.id}
                  values={editValues}
                  onChange={setEditValues}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              ) : (
                <tr key={preset.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">
                    {preset.name}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">
                    {preset.spec || <span className="text-gray-300">-</span>}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-600">{preset.unit}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right tabular-nums">
                    {fm(preset.mat)}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right tabular-nums">
                    {fm(preset.labor)}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right tabular-nums">
                    {fm(preset.exp)}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">
                    {preset.category}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-gray-400">
                    {preset.used_count ?? 0}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => startEdit(preset)}
                        disabled={editingId !== null}
                        className="rounded px-2 py-0.5 text-blue-500 hover:text-blue-700 disabled:opacity-30"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => preset.id && handleDelete(preset.id)}
                        disabled={editingId !== null}
                        className="rounded px-2 py-0.5 text-red-400 hover:text-red-600 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}

            {filtered.length === 0 && editingId !== 'new' && (
              <tr>
                <td colSpan={9} className="border border-gray-200 py-8 text-center text-sm text-gray-400">
                  프리셋이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 편집 행 서브컴포넌트 ──
interface EditRowProps {
  values: EditingPreset
  onChange: (v: EditingPreset) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew?: boolean
}

function EditRow({ values, onChange, onSave, onCancel, saving, isNew }: EditRowProps) {
  function field(key: keyof EditingPreset, type: 'text' | 'number' = 'text') {
    return (
      <input
        type={type}
        value={String(values[key])}
        onChange={(e) =>
          onChange({
            ...values,
            [key]: type === 'number' ? parseInt(e.target.value, 10) || 0 : e.target.value,
          })
        }
        className="w-full rounded border border-yellow-300 bg-yellow-50 px-2 py-1 text-xs outline-none focus:border-brand"
      />
    )
  }

  return (
    <tr className="bg-yellow-50">
      <td className="border border-gray-200 px-2 py-1">{field('name')}</td>
      <td className="border border-gray-200 px-2 py-1">{field('spec')}</td>
      <td className="border border-gray-200 px-2 py-1">{field('unit')}</td>
      <td className="border border-gray-200 px-2 py-1">{field('mat', 'number')}</td>
      <td className="border border-gray-200 px-2 py-1">{field('labor', 'number')}</td>
      <td className="border border-gray-200 px-2 py-1">{field('exp', 'number')}</td>
      <td className="border border-gray-200 px-2 py-1">{field('category')}</td>
      <td className="border border-gray-200 px-2 py-1 text-center text-gray-400">
        {isNew ? '신규' : '-'}
      </td>
      <td className="border border-gray-200 px-2 py-1 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded bg-brand px-2 py-0.5 text-white disabled:opacity-50"
          >
            {saving ? '…' : '저장'}
          </button>
          <button
            onClick={onCancel}
            className="rounded px-2 py-0.5 text-gray-500 hover:text-gray-700"
          >
            취소
          </button>
        </div>
      </td>
    </tr>
  )
}
