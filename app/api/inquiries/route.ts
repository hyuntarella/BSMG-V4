import { NextResponse } from 'next/server';
import { getAllInquiries, createInquiry } from '@/lib/supabase/inquiry';
import type { InquiryCreate } from '@/lib/supabase/inquiry-types';

/** GET /api/inquiries — 전체 조회 */
export async function GET() {
  try {
    const inquiries = await getAllInquiries();
    return NextResponse.json(inquiries);
  } catch (err) {
    console.error('문의 조회 실패:', err);
    return NextResponse.json({ error: '문의 조회 실패' }, { status: 500 });
  }
}

/** POST /api/inquiries — 생성 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InquiryCreate;

    if (!body.address) {
      return NextResponse.json({ error: 'address 필드 필요' }, { status: 400 });
    }

    const inquiry = await createInquiry(body);
    return NextResponse.json(inquiry, { status: 201 });
  } catch (err) {
    console.error('문의 생성 실패:', err);
    return NextResponse.json({ error: '문의 생성 실패' }, { status: 500 });
  }
}
