// ── GET /api/crm/search?q=...&limit=... ──
// CRM 고객 이름 검색 (캘린더 이벤트 연결용)

import { NextRequest, NextResponse } from 'next/server';
import { searchCustomers } from '@/lib/supabase/crm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8', 10), 20);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchCustomers(q, limit);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[crm/search] 오류:', err);
    return NextResponse.json({ error: 'CRM 검색 실패' }, { status: 500 });
  }
}
