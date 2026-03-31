// ── PATCH/DELETE /api/calendar/[id] ──
// 캘린더 이벤트 수정 및 삭제

import { NextRequest, NextResponse } from 'next/server';
import { updateEvent, deleteEvent } from '@/lib/notion/calendar';

// PATCH /api/calendar/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    await updateEvent(params.id, body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[calendar/[id]] PATCH 오류:', err);
    return NextResponse.json({ error: '이벤트 수정 실패' }, { status: 500 });
  }
}

// DELETE /api/calendar/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteEvent(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[calendar/[id]] DELETE 오류:', err);
    return NextResponse.json({ error: '이벤트 삭제 실패' }, { status: 500 });
  }
}
