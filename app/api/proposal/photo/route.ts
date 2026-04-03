import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const BUCKET = 'proposals';

// ── POST /api/proposal/photo ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 인증 체크 ──
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'file field required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `photos/${Date.now()}_${file.name}`;

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await service.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error('proposal/photo upload error:', error);
      return NextResponse.json({ error: `사진 업로드 실패: ${error.message}` }, { status: 500 });
    }

    const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error('proposal/photo POST error:', e);
    return NextResponse.json({ error: `사진 업로드 오류: ${String(e)}` }, { status: 500 });
  }
}
