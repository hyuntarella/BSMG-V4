'use client'

import { useEffect, useState } from 'react'
import { useNewItems, emptyNewItem, type NewItemEntry, type NewItemsMap } from '@/hooks/useNewItems'
import { useFavorites } from '@/hooks/useFavorites'
import { useOtherItems } from '@/hooks/useOtherItems'
import { cloneFavorites } from '@/lib/estimate/favorites'
import NewItemsTable from './NewItemsTable'

/**
 * 신규 공종 섹션 — 견적 저장 시 자동 등록된 공종.
 * 즐겨찾기/기타로 승격 또는 삭제, 수동 추가 가능.
 */
export default function NewItemsEditor() {
  const { items, loading, save } = useNewItems()
  const { favorites, save: saveFavorites } = useFavorites()
  const { items: otherItems, save: saveOther } = useOtherItems()
  const [buffer, setBuffer] = useState<NewItemsMap>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) setBuffer({ ...items })
  }, [loading, items])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function addManual() {
    const name = window.prompt('공종명')?.trim()
    if (!name) return
    if (buffer[name]) {
      showToast('이미 존재하는 공종')
      return
    }
    setBuffer((prev) => ({ ...prev, [name]: emptyNewItem() }))
    setDirty(true)
  }

  function update(name: string, patch: Partial<NewItemEntry>) {
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

  async function promoteToFavorites(name: string) {
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
    const nextNew = { ...buffer }
    delete nextNew[name]
    try {
      await saveFavorites(nextFav)
      await save(nextNew)
      setBuffer(nextNew)
      setDirty(false)
      showToast(`${name} → 즐겨찾기`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '승격 실패')
    }
  }

  async function promoteToOther(name: string) {
    const entry = buffer[name]
    if (!entry) return
    const nextOther = {
      ...otherItems,
      [name]: {
        unit: entry.unit,
        mat: entry.mat,
        labor: entry.labor,
        exp: entry.exp,
        category: '',
      },
    }
    const nextNew = { ...buffer }
    delete nextNew[name]
    try {
      await saveOther(nextOther)
      await save(nextNew)
      setBuffer(nextNew)
      setDirty(false)
      showToast(`${name} → 기타`)
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
      <div className="flex justify-end">
        <button
          onClick={addManual}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          + 수동 추가
        </button>
      </div>

      <NewItemsTable
        items={buffer}
        onUpdate={update}
        onRemove={remove}
        onPromoteFavorites={promoteToFavorites}
        onPromoteOther={promoteToOther}
      />

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
