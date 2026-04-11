'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AcdbEntry, AcdbSearchResult } from '@/lib/acdb/types'
import { searchAcdb } from '@/lib/acdb/search'

interface UseAcdbSuggestOptions {
  /** 호출처 호환성을 위해 유지 — 내부 API 경로가 서버에서 기본 회사 ID 를 결정한다. */
  companyId: string | null
  limit?: number
  debounceMs?: number
}

/**
 * 견적서 품명 셀 자동완성 훅.
 *
 * 데이터 소스: `/api/acdb/list`
 *   - acdb_entries (서비스 롤 쿼리 → RLS/companyId 이슈 회피)
 *   - cost_config.favorites / other_items / new_items 병합 폴백
 *
 * 이전 구현은 클라이언트 supabase 로 acdb_entries 를 직접 조회해서
 * (a) RLS 로 차단되거나 (b) 테이블이 빈 상태면 조용히 실패했다.
 * API 프록시 + 폴백 병합으로 그 두 가지를 모두 해결.
 */
export function useAcdbSuggest({ limit = 10, debounceMs = 150 }: UseAcdbSuggestOptions) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AcdbSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const cacheRef = useRef<AcdbEntry[]>([])
  const loadedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 페이지 진입 시 1회 전체 로드
  useEffect(() => {
    if (loadedRef.current) return
    let cancelled = false

    setIsLoading(true)
    fetch('/api/acdb/list')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ entries: AcdbEntry[] }>
      })
      .then((json) => {
        if (cancelled) return
        const entries = Array.isArray(json.entries) ? json.entries : []
        cacheRef.current = entries
        loadedRef.current = true
        if (entries.length === 0) {
          console.warn('[acdb] 로드 완료: 항목 0건 — acdb_entries 및 cost_config 폴백 모두 비어있음')
        } else {
          console.log(`[acdb] 로드 완료: ${entries.length}건`)
        }
      })
      .catch((err) => {
        console.warn('[acdb] 로드 실패:', err?.message)
        cacheRef.current = []
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // debounce 검색
  const search = useCallback(
    (q: string) => {
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
    },
    [limit, debounceMs],
  )

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  return { query, results, isLoading, search, clear, cache: cacheRef }
}
