// ── GET /api/proposal ──
// 제안서 목록 조회

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
