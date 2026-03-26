import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 1x1 투명 PNG 픽셀
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

/**
 * GET /api/track/[id]
 * 1x1 투명 픽셀 반환 + email_viewed_at 업데이트
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // 비동기로 DB 업데이트 (응답 지연 방지)
  supabase
    .from('estimates')
    .update({ email_viewed_at: new Date().toISOString() })
    .eq('id', params.id)
    .is('email_viewed_at', null) // 최초 열람만 기록
    .then(() => {})

  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Content-Length': String(PIXEL.length),
    },
  })
}
