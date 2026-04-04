import { NextRequest, NextResponse } from 'next/server';
import { searchInquiries } from '@/lib/supabase/inquiry';

/** GET /api/inquiries/search?q=...&limit=... */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8', 10), 20);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchInquiries(q, limit);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[inquiries/search] 오류:', err);
    return NextResponse.json({ error: '문의 검색 실패' }, { status: 500 });
  }
}
