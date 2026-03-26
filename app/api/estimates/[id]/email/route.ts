import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEstimateEmail } from '@/lib/email/sendEstimate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/estimates/[id]/email
 * Body: { to: string }
 * 견적서 이메일 발송 + email_sent_at 업데이트
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { to } = await request.json()

  if (!to) {
    return NextResponse.json({ error: '수신자 이메일(to) 필요' }, { status: 400 })
  }

  const estimateId = params.id

  // 견적서 조회
  const { data: estimate, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single()

  if (error || !estimate) {
    return NextResponse.json({ error: '견적서를 찾을 수 없습니다' }, { status: 404 })
  }

  // 엑셀 파일 다운로드 (첨부용)
  let excelBuffer: Buffer | undefined
  if (estimate.excel_url) {
    try {
      const filePath = estimate.folder_path
        ? `${estimate.folder_path}/견적서_${estimate.mgmt_no}.xlsx`
        : null

      if (filePath) {
        const { data } = await supabase.storage
          .from('estimates')
          .download(filePath)

        if (data) {
          const arrayBuffer = await data.arrayBuffer()
          excelBuffer = Buffer.from(arrayBuffer)
        }
      }
    } catch {
      // 엑셀 첨부 실패 시 무시 (이메일은 발송)
    }
  }

  // baseUrl 추출
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  try {
    await sendEstimateEmail({
      to,
      estimateId,
      mgmtNo: estimate.mgmt_no ?? estimateId.slice(0, 8),
      customerName: estimate.customer_name ?? '',
      excelBuffer,
      baseUrl,
    })

    // email_sent_at + email_to 업데이트
    await supabase
      .from('estimates')
      .update({
        status: 'sent',
        email_sent_at: new Date().toISOString(),
        email_to: to,
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId)

    return NextResponse.json({ success: true, to })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '발송 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
