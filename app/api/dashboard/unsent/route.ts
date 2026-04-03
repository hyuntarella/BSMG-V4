import { NextResponse } from 'next/server';
import { queryCrmByPipeline } from '@/lib/supabase/crm';
import type { CrmRecord } from '@/lib/supabase/crm-types';

export interface UnsentRecord {
  id: string;
  name: string | null;
  address: string;
  daysSince: number;
  manager: string | null;
  phone: string | null;
}

function calcDaysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

/**
 * GET /api/dashboard/unsent
 * 파이프라인 = '견적 방문 완료' + 견적서발송일 null 건 조회
 */
export async function GET() {
  try {
    const records: CrmRecord[] = await queryCrmByPipeline('견적 방문 완료');

    // 견적서 미발송 건만 필터링
    const unsent: UnsentRecord[] = records
      .filter((r) => r.estimateSentDate === null)
      .map((r) => ({
        id: r.id,
        name: r.customerName,
        address: r.address,
        daysSince: calcDaysSince(r.inquiryDate),
        manager: r.manager,
        phone: r.phone,
      }));

    return NextResponse.json({ records: unsent });
  } catch (err) {
    console.error('미발송 조회 실패:', err);
    return NextResponse.json({ error: '미발송 조회 실패' }, { status: 500 });
  }
}
