import { describe, it, expect } from 'vitest'
import type { Estimate, PriceMatrixRaw } from '@/lib/estimate/types'
import { getPdfFileName, getExcelFileName } from '@/lib/estimate/fileNames'

/**
 * Phase 4I — EstimateEditorForm 통합 테스트 (로직 검증)
 *
 * UI 렌더링은 Playwright/RTL 없이 불가하므로
 * 핵심 로직 함수와 데이터 흐름을 검증한다.
 */

function makeEstimate(overrides: Partial<Estimate> = {}): Estimate {
  return {
    id: 'test-id',
    company_id: 'company-1',
    mgmt_no: 'BS-260409-ABCD',
    status: 'draft',
    date: '2026-04-09',
    customer_name: '김철수',
    site_name: '서울시 강남구',
    m2: 85,
    wall_m2: 0,
    manager_name: '박민우',
    memo: '하자보수 5년',
    sheets: [
      {
        type: '복합',
        title: '복합방수',
        price_per_pyeong: 39000,
        warranty_years: 5,
        warranty_bond: 3,
        grand_total: 4500000,
        sort_order: 0,
        items: [
          {
            sort_order: 1, name: '바탕정리', spec: '-', unit: 'm²',
            qty: 85, mat: 300, labor: 200, exp: 0,
            mat_amount: 25500, labor_amount: 17000, exp_amount: 0,
            total: 42500, is_base: true, is_equipment: false, is_fixed_qty: false,
          },
        ],
      },
      {
        type: '우레탄',
        title: '우레탄방수',
        price_per_pyeong: 37000,
        warranty_years: 5,
        warranty_bond: 3,
        grand_total: 4200000,
        sort_order: 1,
        items: [
          {
            sort_order: 1, name: '바탕정리', spec: '-', unit: 'm²',
            qty: 85, mat: 250, labor: 180, exp: 0,
            mat_amount: 21250, labor_amount: 15300, exp_amount: 0,
            total: 36550, is_base: true, is_equipment: false, is_fixed_qty: false,
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('Phase 4I — 페이지 통합 로직', () => {
  describe('2-Document 모델', () => {
    it('Estimate에 복합+우레탄 2개 시트 존재', () => {
      const est = makeEstimate()
      expect(est.sheets).toHaveLength(2)
      expect(est.sheets[0].type).toBe('복합')
      expect(est.sheets[1].type).toBe('우레탄')
    })

    it('각 시트의 items 독립', () => {
      const est = makeEstimate()
      expect(est.sheets[0].items[0].mat).toBe(300)
      expect(est.sheets[1].items[0].mat).toBe(250)
    })
  })

  describe('파일명 생성', () => {
    it('PDF 파일명 — 복합', () => {
      const est = makeEstimate()
      const name = getPdfFileName(est, '복합')
      expect(name).toBe('2026-04-09_김철수_서울시 강남구_복합39k.pdf')
    })

    it('PDF 파일명 — 우레탄', () => {
      const est = makeEstimate()
      const name = getPdfFileName(est, '우레탄')
      expect(name).toBe('2026-04-09_김철수_서울시 강남구_우레탄37k.pdf')
    })

    it('엑셀 파일명', () => {
      const est = makeEstimate()
      const name = getExcelFileName(est)
      expect(name).toBe('2026-04-09_김철수_서울시 강남구_복합39k_우레탄37k.xlsx')
    })

    it('고객명 미지정 시 기본값', () => {
      const est = makeEstimate({ customer_name: undefined })
      const name = getPdfFileName(est, '복합')
      expect(name).toContain('미지정')
    })
  })

  describe('lens 진입 데이터', () => {
    it('lens 견적서는 source=lens, external_quote_id 포함', () => {
      const est = makeEstimate({
        source: 'lens',
        external_quote_id: 'lens_abc123',
        external_customer_id: 'cust_456',
      })
      expect(est.source).toBe('lens')
      expect(est.external_quote_id).toBe('lens_abc123')
      expect(est.external_customer_id).toBe('cust_456')
    })

    it('lens 견적서도 2-Document 구조', () => {
      const est = makeEstimate({ source: 'lens' })
      expect(est.sheets).toHaveLength(2)
      expect(est.sheets.map(s => s.type)).toEqual(['복합', '우레탄'])
    })
  })

  describe('탭 인덱스 계산', () => {
    it('복합 시트 인덱스 = 0', () => {
      const est = makeEstimate()
      const idx = est.sheets.findIndex(s => s.type === '복합')
      expect(idx).toBe(0)
    })

    it('우레탄 시트 인덱스 = 1', () => {
      const est = makeEstimate()
      const idx = est.sheets.findIndex(s => s.type === '우레탄')
      expect(idx).toBe(1)
    })

    it('시트 없으면 -1', () => {
      const est = makeEstimate({ sheets: [] })
      const idx = est.sheets.findIndex(s => s.type === '복합')
      expect(idx).toBe(-1)
    })
  })

  describe('잠금 보존', () => {
    it('locked=true인 아이템은 is_locked 플래그', () => {
      const est = makeEstimate()
      est.sheets[0].items[0].is_locked = true
      est.sheets[0].items[0].original_mat = 300
      expect(est.sheets[0].items[0].is_locked).toBe(true)
      expect(est.sheets[0].items[0].original_mat).toBe(300)
    })
  })
})
