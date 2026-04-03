import { NextResponse } from 'next/server';
import { queryCrmFollowUp } from '@/lib/supabase/crm';

// ── FollowUpRecord type ──

export interface FollowUpRecord {
  id: string;
  address: string;
  customerName: string | null;
  daysSince: number;
  estimateAmount: number | null;
  manager: string | null;
}

function calcDaysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export async function GET() {
  try {
    const crmRecords = await queryCrmFollowUp();

    const records: FollowUpRecord[] = crmRecords.map((r) => ({
      id: r.id,
      address: r.address,
      customerName: r.customerName,
      // 견적서발송일 기준, 없으면 문의일자 기준
      daysSince: calcDaysSince(r.estimateSentDate ?? r.inquiryDate),
      estimateAmount: r.estimateAmount,
      manager: r.manager,
    }));

    return NextResponse.json({ records });
  } catch (err) {
    console.error('follow-up API 오류:', err);
    return NextResponse.json(
      { error: '연락해야 할 곳 조회 실패' },
      { status: 500 }
    );
  }
}
