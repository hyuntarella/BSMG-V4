import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const BUCKET = 'proposals';
const CONFIG_PATH = 'config/proposal-config.json';

// ── GET /api/proposal/config ──────────────────────────────────────────────────
export async function GET() {
  // ── 인증 체크 ──
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  try {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await service.storage.from(BUCKET).download(CONFIG_PATH);

    if (error) {
      return NextResponse.json({});
    }

    const text = await data.text();
    const config = JSON.parse(text);
    return NextResponse.json(config);
  } catch (e) {
    console.error('proposal/config GET error:', e);
    return NextResponse.json({}, { status: 500 });
  }
}

// ── POST /api/proposal/config ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 인증 체크 ──
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  try {
    const config = await req.json();
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const jsonBytes = new TextEncoder().encode(JSON.stringify(config));

    const { error } = await service.storage
      .from(BUCKET)
      .upload(CONFIG_PATH, jsonBytes, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('proposal/config upload error:', error);
      return NextResponse.json({ error: `설정 저장 실패: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('proposal/config POST error:', e);
    return NextResponse.json({ error: `설정 저장 오류: ${String(e)}` }, { status: 500 });
  }
}
