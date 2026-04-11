/**
 * P값 시드 변환 + getPD 호출 테스트
 *
 * #10 이후: 장비 4개(사다리차/스카이차/폐기물처리/드라이비트)는 BASE에서 제거되어
 *   - 복합 8개, 우레탄 7개 항목으로 축소.
 *   - 장비는 옵션/빠른추가 칩을 통해 동적으로 행 추가.
 */
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { getPD } from '@/lib/estimate/priceData'
import type { PriceMatrixRaw } from '@/lib/estimate/types'

// 변환된 seed JSON 로드
const seedPath = resolve(__dirname, '..', '..', 'supabase', 'price_matrix_pvalue_seed.json')
const seed: PriceMatrixRaw = JSON.parse(readFileSync(seedPath, 'utf-8'))

describe('P값 시드 변환 검증', () => {
  test('샘플 1: 100~200평/복합/32000 — 바탕정리 단가 [300, 700, 0]', () => {
    const items = seed['100~200평']?.['복합']?.['32000']
    expect(items).toBeDefined()
    expect(items![0]).toEqual([300, 700, 0])
  })

  test('샘플 2: 100~200평/복합/32000 — 복합시트 단가 [8800, 5000, 300]', () => {
    const items = seed['100~200평']?.['복합']?.['32000']
    expect(items).toBeDefined()
    expect(items![3]).toEqual([8800, 5000, 300])
  })

  test('샘플 3: 50~100평/우레탄/31000 — 7개 항목, 바탕정리 존재', () => {
    const items = seed['50~100평']?.['우레탄']?.['31000']
    expect(items).toBeDefined()
    expect(items!.length).toBe(7)
    // 바탕정리(index 0)는 mat > 0 or labor > 0
    expect(items![0][0] + items![0][1]).toBeGreaterThan(0)
  })

  test('복합은 8개 항목, 우레탄은 7개 항목 (장비 BASE에서 제외)', () => {
    for (const area of Object.keys(seed)) {
      for (const method of Object.keys(seed[area])) {
        for (const price of Object.keys(seed[area][method])) {
          const items = seed[area][method][price]
          const expected = method === '복합' ? 8 : 7
          expect(items.length).toBe(expected)
        }
      }
    }
  })

  test('lump template (price=0) 행이 없음', () => {
    for (const area of Object.keys(seed)) {
      for (const method of Object.keys(seed[area])) {
        const prices = Object.keys(seed[area][method])
        expect(prices).not.toContain('0')
      }
    }
  })

  test('면적대 4개: 50평미만, 50~100평, 100~200평, 200평이상', () => {
    const areas = Object.keys(seed).sort()
    expect(areas).toEqual(['100~200평', '200평이상', '50~100평', '50평미만'])
  })
})

describe('getPD 호출 테스트 (P값 시드 데이터)', () => {
  test('정확 일치: 100~200평/복합/32000 (복합은 8개)', () => {
    const result = getPD(seed, '100~200평', '복합', 32000)
    expect(result.length).toBe(8)
    expect(result[0]).toEqual([300, 700, 0])
  })

  test('보간: 100~200평/복합/32500 (32000~33000 사이)', () => {
    const result = getPD(seed, '100~200평', '복합', 32500)
    expect(result.length).toBe(8)
    // 바탕정리는 32000/33000 모두 [300, 700, 0]이므로 보간 후에도 동일
    expect(result[0]).toEqual([300, 700, 0])
  })

  test('범위 밖(하한): 100~200평/복합/30000 → 최저 가격 사용', () => {
    const result = getPD(seed, '100~200평', '복합', 30000)
    expect(result.length).toBe(8)
    // 최저가 32000의 데이터 반환
    expect(result[0]).toEqual([300, 700, 0])
  })

  test('데이터 없는 면적대: 20평이하 → 기본값 [0,0,0]×8 (복합 BASE 길이)', () => {
    const result = getPD(seed, '20평이하', '복합', 48000)
    expect(result.length).toBe(8)
    expect(result[0]).toEqual([0, 0, 0])
  })
})
