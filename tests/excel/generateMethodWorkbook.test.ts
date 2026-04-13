/**
 * 회귀 가드 — c10 PM UAT 이슈 [1] (갑지 공사금액 0 표시)
 *
 * 원인: 샘플 스크립트가 `total: 0` 으로 EstimateItem 을 생성해
 *       calc(items) → grandTotal=0 → K14/K18=0, E11="일금 영원".
 *
 * 가드: 프로덕션 흐름에 맞게 it.total 을 채운 입력으로
 *       generateMethodWorkbook 호출 시 K14/K18/E11 이 grandTotal 을 반영해야 한다.
 *       ※ c11 (빈 행 15-17 제거) 적용 후에는 K15 가 합계가 됨 — 그 시점에 가드 갱신 예정.
 */
import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { generateMethodWorkbook } from '../../lib/excel/generateMethodWorkbook'
import { calc } from '../../lib/estimate/calc'
import type { Estimate, EstimateItem } from '../../lib/estimate/types'

function buildItem(overrides: Partial<EstimateItem> = {}): EstimateItem {
  const it: EstimateItem = {
    sort_order: 1,
    name: '프라이머 도포',
    spec: '3.8mm',
    unit: 'm²',
    qty: 100,
    mat: 15000,
    labor: 8000,
    exp: 2000,
    mat_amount: 0,
    labor_amount: 0,
    exp_amount: 0,
    total: 0,
    is_base: true,
    is_equipment: false,
    is_fixed_qty: false,
    ...overrides,
  }
  it.mat_amount = it.qty * it.mat
  it.labor_amount = it.qty * it.labor
  it.exp_amount = it.qty * it.exp
  it.total = it.mat_amount + it.labor_amount + it.exp_amount
  return it
}

function buildEstimate(items: EstimateItem[]): Estimate {
  return {
    status: 'draft',
    mgmt_no: 'TEST-0001',
    date: '2026-04-13',
    customer_name: '테스트',
    site_name: '테스트 현장',
    m2: 100,
    wall_m2: 0,
    memo: '',
    sheets: [
      {
        type: '복합',
        price_per_pyeong: 32000,
        warranty_years: 5,
        warranty_bond: 3,
        grand_total: 0,
        sort_order: 1,
        items,
      },
    ],
  }
}

describe('generateMethodWorkbook — 갑지 합계 회귀 가드', () => {
  it('K14/K18/E11 이 calc(items) 의 totalBeforeRound/grandTotal 을 반영한다', async () => {
    // 11개 = TEMPLATE_ZONE_SIZE 정확 매칭 — splice 회피.
    const items = Array.from({ length: 11 }, (_, i) =>
      buildItem({
        sort_order: i + 1,
        name: `공종 ${i + 1}`,
        qty: 100 + i * 5,
        mat: 12000 + i * 500,
        labor: 8000,
        exp: 2000,
      }),
    )
    const expected = calc(items)
    expect(expected.grandTotal).toBeGreaterThan(0)
    expect(expected.totalBeforeRound).toBeGreaterThan(0)

    const buf = await generateMethodWorkbook(buildEstimate(items), '복합')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as unknown as ArrayBuffer)
    const cover = wb.getWorksheet(1)!

    const k14 = cover.getCell('K14').value
    const k18 = cover.getCell('K18').value
    const e11 = String(cover.getCell('E11').value ?? '')

    expect(k14).toBe(expected.totalBeforeRound)
    expect(k18).toBe(expected.grandTotal)
    // 한글금액: "일금 ... 원정" 패턴, 0 이 아니어야 함
    expect(e11).toMatch(/일금/)
    expect(e11).not.toMatch(/영원/)
  })
})
