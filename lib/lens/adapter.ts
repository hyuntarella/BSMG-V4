// ── Lens ↔ v4 Estimate 변환 어댑터 ──

import type { Estimate, EstimateSheet } from '@/lib/estimate/types';
import type { QuoteInput, QuoteOutput } from '@/lib/lens/types';

/**
 * Lens QuoteInput → v4 Estimate 초기 상태
 * 복합 Sheet + 우레탄 Sheet 2개 생성
 */
export function lensInputToEstimate(input: QuoteInput): Estimate {
  const compositeSheet: EstimateSheet = {
    type: '복합',
    title: '복합방수',
    price_per_pyeong: 0,
    warranty_years: 0,
    warranty_bond: 0,
    grand_total: 0,
    sort_order: 0,
    items: [],
  };

  const urethaneSheet: EstimateSheet = {
    type: '우레탄',
    title: '우레탄방수',
    price_per_pyeong: 0,
    warranty_years: 0,
    warranty_bond: 0,
    grand_total: 0,
    sort_order: 1,
    items: [],
  };

  return {
    status: 'draft',
    date: new Date().toISOString().slice(0, 10),
    customer_name: input.customerName,
    site_name: input.siteAddress,
    m2: input.areaM2,
    wall_m2: 0,
    manager_name: input.salesPersonName,
    memo: input.notes ?? undefined,
    sheets: [compositeSheet, urethaneSheet],
    sync_urethane: false,
    external_quote_id: input.quoteId,
    external_customer_id: input.customerId,
    source: 'lens',
    input_mode: 'form',
  };
}

/**
 * v4 Estimate → Lens QuoteOutput
 */
export function estimateToLensOutput(
  estimate: Estimate,
  urls: {
    compositeDocUrl: string;
    compositeDocHash: string;
    urethaneDocUrl: string;
    urethaneDocHash: string;
    jsonUrl: string;
    excelUrl: string;
  },
): QuoteOutput {
  const compositeSheet = estimate.sheets.find((s) => s.type === '복합');
  const urethaneSheet = estimate.sheets.find((s) => s.type === '우레탄');

  const compositeTotal = compositeSheet?.grand_total ?? 0;
  const urethaneTotal = urethaneSheet?.grand_total ?? 0;

  const m2 = estimate.m2 || 1; // 0으로 나누기 방지

  return {
    quoteId: estimate.external_quote_id ?? '',
    compositeDocumentUrl: urls.compositeDocUrl,
    compositeDocumentHash: urls.compositeDocHash,
    compositeTotalAmount: compositeTotal,
    compositeVatAmount: Math.round(compositeTotal * 0.1),
    compositeGrandTotal: compositeTotal + Math.round(compositeTotal * 0.1),
    compositePricePerM2: Math.round(compositeTotal / m2),
    urethaneDocumentUrl: urls.urethaneDocUrl,
    urethaneDocumentHash: urls.urethaneDocHash,
    urethaneTotalAmount: urethaneTotal,
    urethaneVatAmount: Math.round(urethaneTotal * 0.1),
    urethaneGrandTotal: urethaneTotal + Math.round(urethaneTotal * 0.1),
    urethanePricePerM2: Math.round(urethaneTotal / m2),
    generatedAt: new Date().toISOString(),
    inputMode: estimate.input_mode === 'voice' ? 'voice' : 'form',
    jsonUrl: urls.jsonUrl,
    excelUrl: urls.excelUrl,
  };
}
