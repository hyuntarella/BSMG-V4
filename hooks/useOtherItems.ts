'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * cost_config.other_items — acdb 기반 사용자 단가 공종.
 * 칩에 없는 공종들의 자체 단가를 저장한다.
 */
export interface OtherItemEntry {
  unit: string
  mat: number
  labor: number
  exp: number
  category: string
}

export type OtherItemsMap = Record<string, OtherItemEntry>

export function emptyOtherItem(): OtherItemEntry {
  return { unit: 'm²', mat: 0, labor: 0, exp: 0, category: '' }
}

export function useOtherItems() {
  const [items, setItems] = useState<OtherItemsMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/cost-config')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '로드 실패')
      const raw = (json.config ?? {}).other_items
      setItems(raw && typeof raw === 'object' ? (raw as OtherItemsMap) : {})
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

  const save = useCallback(async (next: OtherItemsMap) => {
    const res = await fetch('/api/settings/cost-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'other_items', value: next }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? '저장 실패')
    setItems(next)
  }, [])

  return { items, loading, error, reload, save }
}
