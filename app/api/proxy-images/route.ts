import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS = 5000;

// ── POST /api/proxy-images ────────────────────────────────────────────────────
// Fetches external image URLs server-side, returning base64 strings.
// Used to bypass CORS restrictions when capturing images for PDF generation.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urls: string[] = Array.isArray(body.urls) ? body.urls : [];

    const images = await Promise.all(
      urls.map(async (url) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timer);

          if (!response.ok) {
            return { url, base64: '' };
          }

          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          return { url, base64: `data:${contentType};base64,${base64}` };
        } catch {
          // Skip failed URLs (timeout, network error, etc.)
          return { url, base64: '' };
        }
      })
    );

    return NextResponse.json({ images });
  } catch (e) {
    console.error('proxy-images POST error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
