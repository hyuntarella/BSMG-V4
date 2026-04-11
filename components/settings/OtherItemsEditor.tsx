'use client'

import { useEffect, useState, useMemo } from 'react'
import { useOtherItems, emptyOtherItem, type OtherItemEntry, type OtherItemsMap } from '@/hooks/useOtherItems'
import { useFavorites } from '@/hooks/useFavorites'
import { cloneFavorites } from '@/lib/estimate/favorites'
import OtherItemsTable from './OtherItemsTable'

interface AcdbCandidate {
  name: string
  unit: string
  used_count: number
}

/**
 * 기타 공종 섹션 — acdb 사전에서 공종을 골라 자체 단가 입력.
 * 즐겨찾기 승격 / 수동 추가 / 삭제 지원.
 */
export default function OtherItemsEditor() {
  const { items, loading, save } = useOtherItems()
  const { favorites, save: saveFavorites } = useFavorites()
  const [buffer, setBuffer] = useState<OtherItemsMap>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [acdb, setAcdb] = useState<AcdbCandidate[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!loading) setBuffer({ ...items })
  }, [loading, items])

  useEffect(() => {
    void fetch('/api/settings/acdb-list')
      .then((r) => r.json())
      .then((j) => setAcdb(Array.isArray(j.entries) ? j.entries : []))
      .catch(() => setAcdb([]))
  }, [])

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as AcdbCandidate[]
    const existing = new Set(Object.keys(buffer))
    return acdb
      .filter((a) => !existing.has(a.name) && a.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, acdb, buffer])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function addFromAcdb(c: AcdbCandidate) {
    setBuffer((prev) => ({
      ...prev,
      [c.name]: { ...emptyOtherItem(), unit: c.unit },
    }))
    setDirty(true)
    setQuery('')
  }

  function addManual() {
    const name = window.prompt('공종명')?.trim()
    if (!name) return
    if (buffer[name]) {
      showToast('이미 존재하는 공종')
      return
    }
    setBuffer((prev) => ({ ...prev, [name]: emptyOtherItem() }))
    setDirty(true)
  }

  function update(name: string, patch: Partial<OtherItemEntry>) {
    setBuffer((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }))
    setDirty(true)
  }

  function remove(name: string) {
    setBuffer((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
    setDirty(true)
  }

  async function promote(name: string) {
    const entry = buffer[name]
    if (!entry) return
    const nextFav = cloneFavorites(favorites)
    if (nextFav.length === 0) nextFav.push({ label: '기타', chips: [] })
    nextFav[nextFav.length - 1].chips.push({
      name,
      label: name,
      unit: entry.unit,
      qty: 1,
      mat: entry.mat,
      labor: entry.labor,
      exp: entry.exp,
      is_equipment: false,
    })
    const nextOther = { ...buffer }
    delete nextOther[name]
    try {
      await saveFavorites(nextFav)
      await save(nextOther)
      setBuffer(nextOther)
      setDirty(false)
      showToast(`${name} → 즐겨찾기`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '승격 실패')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await save(buffer)
      setDirty(false)
      showToast('저장됨')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-8 text-center text-xs text-gray-400">로딩 중…</div>

  return (
    <div className="space-y-3">
      {/* acdb 셀렉터 + 수동 추가 */}
      <div className="relative flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="acdb 에서 공종 검색..."
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={addManual}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          + 수동 추가
        </button>
        {candidates.length > 0 && (
          <ul className="absolute left-0 right-20 top-full z-10 mt-1 max-h-60 overflow-auto rounded border border-gray-200 bg-white shadow-lg">
            {candidates.map((c) => (
              <li key={c.name}>
                <button
                  onClick={() => addFromAcdb(c)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-gray-50"
                >
                  <span className="text-gray-700">{c.name}</span>
                  <span className="text-gray-400">{c.unit}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <OtherItemsTable items={buffer} onUpdate={update} onRemove={remove} onPromote={promote} />

      <div className="flex items-center justify-end gap-2">
        {toast && (
          <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">{toast}</span>
        )}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="rounded bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}
