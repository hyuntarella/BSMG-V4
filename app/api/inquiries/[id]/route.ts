import { NextResponse } from 'next/server';
import {
  getInquiryById,
  updateInquiry,
  deleteInquiry,
} from '@/lib/supabase/inquiry';
import type { InquiryUpdate } from '@/lib/supabase/inquiry-types';

/** GET /api/inquiries/[id] — 단건 조회 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const inquiry = await getInquiryById(params.id);
    return NextResponse.json(inquiry);
  } catch (err) {
    console.error('문의 조회 실패:', err);
    return NextResponse.json({ error: '문의 조회 실패' }, { status: 500 });
  }
}

/** PATCH /api/inquiries/[id] — 수정 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as InquiryUpdate;
    await updateInquiry(params.id, body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('문의 수정 실패:', err);
    return NextResponse.json({ error: '문의 수정 실패' }, { status: 500 });
  }
}

/** DELETE /api/inquiries/[id] — 삭제 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteInquiry(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('문의 삭제 실패:', err);
    return NextResponse.json({ error: '문의 삭제 실패' }, { status: 500 });
  }
}
