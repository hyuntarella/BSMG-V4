import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface ViewedRecord {
  id: string;
  customerName: string;
  siteName: string;
  viewedAt: string;
  totalAmount: number;
}

/**
 * GET /api/dashboard/viewed
 * email_viewed_at이 있는 견적서 조회 (열람 고객 목록)
 */
export async function GET() {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const companyId = userData?.company_id;
    if (!companyId) {
      return NextResponse.json({ error: '회사 정보 없음' }, { status: 403 });
    }

    const { data: estimates, error } = await supabase
      .from('estimates')
      .select('id, customer_name, site_name, email_viewed_at')
      .eq('company_id', companyId)
      .not('email_viewed_at', 'is', null)
      .order('email_viewed_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('열람 고객 조회 실패:', error);
      return NextResponse.json({ error: '조회 실패' }, { status: 500 });
    }

    const records: ViewedRecord[] = (estimates ?? []).map((e) => ({
      id: e.id,
      customerName: e.customer_name ?? '',
      siteName: e.site_name ?? '',
      viewedAt: e.email_viewed_at ?? '',
      totalAmount: 0,
    }));

    return NextResponse.json({ records });
  } catch (err) {
    console.error('열람 고객 API 오류:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
