// ── GET /api/calendar/today ──
// 오늘 날짜의 캘린더 이벤트 최대 5건 반환

import { NextResponse } from 'next/server';
import { getEventsForDate } from '@/lib/supabase/calendar';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const events = await getEventsForDate(today);

    // 시작 시간순 정렬 후 최대 5건
    const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
    const limited = sorted.slice(0, 5);

    return NextResponse.json({ events: limited });
  } catch (err) {
    console.error('[calendar/today] 오류:', err);
    return NextResponse.json({ events: [] });
  }
}
