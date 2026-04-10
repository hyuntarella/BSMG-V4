import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  generateJson,
  generateExcel,
  generateTempPdf,
  getExcelFileName,
  getPdfFileName,
} from '@/lib/estimate/fileExport'
import type { Estimate, EstimateSheet, EstimateItem } from '@/lib/estimate/types'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'estimates'

/**
 * POST /api/estimates/[id]/save-all
 *
 * JSON + Excel + PDF(복합) + PDF(우레탄) 4개 파일 생성 → Storage 업로드 → DB 업데이트
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const estimateId = params.id

  // ── 견적서 + 시트 + 아이템 로드 ──
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
      is_locked: ir.is_locked,
      is_hidden: ir.is_hidden,
      lump_amount: ir.lump_amount,
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
    // ── 1. JSON ──
    const jsonStr = generateJson(estimate)
    const jsonBuffer = Buffer.from(jsonStr, 'utf-8')
    const jsonPath = `${folderPath}/견적서_${mgmtNo}.json`
    await supabase.storage
      .from(BUCKET)
      .upload(jsonPath, jsonBuffer, {
        contentType: 'application/json',
        upsert: true,
      })
    const { data: jsonUrlData } = supabase.storage.from(BUCKET).getPublicUrl(jsonPath)

    // ── 2. Excel ──
    const excelBuffer = await generateExcel(estimate)
    const excelFileName = getExcelFileName(estimate)
    const excelPath = `${folderPath}/${excelFileName}`
    await supabase.storage
      .from(BUCKET)
      .upload(excelPath, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })
    const { data: excelUrlData } = supabase.storage.from(BUCKET).getPublicUrl(excelPath)

    // ── 3. PDF (복합) ──
    let compositePdfUrl = ''
    const compositeFileName = getPdfFileName(estimate, '복합')
    const compositeSheet = estimate.sheets.find((s) => s.type === '복합')
    if (compositeSheet) {
      const compositePdfBuffer = await generateTempPdf(estimate, '복합')
      const compositePdfPath = `${folderPath}/${compositeFileName}`
      await supabase.storage
        .from(BUCKET)
        .upload(compositePdfPath, compositePdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })
      const { data: cpData } = supabase.storage.from(BUCKET).getPublicUrl(compositePdfPath)
      compositePdfUrl = cpData.publicUrl
    }

    // ── 4. PDF (우레탄) ──
    let urethanePdfUrl = ''
    const urethaneFileName = getPdfFileName(estimate, '우레탄')
    const urethaneSheet = estimate.sheets.find((s) => s.type === '우레탄')
    if (urethaneSheet) {
      const urethanePdfBuffer = await generateTempPdf(estimate, '우레탄')
      const urethanePdfPath = `${folderPath}/${urethaneFileName}`
      await supabase.storage
        .from(BUCKET)
        .upload(urethanePdfPath, urethanePdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })
      const { data: upData } = supabase.storage.from(BUCKET).getPublicUrl(urethanePdfPath)
      urethanePdfUrl = upData.publicUrl
    }

    // ── 5. DB 업데이트 ──
    await supabase
      .from('estimates')
      .update({
        status: 'saved',
        json_url: jsonUrlData.publicUrl,
        excel_url: excelUrlData.publicUrl,
        composite_pdf_url: compositePdfUrl || null,
        urethane_pdf_url: urethanePdfUrl || null,
        files_generated_at: new Date().toISOString(),
        folder_path: folderPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId)

    return NextResponse.json({
      success: true,
      estimateId,
      jsonUrl: jsonUrlData.publicUrl,
      excelUrl: excelUrlData.publicUrl,
      compositePdfUrl: compositePdfUrl || null,
      urethanePdfUrl: urethanePdfUrl || null,
      fileName: {
        json: `견적서_${mgmtNo}.json`,
        excel: excelFileName,
        compositePdf: compositeFileName,
        urethanePdf: urethaneFileName,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '파일 생성 실패'
    console.error('save-all error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
