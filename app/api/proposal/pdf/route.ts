import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadToDrive, getProposalFolderId } from '@/lib/gdrive/client'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ProposalPdfRequest {
  pdfBase64: string; // data:application/pdf;base64,... 또는 순수 base64
  fileName: string;  // 예: "방수명가_제안서_서울시_260331.pdf"
}

/**
 * POST /api/proposal/pdf
 * base64 PDF를 Supabase Storage + Google Drive에 저장
 */
export async function POST(request: Request) {
  let body: ProposalPdfRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '요청 파싱 실패' }, { status: 400 })
  }

  const { pdfBase64, fileName } = body

  if (!pdfBase64 || !fileName) {
    return NextResponse.json({ error: 'pdfBase64, fileName 필수' }, { status: 400 })
  }

  // base64 → Buffer
  const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '')
  const pdfBuffer = Buffer.from(base64Data, 'base64')

  // ── Supabase Storage 업로드 ──
  const storagePath = `pdfs/${fileName}`
  const { error: uploadError } = await supabase.storage
    .from('proposals')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage 업로드 실패:', uploadError)
    return NextResponse.json({ error: `Storage 업로드 실패: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('proposals')
    .getPublicUrl(storagePath)

  // ── Google Drive 업로드 (환경변수 있을 때만, 10초 타임아웃) ──
  let driveUrl = ''
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const folderId = getProposalFolderId()
      const drivePromise = uploadToDrive(folderId, fileName, 'application/pdf', pdfBuffer)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Drive 타임아웃')), 10000)
      )
      const result = await Promise.race([drivePromise, timeoutPromise])
      driveUrl = result.url
    } catch (err) {
      console.error('Drive 업로드 실패 (무시):', err)
    }
  }

  return NextResponse.json({
    success: true,
    storage_url: urlData.publicUrl,
    drive_url: driveUrl || undefined,
  })
}
