import { describe, it, expect } from 'vitest';
import { lensInputToEstimate, estimateToLensOutput } from '@/lib/lens/adapter';
import type { QuoteInput } from '@/lib/lens/types';
import type { Estimate } from '@/lib/estimate/types';

const sampleInput: QuoteInput = {
  quoteId: 'lens-q-001',
  customerId: 'cust-001',
  customerName: '홍길동',
  customerPhone: '010-1234-5678',
  siteAddress: '서울시 강남구 역삼동 123',
  buildingType: '아파트',
  visitDate: '2026-04-15',
  salesPersonId: 'sp-001',
  salesPersonName: '김영업',
  areaM2: 200,
  areaPyeong: 60.5,
  notes: '옥상 누수 심함',
};

describe('Lens Adapter — lensInputToEstimate', () => {
  it('필수 필드가 올바르게 매핑된다', () => {
    const estimate = lensInputToEstimate(sampleInput);

    expect(estimate.status).toBe('draft');
    expect(estimate.source).toBe('lens');
    expect(estimate.external_quote_id).toBe('lens-q-001');
    expect(estimate.external_customer_id).toBe('cust-001');
    expect(estimate.customer_name).toBe('홍길동');
    expect(estimate.site_name).toBe('서울시 강남구 역삼동 123');
    expect(estimate.m2).toBe(200);
    expect(estimate.wall_m2).toBe(0);
    expect(estimate.manager_name).toBe('김영업');
    expect(estimate.memo).toBe('옥상 누수 심함');
  });

  it('sheets 2개 생성 (복합 sort_order:0, 우레탄 sort_order:1)', () => {
    const estimate = lensInputToEstimate(sampleInput);

    expect(estimate.sheets).toHaveLength(2);
    expect(estimate.sheets[0].type).toBe('복합');
    expect(estimate.sheets[0].sort_order).toBe(0);
    expect(estimate.sheets[0].items).toEqual([]);
    expect(estimate.sheets[0].price_per_pyeong).toBe(0);
    expect(estimate.sheets[0].grand_total).toBe(0);

    expect(estimate.sheets[1].type).toBe('우레탄');
    expect(estimate.sheets[1].sort_order).toBe(1);
    expect(estimate.sheets[1].items).toEqual([]);
  });
});

describe('Lens Adapter — estimateToLensOutput', () => {
  const baseEstimate: Estimate = {
    status: 'saved',
    date: '2026-04-10',
    m2: 200,
    wall_m2: 0,
    external_quote_id: 'lens-q-001',
    source: 'lens',
    input_mode: 'form',
    sheets: [
      {
        type: '복합',
        price_per_pyeong: 35000,
        warranty_years: 5,
        warranty_bond: 0,
        grand_total: 5000000,
        sort_order: 0,
        items: [],
      },
      {
        type: '우레탄',
        price_per_pyeong: 30000,
        warranty_years: 3,
        warranty_bond: 0,
        grand_total: 4000000,
        sort_order: 1,
        items: [],
      },
    ],
  };

  const urls = {
    compositeDocUrl: '/doc/composite.pdf',
    compositeDocHash: 'hash-c',
    urethaneDocUrl: '/doc/urethane.pdf',
    urethaneDocHash: 'hash-u',
    jsonUrl: '/data.json',
    excelUrl: '/data.xlsx',
  };

  it('금액이 올바르게 매핑된다', () => {
    const output = estimateToLensOutput(baseEstimate, urls);

    expect(output.quoteId).toBe('lens-q-001');
    expect(output.compositeTotalAmount).toBe(5000000);
    expect(output.urethaneTotalAmount).toBe(4000000);
    expect(output.compositeDocumentUrl).toBe('/doc/composite.pdf');
    expect(output.urethaneDocumentUrl).toBe('/doc/urethane.pdf');
    expect(output.compositePricePerM2).toBe(25000); // 5000000 / 200
    expect(output.urethanePricePerM2).toBe(20000); // 4000000 / 200
    expect(output.inputMode).toBe('form');
  });

  it('VAT = grandTotal * 0.1 올바르게 계산된다', () => {
    const output = estimateToLensOutput(baseEstimate, urls);

    expect(output.compositeVatAmount).toBe(500000); // 5000000 * 0.1
    expect(output.compositeGrandTotal).toBe(5500000); // 5000000 + 500000
    expect(output.urethaneVatAmount).toBe(400000); // 4000000 * 0.1
    expect(output.urethaneGrandTotal).toBe(4400000); // 4000000 + 400000
  });
});
