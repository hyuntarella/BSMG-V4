'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AcdbEntry, AcdbSearchResult } from '@/lib/acdb/types'
import { searchAcdb } from '@/lib/acdb/search'
import { fetchAllAcdb } from '@/lib/acdb/client'

interface UseAcdbSuggestOptions {
  companyId: string | null
  limit?: number
  debounceMs?: number
}

export function useAcdbSuggest({ companyId, limit = 10, debounceMs = 150 }: UseAcdbSuggestOptions) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AcdbSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const cacheRef = useRef<AcdbEntry[]>([])
  const loadedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 페이지 진입 시 1회 전체 로드
  useEffect(() => {
    if (!companyId || loadedRef.current) return
    let cancelled = false

    setIsLoading(true)
    fetchAllAcdb(companyId)
      .then(entries => {
        if (!cancelled) {
          cacheRef.current = entries
          loadedRef.current = true
          if (entries.length === 0) console.warn('[acdb] 로드 완료: 항목 0건 — acdb_entries 테이블에 데이터가 없습니다')
        }
      })
      .catch((err) => { console.warn('[acdb] 로드 실패 (DB 미적용 또는 데이터 없음):', err?.message) })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [companyId])

  // debounce 검색
  const search = useCallback((q: string) => {
    setQuery(q)

    if (timerRef.current) clearTimeout(timerRef.current)

    if (!q.trim()) {
      setResults([])
      return
    }

    timerRef.current = setTimeout(() => {
      const found = searchAcdb(cacheRef.current, q, limit)
      setResults(found)
    }, debounceMs)
  }, [limit, debounceMs])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  return { query, results, isLoading, search, clear, cache: cacheRef }
}
