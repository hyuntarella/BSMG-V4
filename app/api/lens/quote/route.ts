// ── POST /api/lens/quote ──
// Lens 연동: 견적 생성 (idempotent)

import { NextResponse } from 'next/server';
import { validateLensRequest } from '@/lib/lens/auth';
import { lensInputToEstimate } from '@/lib/lens/adapter';
import type { QuoteInput } from '@/lib/lens/types';
import { createClient } from '@/lib/supabase/server';

const REQUIRED_FIELDS: (keyof QuoteInput)[] = [
  'quoteId',
  'customerId',
  'customerName',
  'customerPhone',
  'siteAddress',
  'visitDate',
  'salesPersonId',
  'salesPersonName',
  'areaM2',
];

export async function POST(request: Request) {
  try {
    const body = await request.text();

    // HMAC 검증
    const auth = validateLensRequest(request.headers, body);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const input: QuoteInput = JSON.parse(body);

    // 필수 필드 검증
    const missing = REQUIRED_FIELDS.filter((f) => {
      const val = input[f];
      return val === undefined || val === null || val === '';
    });
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `필수 필드 누락: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    const supabase = createClient();
    const companyId = process.env.LENS_DEFAULT_COMPANY_ID;

    if (!companyId) {
      return NextResponse.json(
        { error: 'LENS_DEFAULT_COMPANY_ID 미설정' },
        { status: 500 },
      );
    }

    // Idempotency: 이미 존재하는 quoteId인지 확인
    const { data: existing } = await supabase
      .from('estimates')
      .select('id, external_quote_id')
      .eq('external_quote_id', input.quoteId)
      .eq('company_id', companyId)
      .limit(1)
      .single();

    if (existing) {
      const editUrl = `/estimate/edit?source=lens&quoteId=${input.quoteId}`;
      return NextResponse.json(
        { quoteId: input.quoteId, editUrl, status: 'draft' },
        { status: 200 },
      );
    }

    // Estimate 생성
    const estimate = lensInputToEstimate(input);
    estimate.company_id = companyId;

    const { sheets, ...estimateMeta } = estimate;

    const { data: inserted, error: insertError } = await supabase
      .from('estimates')
      .insert(estimateMeta)
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('[POST /api/lens/quote] insert error:', insertError);
      return NextResponse.json({ error: '견적 생성 실패' }, { status: 500 });
    }

    // Sheets 생성
    const sheetRows = sheets.map((sheet) => ({
      estimate_id: inserted.id,
      type: sheet.type,
      title: sheet.title,
      price_per_pyeong: sheet.price_per_pyeong,
      warranty_years: sheet.warranty_years,
      warranty_bond: sheet.warranty_bond,
      grand_total: sheet.grand_total,
      sort_order: sheet.sort_order,
      is_free_mode: sheet.is_free_mode ?? false,
    }));

    const { error: sheetError } = await supabase
      .from('estimate_sheets')
      .insert(sheetRows);

    if (sheetError) {
      console.error('[POST /api/lens/quote] sheet insert error:', sheetError);
    }

    const editUrl = `/estimate/edit?source=lens&quoteId=${input.quoteId}`;

    return NextResponse.json(
      { quoteId: input.quoteId, editUrl, status: 'draft' },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/lens/quote]', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
