// ── GET /api/estimates ──
// 견적서 목록 조회 (최근 20건, 모달용)

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
    const isTestMode = process.env.TEST_MODE === 'true';

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !isTestMode) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    let companyId: string | null = null;

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      companyId = userData?.company_id ?? null;
    }

    if (!companyId && isTestMode) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const svc = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data: firstCompany } = await svc.from('companies').select('id').limit(1).single();
      companyId = firstCompany?.id ?? null;
    }

    if (!companyId) {
      return NextResponse.json({ estimates: [] });
    }

    // TEST_MODE에서는 service client 사용 (RLS 우회)
    const queryClient = isTestMode
      ? await (async () => {
          const { createClient: createServiceClient } = await import('@supabase/supabase-js');
          return createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );
        })()
      : supabase;

    const { data: estimates, error } = await queryClient
      .from('estimates')
      .select('id, mgmt_no, date, customer_name, site_name, m2, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 각 견적서의 grand_total 합산
    const withTotal = await Promise.all(
      (estimates ?? []).map(async (est) => {
        const { data: sheets } = await queryClient
          .from('estimate_sheets')
          .select('grand_total')
          .eq('estimate_id', est.id);

        const grand_total = (sheets ?? []).reduce(
          (sum, s) => sum + Number(s.grand_total),
          0
        );
        return { ...est, grand_total };
      })
    );

    return NextResponse.json({ estimates: withTotal });
  } catch (err) {
    console.error('[GET /api/estimates]', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
