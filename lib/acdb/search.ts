import { AcdbEntry, AcdbSearchResult } from './types'
import { toChosung } from './canonical'

function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

export function searchAcdb(
  entries: AcdbEntry[],
  query: string,
  limit = 20
): AcdbSearchResult[] {
  const q = normalize(query)
  if (!q) return []

  const qChosung = toChosung(query.replace(/\s/g, ''))
  const isAllChosung = /^[ㄱ-ㅎ]+$/.test(qChosung) && qChosung.length >= 2
  const results: AcdbSearchResult[] = []

  for (const entry of entries) {
    const canonLower = entry.canon.toLowerCase()

    let match: AcdbSearchResult['matchType'] | null = null
    let score = 0

    if (canonLower === q) {
      match = 'exact'; score = 1000
    } else if (canonLower.startsWith(q)) {
      match = 'prefix'; score = 500
    } else if (canonLower.includes(q)) {
      match = 'contains'; score = 200
    } else if (isAllChosung && toChosung(entry.canon).startsWith(qChosung)) {
      match = 'chosung'; score = 100
    } else if (entry.aliases.some(a => normalize(a).includes(q))) {
      match = 'alias'; score = 50
    }

    if (match) {
      score += Math.log2(entry.used_count + 1) * 10
      results.push({ entry, matchType: match, score })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}
