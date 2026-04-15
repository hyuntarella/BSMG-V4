import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertToDrive, getEstimateFolderId } from '@/lib/gdrive/client'
import { renderPdfFromHtml } from '@/lib/pdf/generate'
import { fontsCss } from '@/lib/pdf/fonts.css'

/**
 * Phase 6.1 — PDF 파운데이션 헬로월드 엔드포인트
 * 인프라 검증 전용. 실제 갑지/을지 렌더는 6.2~6.3.
 * 권한 패턴: 기존 save-all과 동일 (service role, D4(a) 결정).
 * 저장소: Google Drive _v2 suffix (D3(a) 결정).
 */

export const runtime = 'nodejs'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const estimateId = params.id

  const { data: estimateRow, error: estErr } = await supabase
    .from('estimates')
    .select('mgmt_no, date, customer_name, site_name')
    .eq('id', estimateId)
    .single()

  if (estErr || !estimateRow) {
    return NextResponse.json({ error: '견적서를 찾을 수 없습니다' }, { status: 404 })
  }

  const mgmtNo = estimateRow.mgmt_no ?? estimateId.slice(0, 8)
  const customer = (estimateRow.customer_name || '미지정').replace(/[/\\:*?"<>|]/g, '')
  const site = (estimateRow.site_name || '방수공사').replace(/[/\\:*?"<>|]/g, '')
  const dateStr = estimateRow.date || 'unknown'
  const basePrefix = `${customer}_${site}_${dateStr}_${mgmtNo}`

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>
${fontsCss()}
@page { size: 1123px 794px; margin: 0; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Pretendard', sans-serif; padding: 60px; color: #121212; }
h1 { font-size: 32px; font-weight: 700; margin: 0 0 24px 0; }
p { font-size: 20px; margin: 12px 0; }
.accent { color: #A11D1F; }
</style></head><body>
<h1 class="accent">Hello 6.1 — 방수명가 견적서 PDF 파운데이션</h1>
<p style="font-weight:400">Pretendard Regular (400) — 방수명가 견적서 기반 인프라 검증</p>
<p style="font-weight:500">Pretendard Medium (500) — 부제 타이포 샘플</p>
<p style="font-weight:700">Pretendard Bold (700) — 강조 타이포 샘플</p>
<p style="font-size:12px;color:#666;margin-top:40px">페이지 사이즈 1123×794px 가로 방향 · estimate ${estimateId}</p>
</body></html>`

  try {
    const pdfBuffer = await renderPdfFromHtml(html, { width: 1123, height: 794 })
    const folderId = getEstimateFolderId()
    const pdfFileName = `${basePrefix}_v2.pdf`
    const result = await upsertToDrive(
      folderId,
      pdfFileName,
      'application/pdf',
      pdfBuffer,
    )

    return NextResponse.json({
      success: true,
      estimateId,
      pdfUrl: result.url,
      fileName: pdfFileName,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF 생성 실패'
    console.error(`[save-all-v2] estimateId=${estimateId} msg=${msg}`)
    if (err instanceof Error && err.stack) console.error(err.stack)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
