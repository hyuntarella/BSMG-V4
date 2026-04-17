import { describe, it, expect } from 'vitest'
import { calcDetailSheet } from '@/lib/estimate/pdf/detailCalc'
import type { DetailSheet, DetailItem, CalloutRow } from '@/lib/estimate/pdf/types'

function item(
  name: string,
  mat?: number,
  labor?: number,
  exp?: number,
): DetailItem {
  return {
    kind: 'item',
    name,
    material: mat !== undefined ? { amount: mat } : undefined,
    labor: labor !== undefined ? { amount: labor } : undefined,
    expense: exp !== undefined ? { amount: exp } : undefined,
  }
}

describe('calcDetailSheet', () => {
  it('Case 1 — 12.png 재현 (품목 12개)', () => {
    const sheet: DetailSheet = {
      constructionName: '복합방수',
      overheadRate: 0.03,
      profitRate: 0.06,
      pageNumber: '2/3',
      rows: [
        item('바탕정리', 216_000, 324_000),
        item('기존 바닥 돌뜸 부위 부분 제거', 100_000, 500_000, 200_000),
        item('바탕조정제 부분미장', 300_000, 800_000, 200_000),
        item('하도 프라이머', 297_000, 432_000),
        item('복합 시트', 2_970_000, 1_890_000, 135_000),
        item('포인트 실란트 보강포 부착', 486_000, 540_000),
        item('노출 우레탄', 2_430_000, 1_215_000, 135_000),
        item('우레탄 상도', 594_000, 486_000),
        item('사다리차', undefined, undefined, 150_000),
        item('실외기 하부 벽돌작업', 100_000, 300_000),
        item('폐기물 처리', undefined, undefined, 300_000),
        item('판넬도막방수', 600_000, 900_000, 300_000),
      ],
    }

    const r = calcDetailSheet(sheet)

    expect(r.subtotal.material).toBe(8_093_000)
    expect(r.subtotal.labor).toBe(7_387_000)
    expect(r.subtotal.expense).toBe(1_420_000)
    expect(r.subtotal.total).toBe(16_900_000)
    expect(r.overhead).toBe(507_000)
    expect(r.profit).toBe(1_014_000)
    expect(r.beforeRound).toBe(18_421_000)
    expect(r.grandTotal).toBe(18_400_000)
  })

  it('Case 2 — Callout 행은 합산에서 무시', () => {
    const callout: CalloutRow = {
      kind: 'callout',
      text: '※ 판넬도막방수는 하자보수기간 3년 적용됩니다',
      color: 'accent',
    }
    const sheet: DetailSheet = {
      constructionName: '테스트',
      overheadRate: 0.03,
      profitRate: 0.06,
      pageNumber: '1/1',
      rows: [
        item('A', 100_000, 200_000, 50_000),
        callout,
        item('B', 300_000, 400_000, 100_000),
      ],
    }

    const r = calcDetailSheet(sheet)

    expect(r.subtotal.material).toBe(400_000)
    expect(r.subtotal.labor).toBe(600_000)
    expect(r.subtotal.expense).toBe(150_000)
    expect(r.subtotal.total).toBe(1_150_000)
  })

  it('Case 3 — 컬럼 값 누락 혼재', () => {
    const sheet: DetailSheet = {
      constructionName: '테스트',
      overheadRate: 0.03,
      profitRate: 0.06,
      pageNumber: '1/1',
      rows: [
        item('재료만', 500_000),
        item('노무만', undefined, 300_000),
        item('전부', 200_000, 100_000, 50_000),
      ],
    }

    const r = calcDetailSheet(sheet)

    expect(r.subtotal.material).toBe(700_000)
    expect(r.subtotal.labor).toBe(400_000)
    expect(r.subtotal.expense).toBe(50_000)
    expect(r.subtotal.total).toBe(1_150_000)
  })
})
