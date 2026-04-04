import { NextResponse } from 'next/server';
import { queryFollowUp } from '@/lib/supabase/inquiry';

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
    const inquiries = await queryFollowUp();

    const records: FollowUpRecord[] = inquiries.map((r) => ({
      id: r.id,
      address: r.address,
      customerName: r.client_name,
      // stage_changed_at 기준 정체 일수
      daysSince: calcDaysSince(r.stage_changed_at),
      estimateAmount: r.estimate_amount,
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
