'use client'

import { useCallback, useEffect, useState } from 'react'
import type { QuickChipCategory } from '@/lib/estimate/quickChipConfig'
import { resolveFavorites } from '@/lib/estimate/favorites'

/**
 * cost_config.favorites 로드 훅.
 *
 * - QuickAddChips: 읽기 전용 (favorites 만 사용)
 * - FavoritesEditor: save() 로 쓰기 (로컬 상태는 별도 편집 버퍼에서 관리)
 *
 * 로드 실패 / 빈값이면 하드코딩 기본값(QUICK_CHIP_CATEGORIES) 반환.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<QuickChipCategory[]>(() => resolveFavorites(null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/cost-config')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '로드 실패')
      const favs = resolveFavorites((json.config ?? {}).favorites)
      setFavorites(favs)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(msg)
      // 오류 시에도 하드코딩 fallback 유지
      setFavorites(resolveFavorites(null))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (next: QuickChipCategory[]) => {
      const res = await fetch('/api/settings/cost-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'favorites', value: next }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '저장 실패')
      setFavorites(next)
    },
    [],
  )

  return { favorites, loading, error, reload, save }
}
