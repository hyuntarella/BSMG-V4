import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/track/[id] — 1x1 투명 PNG + 열람 기록 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params

  try {
    const supabase = createClient()
    await supabase
      .from('estimates')
      .update({ email_viewed_at: new Date().toISOString() })
      .eq('id', id)
      .is('email_viewed_at', null)
  } catch {
    // 추적 실패해도 이미지 반환
  }

  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  )

  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
