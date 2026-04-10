import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { Estimate, EstimateSheet, PriceMatrixRaw } from '@/lib/estimate/types'
import { buildItems } from '@/lib/estimate/buildItems'
import { generateJson, getExcelFileName, getPdfFileName } from '@/lib/estimate/fileExport'

const matrixPath = resolve(__dirname, '..', '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

function makeEstimate(overrides?: Partial<Estimate>): Estimate {
  const complexBuild = buildItems({ method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix })
  const urethaneBuild = buildItems({ method: '우레탄', m2: 150, pricePerPyeong: 30000, priceMatrix })

  const complexSheet: EstimateSheet = {
    type: '복합',
    title: '복합방수',
    price_per_pyeong: 35000,
    warranty_years: 5,
    warranty_bond: 3,
    grand_total: complexBuild.calcResult.grandTotal,
    sort_order: 0,
    items: complexBuild.items,
  }

  const urethaneSheet: EstimateSheet = {
    type: '우레탄',
    title: '우레탄방수',
    price_per_pyeong: 30000,
    warranty_years: 5,
    warranty_bond: 3,
    grand_total: urethaneBuild.calcResult.grandTotal,
    sort_order: 1,
    items: urethaneBuild.items,
  }

  return {
    status: 'draft',
    date: '2026-04-09',
    customer_name: '홍길동',
    site_name: '강남아파트 옥상',
    m2: 150,
    wall_m2: 0,
    mgmt_no: 'BSM-2026-001',
    sheets: [complexSheet, urethaneSheet],
    ...overrides,
  }
}

describe('generateJson', () => {
  it('Estimate → JSON 문자열 → 파싱 → 원본 필드 보존', () => {
    const est = makeEstimate()
    const jsonStr = generateJson(est)
    const parsed = JSON.parse(jsonStr)

    expect(parsed.version).toBe('4.0')
    expect(parsed.exportedAt).toBeTruthy()
    expect(parsed.estimate.customer_name).toBe('홍길동')
    expect(parsed.estimate.sheets).toHaveLength(2)
    expect(parsed.estimate.sheets[0].type).toBe('복합')
    expect(parsed.estimate.sheets[1].type).toBe('우레탄')
  })

  it('시트 아이템이 올바르게 직렬화된다', () => {
    const est = makeEstimate()
    const jsonStr = generateJson(est)
    const parsed = JSON.parse(jsonStr)

    const items = parsed.estimate.sheets[0].items
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toHaveProperty('name')
    expect(items[0]).toHaveProperty('mat')
    expect(items[0]).toHaveProperty('total')
  })
})

describe('getExcelFileName', () => {
  it('기본 케이스: 날짜_고객_공사_복합{k}_우레탄{k}.xlsx', () => {
    const est = makeEstimate()
    const name = getExcelFileName(est)
    expect(name).toBe('2026-04-09_홍길동_강남아파트 옥상_복합35k_우레탄30k.xlsx')
  })

  it('특수문자 제거 (/ \\ : * ? " < > |)', () => {
    const est = makeEstimate({
      customer_name: '홍길동/대표',
      site_name: '강남*아파트',
    })
    const name = getExcelFileName(est)
    expect(name).not.toContain('/')
    expect(name).not.toContain('*')
    expect(name).toContain('홍길동대표')
    expect(name).toContain('강남아파트')
  })

  it('평단가 0 → "0k" 처리', () => {
    const est = makeEstimate()
    est.sheets = [est.sheets[0]] // 복합만
    // 우레탄 시트 없음 → 우레탄 0k
    const name = getExcelFileName(est)
    expect(name).toContain('우레탄0k')
  })

  it('고객명/공사명 미지정 시 기본값', () => {
    const est = makeEstimate({ customer_name: undefined, site_name: undefined })
    const name = getExcelFileName(est)
    expect(name).toContain('미지정')
    expect(name).toContain('방수공사')
  })
})

describe('getPdfFileName', () => {
  it('복합 PDF 파일명', () => {
    const est = makeEstimate()
    const name = getPdfFileName(est, '복합')
    expect(name).toBe('2026-04-09_홍길동_강남아파트 옥상_복합35k.pdf')
  })

  it('우레탄 PDF 파일명', () => {
    const est = makeEstimate()
    const name = getPdfFileName(est, '우레탄')
    expect(name).toBe('2026-04-09_홍길동_강남아파트 옥상_우레탄30k.pdf')
  })
})
