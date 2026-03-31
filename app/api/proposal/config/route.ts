import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Service role client (RLS bypass) ──────────────────────────────────────────
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const BUCKET = 'proposals';
const CONFIG_PATH = 'config/proposal-config.json';

// ── GET /api/proposal/config ──────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(CONFIG_PATH);

    if (error) {
      // File not found — return empty default config
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
  try {
    const config = await req.json();
    const supabase = createServiceClient();

    const jsonBytes = new TextEncoder().encode(JSON.stringify(config));

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(CONFIG_PATH, jsonBytes, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('proposal/config upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('proposal/config POST error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
