// ── GET /api/lens/quote/[quoteId] ──
// Lens 연동: 견적 조회

import { NextResponse } from 'next/server';
import { validateLensRequest } from '@/lib/lens/auth';
import { estimateToLensOutput } from '@/lib/lens/adapter';
import type { Estimate, EstimateSheet, EstimateItem } from '@/lib/estimate/types';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { quoteId: string } },
) {
  try {
    // body가 없는 GET 요청이므로 빈 문자열로 검증
    const auth = validateLensRequest(request.headers, '');
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { quoteId } = params;
    const supabase = createClient();
    const companyId = process.env.LENS_DEFAULT_COMPANY_ID;

    if (!companyId) {
      return NextResponse.json(
        { error: 'LENS_DEFAULT_COMPANY_ID 미설정' },
        { status: 500 },
      );
    }

    // Estimate 조회
    const { data: est, error: estError } = await supabase
      .from('estimates')
      .select('*')
      .eq('external_quote_id', quoteId)
      .eq('company_id', companyId)
      .limit(1)
      .single();

    if (estError || !est) {
      return NextResponse.json(
        { error: `견적을 찾을 수 없습니다: ${quoteId}` },
        { status: 404 },
      );
    }

    // Sheets + Items 조회
    const { data: sheets } = await supabase
      .from('estimate_sheets')
      .select('*')
      .eq('estimate_id', est.id)
      .order('sort_order', { ascending: true });

    const sheetsWithItems: EstimateSheet[] = await Promise.all(
      (sheets ?? []).map(async (sheet) => {
        const { data: items } = await supabase
          .from('estimate_items')
          .select('*')
          .eq('sheet_id', sheet.id)
          .order('sort_order', { ascending: true });

        return {
          ...sheet,
          items: (items ?? []) as EstimateItem[],
        } as EstimateSheet;
      }),
    );

    const estimate: Estimate = {
      ...est,
      sheets: sheetsWithItems,
    };

    // items가 비어있으면 URL을 빈 문자열로
    const hasItems = sheetsWithItems.some((s) => s.items.length > 0);

    const output = estimateToLensOutput(estimate, {
      compositeDocUrl: hasItems ? `/api/estimates/${est.id}/pdf?type=composite` : '',
      compositeDocHash: hasItems ? est.id : '',
      urethaneDocUrl: hasItems ? `/api/estimates/${est.id}/pdf?type=urethane` : '',
      urethaneDocHash: hasItems ? est.id : '',
      jsonUrl: hasItems ? `/api/estimates/${est.id}/json` : '',
      excelUrl: hasItems ? `/api/estimates/${est.id}/excel` : '',
    });

    return NextResponse.json(output);
  } catch (err) {
    console.error('[GET /api/lens/quote/[quoteId]]', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
