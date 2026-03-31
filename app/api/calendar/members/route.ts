// ── GET /api/calendar/members ──
// 캘린더 팀원 목록 조회

import { NextResponse } from 'next/server';
import { getMembers } from '@/lib/notion/calendar';

export async function GET() {
  try {
    const members = await getMembers();
    return NextResponse.json({ members });
  } catch (err) {
    console.error('[calendar/members] GET 오류:', err);
    return NextResponse.json({ error: '팀원 목록 조회 실패' }, { status: 500 });
  }
}
