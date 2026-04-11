'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * cost_config.new_items — 견적서 저장 시 규칙서에 없던 공종이 자동 등록되는 버킷.
 * 사용자는 즐겨찾기/기타로 승격 또는 삭제할 수 있다.
 */
export interface NewItemEntry {
  unit: string
  mat: number
  labor: number
  exp: number
  registered_at: string
}

export type NewItemsMap = Record<string, NewItemEntry>

export function emptyNewItem(): NewItemEntry {
  return {
    unit: 'm²',
    mat: 0,
    labor: 0,
    exp: 0,
    registered_at: new Date().toISOString(),
  }
}

export function useNewItems() {
  const [items, setItems] = useState<NewItemsMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/cost-config')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '로드 실패')
      const raw = (json.config ?? {}).new_items
      setItems(raw && typeof raw === 'object' ? (raw as NewItemsMap) : {})
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
      setItems({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(async (next: NewItemsMap) => {
    const res = await fetch('/api/settings/cost-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'new_items', value: next }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? '저장 실패')
    setItems(next)
  }, [])

  return { items, loading, error, reload, save }
}
