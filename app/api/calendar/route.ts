// ── GET/POST /api/calendar ──
// 캘린더 이벤트 목록 조회 및 생성

import { NextRequest, NextResponse } from 'next/server';
import { getEvents, createEvent } from '@/lib/notion/calendar';

// GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'start, end 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const events = await getEvents(start, end);
    return NextResponse.json({ events });
  } catch (err) {
    console.error('[calendar] GET 오류:', err);
    return NextResponse.json({ error: '이벤트 조회 실패' }, { status: 500 });
  }
}

// POST /api/calendar
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.start) {
      return NextResponse.json(
        { error: 'title, start 필드가 필요합니다.' },
        { status: 400 }
      );
    }

    const event = await createEvent(body);
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('[calendar] POST 오류:', err);
    return NextResponse.json({ error: '이벤트 생성 실패' }, { status: 500 });
  }
}
