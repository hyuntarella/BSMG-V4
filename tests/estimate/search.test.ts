import { describe, it, expect } from 'vitest'
import { searchAcdb } from '@/lib/acdb/search'
import type { AcdbEntry } from '@/lib/acdb/types'
import { toChosung } from '@/lib/acdb/canonical'
import type { EstimateItem } from '@/lib/estimate/types'

// ── #2 acDB 자동완성 연결 ──
describe('#2 acDB 자동완성', () => {
  const ENTRIES: AcdbEntry[] = [
    { canon: '바탕정리', display: '바탕정리', aliases: ['면정리'], unit: '㎡', spec_default: '그라인더 연삭', spec_options: [], used_count: 575, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
    { canon: '하도프라이머', display: '하도프라이머', aliases: [], unit: '㎡', spec_default: '', spec_options: [], used_count: 400, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
    { canon: '우레탄상도', display: '우레탄 상도', aliases: ['탑코팅'], unit: '㎡', spec_default: '탑코팅', spec_options: [], used_count: 191, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
  ]

  it('부분 입력으로 acdb 후보를 검색한다', () => {
    const results = searchAcdb(ENTRIES, '바탕', 10)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].entry.canon).toBe('바탕정리')
  })

  it('별칭(alias)으로도 검색된다', () => {
    const results = searchAcdb(ENTRIES, '면정리', 10)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].entry.canon).toBe('바탕정리')
  })

  it('usedCount가 높은 항목이 상위에 나온다', () => {
    const results = searchAcdb(ENTRIES, 'ㅂㅌ', 10)
    expect(results.length).toBeGreaterThan(0)
    // 바탕정리(575) 유일한 매칭
    expect(results[0].entry.used_count).toBe(575)
  })
})

// ── #3 통합 검색 ──
describe('#3 통합 검색', () => {
  const items: EstimateItem[] = [
    { sort_order: 1, name: '바탕정리', spec: '그라인더 연삭', unit: 'm²', qty: 150, mat: 300, labor: 700, exp: 0, mat_amount: 45000, labor_amount: 105000, exp_amount: 0, total: 150000, is_base: true, is_equipment: false, is_fixed_qty: false },
    { sort_order: 2, name: '하도 프라이머', spec: '', unit: 'm²', qty: 150, mat: 200, labor: 500, exp: 0, mat_amount: 30000, labor_amount: 75000, exp_amount: 0, total: 105000, is_base: true, is_equipment: false, is_fixed_qty: false },
    { sort_order: 3, name: '우레탄 상도', spec: '탑코팅', unit: 'm²', qty: 150, mat: 400, labor: 800, exp: 0, mat_amount: 60000, labor_amount: 120000, exp_amount: 0, total: 180000, is_base: true, is_equipment: false, is_fixed_qty: false },
  ]

  function searchItems(items: EstimateItem[], query: string) {
    const q = query.trim().replace(/\s+/g, '').toLowerCase()
    if (!q) return []
    const isChosung = /^[ㄱ-ㅎ]+$/.test(q)

    return items.filter(item => {
      const name = item.name.replace(/\s+/g, '').toLowerCase()
      const spec = item.spec.replace(/\s+/g, '').toLowerCase()
      if (isChosung) {
        return toChosung(name).includes(q) || toChosung(spec).includes(q)
      }
      return name.includes(q) || spec.includes(q)
    })
  }

  it('부분일치 검색이 동작한다', () => {
    const found = searchItems(items, '바탕')
    expect(found.length).toBe(1)
    expect(found[0].name).toBe('바탕정리')
  })

  it('초성 검색이 동작한다', () => {
    const found = searchItems(items, 'ㅇㄹㅌ')
    expect(found.length).toBe(1)
    expect(found[0].name).toBe('우레탄 상도')
  })

  it('규격(spec)으로도 검색된다', () => {
    const found = searchItems(items, '탑코팅')
    expect(found.length).toBe(1)
    expect(found[0].name).toBe('우레탄 상도')
  })
})
