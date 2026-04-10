'use client'

import { useState, useMemo, useCallback } from 'react'
import type { EstimateItem } from '@/lib/estimate/types'
import { toChosung } from '@/lib/acdb/canonical'

interface SearchResult {
  sheetIndex: number
  itemIndex: number
  item: EstimateItem
  matchField: 'name' | 'spec' | 'unit'
}

export function useEstimateSearch(sheets: { items: EstimateItem[] }[]) {
  const [query, setQuery] = useState('')

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().replace(/\s+/g, '').toLowerCase()
    if (!q || q.length < 1) return []

    const isChosung = /^[ㄱ-ㅎ]+$/.test(q)
    const found: SearchResult[] = []

    for (let si = 0; si < sheets.length; si++) {
      const items = sheets[si].items
      for (let ii = 0; ii < items.length; ii++) {
        const item = items[ii]
        const fields: ('name' | 'spec' | 'unit')[] = ['name', 'spec', 'unit']

        for (const field of fields) {
          const val = item[field]?.toString().replace(/\s+/g, '').toLowerCase() ?? ''
          if (!val) continue

          let matched = false
          if (isChosung) {
            matched = toChosung(val).includes(q)
          } else {
            matched = val.includes(q)
          }

          if (matched) {
            found.push({ sheetIndex: si, itemIndex: ii, item, matchField: field })
            break // 한 항목당 1개 결과
          }
        }
      }
    }

    return found
  }, [sheets, query])

  const search = useCallback((q: string) => setQuery(q), [])
  const clear = useCallback(() => setQuery(''), [])

  return { query, results, search, clear }
}
