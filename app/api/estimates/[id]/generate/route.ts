import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateWorkbook, workbookToBuffer } from '@/lib/excel/generateWorkbook'
import { generateEstimateHtml, generatePdfBuffer } from '@/lib/pdf/generatePdf'
import { uploadToDrive, getEstimateFolderId } from '@/lib/gdrive/client'
import { exportToJson } from '@/lib/estimate/jsonIO'
import type { Estimate, EstimateSheet, EstimateItem } from '@/lib/estimate/types'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/estimates/[id]/generate
 * 엑셀 + HTML(PDF용) 생성 → Supabase Storage 업로드
 * body: { download?: boolean }
 *   download: true  → 엑셀 바이너리 직접 응답 (Storage 업로드 없음)
 *   download: false → Storage 업로드 + JSON 응답 (기본)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const estimateId = params.id
  const body = await request.json().catch(() => ({}))

  // 견적서 + 시트 + 아이템 로드
  const { data: estimateRow, error: estErr } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single()

  if (estErr || !estimateRow) {
    return NextResponse.json({ error: '견적서를 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: sheetRows } = await supabase
    .from('estimate_sheets')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order')

  const sheets: EstimateSheet[] = []
  for (const sr of sheetRows ?? []) {
    const { data: itemRows } = await supabase
      .from('estimate_items')
      .select('*')
      .eq('sheet_id', sr.id)
      .order('sort_order')

    const items: EstimateItem[] = (itemRows ?? []).map((ir) => ({
      id: ir.id,
      sheet_id: ir.sheet_id,
      sort_order: ir.sort_order,
      name: ir.name,
      spec: ir.spec,
      unit: ir.unit,
      qty: Number(ir.qty),
      mat: ir.mat,
      labor: ir.labor,
      exp: ir.exp,
      mat_amount: Number(ir.mat_amount),
      labor_amount: Number(ir.labor_amount),
      exp_amount: Number(ir.exp_amount),
      total: Number(ir.total),
      is_base: ir.is_base,
      is_equipment: ir.is_equipment,
      is_fixed_qty: ir.is_fixed_qty,
    }))

    sheets.push({
      id: sr.id,
      estimate_id: sr.estimate_id,
      type: sr.type,
      title: sr.title,
      price_per_pyeong: sr.price_per_pyeong,
      warranty_years: sr.warranty_years,
      warranty_bond: sr.warranty_bond,
      grand_total: Number(sr.grand_total),
      sort_order: sr.sort_order,
      items,
    })
  }

  const estimate: Estimate = {
    id: estimateRow.id,
    company_id: estimateRow.company_id,
    mgmt_no: estimateRow.mgmt_no,
    status: estimateRow.status,
    date: estimateRow.date,
    customer_name: estimateRow.customer_name,
    site_name: estimateRow.site_name,
    m2: Number(estimateRow.m2),
    wall_m2: Number(estimateRow.wall_m2),
    manager_name: estimateRow.manager_name,
    manager_phone: estimateRow.manager_phone,
    memo: estimateRow.memo,
    sheets,
  }

  const mgmtNo = estimate.mgmt_no ?? estimateId.slice(0, 8)
  const folderPath = `estimates/${mgmtNo}`

  try {
    // 엑셀 생성
    const wb = await generateWorkbook(estimate)
    const excelBuffer = await workbookToBuffer(wb)

    // 다운로드 모드: Storage 업로드 없이 바이너리 직접 응답
    if (body?.download) {
      return new Response(new Uint8Array(excelBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="견적서_${mgmtNo}.xlsx"`,
        },
      })
    }

    // Storage 업로드: 엑셀
    const excelPath = `${folderPath}/견적서_${mgmtNo}.xlsx`
    await supabase.storage
      .from('estimates')
      .upload(excelPath, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })

    const { data: excelUrl } = supabase.storage
      .from('estimates')
      .getPublicUrl(excelPath)

    // HTML(PDF용) 생성 & 업로드
    const html = generateEstimateHtml(estimate)
    const htmlBuffer = Buffer.from(html, 'utf-8')
    const htmlPath = `${folderPath}/견적서_${mgmtNo}.html`
    await supabase.storage
      .from('estimates')
      .upload(htmlPath, htmlBuffer, {
        contentType: 'text/html; charset=utf-8',
        upsert: true,
      })

    // PDF 생성 & Supabase Storage 업로드
    const pdfBuffer = await generatePdfBuffer(html)
    const pdfPath = `${folderPath}/견적서_${mgmtNo}.pdf`
    await supabase.storage
      .from('estimates')
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    const { data: pdfUrl } = supabase.storage
      .from('estimates')
      .getPublicUrl(pdfPath)

    // JSON 생성 & 업로드
    const jsonStr = exportToJson(estimate)
    const jsonBuffer = Buffer.from(jsonStr, 'utf-8')
    const jsonPath = `${folderPath}/견적서_${mgmtNo}.json`
    await supabase.storage
      .from('estimates')
      .upload(jsonPath, jsonBuffer, {
        contentType: 'application/json',
        upsert: true,
      })

    // Google Drive 업로드 (환경변수 있을 때만, 20초 타임아웃)
    let driveUrl = ''
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      try {
        const driveFolderId = getEstimateFolderId()
        // 엑셀 + PDF 동시 업로드
        const excelDrivePromise = uploadToDrive(
          driveFolderId,
          `견적서_${mgmtNo}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          excelBuffer,
        )
        const pdfDrivePromise = uploadToDrive(
          driveFolderId,
          `견적서_${mgmtNo}.pdf`,
          'application/pdf',
          pdfBuffer,
        )
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Drive 업로드 타임아웃')), 20000)
        )
        const [driveResult] = await Promise.race([
          Promise.all([excelDrivePromise, pdfDrivePromise]),
          timeoutPromise,
        ])
        driveUrl = driveResult.url
      } catch (driveErr) {
        console.error('Google Drive 업로드 실패 (무시):', driveErr)
      }
    }

    // DB 업데이트
    await supabase
      .from('estimates')
      .update({
        status: 'saved',
        excel_url: excelUrl.publicUrl,
        pdf_url: pdfUrl.publicUrl,
        folder_path: folderPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId)

    return NextResponse.json({
      success: true,
      mgmt_no: mgmtNo,
      excel_url: excelUrl.publicUrl,
      pdf_url: pdfUrl.publicUrl,
      drive_url: driveUrl || undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '생성 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
