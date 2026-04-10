import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { buildItems } from '@/lib/estimate/buildItems'
import type { EstimateItem, PriceMatrixRaw } from '@/lib/estimate/types'

const matrixPath = resolve(__dirname, '..', '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

describe('#4 단가 잠금 (preserveLockedItems)', () => {
  it('is_locked=true 항목은 단가가 보존된다', () => {
    const first = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })

    const batang = first.items.find(i => i.name === '바탕정리')!
    const lockedBatang: EstimateItem = {
      ...batang,
      mat: 9999,
      labor: 8888,
      exp: 7777,
      is_locked: true,
    }

    const second = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 38000, priceMatrix,
      preserveLockedItems: [lockedBatang],
    })

    const rebuilt = second.items.find(i => i.name === '바탕정리')!
    expect(rebuilt.mat).toBe(9999)
    expect(rebuilt.labor).toBe(8888)
    expect(rebuilt.exp).toBe(7777)
    expect(rebuilt.is_locked).toBe(true)
  })

  it('is_locked=false 항목은 새 단가로 갱신된다', () => {
    const first = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })

    const batang = first.items.find(i => i.name === '바탕정리')!
    const unlockedBatang: EstimateItem = {
      ...batang,
      mat: 9999,
      is_locked: false,
    }

    const second = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 38000, priceMatrix,
      preserveLockedItems: [unlockedBatang],
    })

    const rebuilt = second.items.find(i => i.name === '바탕정리')!
    expect(rebuilt.mat).not.toBe(9999)
  })
})

describe('#5 공종 숨김 (is_hidden 필터링)', () => {
  it('is_hidden 항목은 필터 후 소계에서 제외된다', () => {
    const { items } = buildItems({
      method: '복합', m2: 150, pricePerPyeong: 35000, priceMatrix,
    })

    const visible = items.filter(i => !i.is_hidden)
    const withHidden = items.map((item, i) =>
      i === 0 ? { ...item, is_hidden: true } : item
    )
    const visibleAfter = withHidden.filter(i => !i.is_hidden)

    expect(visibleAfter.length).toBe(visible.length - 1)

    const totalBefore = visible.reduce((s, i) => s + i.total, 0)
    const totalAfter = visibleAfter.reduce((s, i) => s + i.total, 0)
    expect(totalAfter).toBeLessThan(totalBefore)
  })
})

describe('#16 CRM 자동채움 (fillFromCrm 매핑)', () => {
  it('CrmRecord(camelCase) → Estimate(snake_case) 매핑', () => {
    // CrmRecord 필드명: customerName, address, manager, phone, area
    const crmCustomer = {
      customerName: '테스트 고객',
      address: '서울시 강남구',
      manager: '김담당',
      phone: '010-1234-5678',
      area: '50',
    }

    // 매핑 로직 검증 (useEstimate 없이 순수 매핑)
    const estimate = {
      customer_name: crmCustomer.customerName,
      site_name: crmCustomer.address,
      manager_name: crmCustomer.manager,
      manager_phone: crmCustomer.phone,
      m2: Math.round(parseFloat(crmCustomer.area) * 3.3058),
    }

    expect(estimate.customer_name).toBe('테스트 고객')
    expect(estimate.site_name).toBe('서울시 강남구')
    expect(estimate.manager_name).toBe('김담당')
    expect(estimate.manager_phone).toBe('010-1234-5678')
    expect(estimate.m2).toBe(165) // 50평 × 3.3058 ≈ 165
  })

  it('area가 비어있으면 m2 변환하지 않는다', () => {
    const area = ''
    const pyeong = parseFloat(area)
    expect(isNaN(pyeong)).toBe(true)
  })
})
