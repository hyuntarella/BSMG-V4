import { NextResponse } from 'next/server';
import { queryUnsent } from '@/lib/supabase/inquiry';

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
 * pipeline_stage = '문의접수' + estimate_amount IS NULL 건 조회
 */
export async function GET() {
  try {
    const inquiries = await queryUnsent();

    const records: UnsentRecord[] = inquiries.map((r) => ({
      id: r.id,
      name: r.client_name,
      address: r.address,
      daysSince: calcDaysSince(r.created_at),
      manager: r.manager,
      phone: r.phone,
    }));

    return NextResponse.json({ records });
  } catch (err) {
    console.error('미발송 조회 실패:', err);
    return NextResponse.json({ error: '미발송 조회 실패' }, { status: 500 });
  }
}
