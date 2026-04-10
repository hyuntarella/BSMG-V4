import { describe, it, expect } from 'vitest'
import { searchAcdb } from '@/lib/acdb/search'
import { AcdbEntry } from '@/lib/acdb/types'

const SAMPLE: AcdbEntry[] = [
  { canon: '우레탄상도', display: '우레탄상도', aliases: [], unit: '㎡', spec_default: '탑코팅', spec_options: [], used_count: 191, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
  { canon: '하도프라이머', display: '하도프라이머', aliases: [], unit: '㎡', spec_default: '', spec_options: [], used_count: 190, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
  { canon: '노출우레탄', display: '노출우레탄', aliases: ['노출 우레탄'], unit: '㎡', spec_default: '', spec_options: [], used_count: 100, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
]

describe('searchAcdb', () => {
  it('exact match returns highest score', () => {
    const r = searchAcdb(SAMPLE, '우레탄상도')
    expect(r[0].matchType).toBe('exact')
    expect(r[0].entry.canon).toBe('우레탄상도')
  })

  it('prefix match works', () => {
    const r = searchAcdb(SAMPLE, '우레탄')
    expect(r[0].matchType).toBe('prefix')
  })

  it('contains match works', () => {
    const r = searchAcdb(SAMPLE, '노출')
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].entry.canon).toBe('노출우레탄')
  })

  it('chosung search works', () => {
    const r = searchAcdb(SAMPLE, 'ㅇㄹㅌ')
    expect(r.length).toBeGreaterThan(0)
  })

  it('alias search works', () => {
    const r = searchAcdb(SAMPLE, '노출 우레탄')
    expect(r.length).toBeGreaterThan(0)
  })

  it('used_count affects score ordering', () => {
    const r = searchAcdb(SAMPLE, '우레탄')
    // '우레탄상도' (used_count=191) prefix, '노출우레탄' (used_count=100) contains
    // prefix(500) + log2(192)*10 ≈ 575 > contains(200) + log2(101)*10 ≈ 267
    expect(r[0].entry.canon).toBe('우레탄상도')
    expect(r[1].entry.canon).toBe('노출우레탄')
    expect(r[0].score).toBeGreaterThan(r[1].score)
  })
})
