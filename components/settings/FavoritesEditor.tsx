'use client'

import { useState, useEffect } from 'react'
import type { QuickChipCategory } from '@/lib/estimate/quickChipConfig'
import { useFavorites } from '@/hooks/useFavorites'
import { cloneFavorites, emptyCategory, emptyChip } from '@/lib/estimate/favorites'
import FavoriteChipTable from './FavoriteChipTable'

/**
 * 즐겨찾기 공종 편집기 (cost_config.favorites).
 *
 * 카테고리 추가/삭제/라벨 수정, 칩 추가/삭제/필드 수정.
 * 저장 시 QuickAddChips 에 즉시 반영.
 */
export default function FavoritesEditor() {
  const { favorites, loading, save } = useFavorites()
  const [buffer, setBuffer] = useState<QuickChipCategory[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) setBuffer(cloneFavorites(favorites))
  }, [loading, favorites])

  function mutate(fn: (draft: QuickChipCategory[]) => void) {
    const next = cloneFavorites(buffer)
    fn(next)
    setBuffer(next)
    setDirty(true)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
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

  if (loading) {
    return <div className="py-8 text-center text-xs text-gray-400">로딩 중…</div>
  }

  return (
    <div className="space-y-4">
      {buffer.map((cat, catIdx) => (
        <div key={catIdx} className="rounded-lg border border-gray-200 p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              value={cat.label}
              onChange={(e) =>
                mutate((d) => {
                  d[catIdx].label = e.target.value
                })
              }
              className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm font-semibold"
              placeholder="카테고리 라벨"
            />
            <button
              onClick={() =>
                mutate((d) => {
                  d[catIdx].chips.push(emptyChip())
                })
              }
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              + 칩
            </button>
            <button
              onClick={() =>
                mutate((d) => {
                  d.splice(catIdx, 1)
                })
              }
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              카테고리 삭제
            </button>
          </div>

          {cat.chips.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400">칩 없음</p>
          ) : (
            <FavoriteChipTable
              chips={cat.chips}
              onChange={(chips) =>
                mutate((d) => {
                  d[catIdx].chips = chips
                })
              }
            />
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            mutate((d) => {
              d.push(emptyCategory())
            })
          }
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          + 카테고리 추가
        </button>
        <div className="flex items-center gap-2">
          {toast && (
            <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">
              {toast}
            </span>
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
    </div>
  )
}
