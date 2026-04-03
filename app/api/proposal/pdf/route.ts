import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { uploadToDrive, getProposalFolderId } from '@/lib/gdrive/client';

export const maxDuration = 30;

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProposalPdfRequest {
  pdfBase64: string;
  fileName: string;
  address?: string;
  customerName?: string;
  configSnapshot?: Record<string, unknown>;
}

/**
 * POST /api/proposal/pdf
 * base64 PDF를 Supabase Storage + Google Drive에 저장 + proposals 테이블에 레코드 생성
 */
export async function POST(request: Request) {
  // ── 인증 체크 ──
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  let body: ProposalPdfRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 파싱 실패' }, { status: 400 });
  }

  const { pdfBase64, fileName, address, customerName, configSnapshot } = body;

  if (!pdfBase64 || !fileName) {
    return NextResponse.json({ error: 'pdfBase64, fileName 필수' }, { status: 400 });
  }

  // ── 파일명 중복 방지: proposals 테이블에서 같은 address 카운트 ──
  let finalFileName = fileName;
  if (address) {
    const { count } = await serviceSupabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .eq('address', address);

    if (count && count > 0) {
      const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
      const nameOnly = fileName.includes('.')
        ? fileName.slice(0, fileName.lastIndexOf('.'))
        : fileName;
      finalFileName = `${nameOnly}(${count + 1})${ext}`;
    }
  }

  // base64 → Buffer
  const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
  const pdfBuffer = Buffer.from(base64Data, 'base64');

  // ── Supabase Storage 업로드 ──
  const storagePath = `pdfs/${finalFileName}`;
  const { error: uploadError } = await serviceSupabase.storage
    .from('proposals')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Storage 업로드 실패:', uploadError);
    return NextResponse.json(
      { error: `Storage 업로드 실패: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = serviceSupabase.storage
    .from('proposals')
    .getPublicUrl(storagePath);

  // ── Google Drive 업로드 (환경변수 있을 때만, 10초 타임아웃) ──
  let driveUrl = '';
  let driveError = '';
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const folderId = getProposalFolderId();
      const drivePromise = uploadToDrive(folderId, finalFileName, 'application/pdf', pdfBuffer);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Drive 타임아웃')), 10000)
      );
      const result = await Promise.race([drivePromise, timeoutPromise]);
      driveUrl = result.url;
    } catch (err) {
      driveError = err instanceof Error ? err.message : String(err);
      console.error('Drive 업로드 실패:', driveError);
    }
  }

  // ── proposals 테이블에 레코드 저장 ──
  const { error: dbError } = await serviceSupabase
    .from('proposals')
    .insert({
      address: address || '',
      customer_name: customerName || '',
      created_by: user.id,
      pdf_url: urlData.publicUrl,
      drive_url: driveUrl || null,
      config_snapshot: configSnapshot || {},
    });

  if (dbError) {
    console.error('proposals DB 저장 실패:', dbError);
    // Storage에는 이미 올라갔으므로 에러를 반환하되 storage_url은 포함
    return NextResponse.json({
      success: false,
      error: `DB 저장 실패: ${dbError.message}`,
      storage_url: urlData.publicUrl,
      drive_url: driveUrl || undefined,
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    storage_url: urlData.publicUrl,
    drive_url: driveUrl || undefined,
    drive_error: driveError || undefined,
    file_name: finalFileName,
  });
}
