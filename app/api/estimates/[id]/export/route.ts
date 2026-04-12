import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateMethodExcel } from '@/lib/estimate/fileExport'
import { convertXlsxToPdf } from '@/lib/gdrive/convert'
import { getEstimateFolderId } from '@/lib/gdrive/client'
import type { Estimate, EstimateSheet, EstimateItem, Method } from '@/lib/estimate/types'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * 관리번호 생성: YYMMDD + 2자리 일련번호
 * 예: 26041201 (2026-04-12, 해당일 첫 번째)
 */
async function generateMgmtNo(companyId: string, date: string): Promise<string> {
  // YYMMDD
  const d = new Date(date)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const prefix = `${yy}${mm}${dd}`

  // 당일 견적 카운트
  const { count } = await supabase
    .from('estimates')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('date', date)

  const seq = String((count ?? 0) + 1).padStart(2, '0')
  return `${prefix}${seq}`
}

/**
 * POST /api/estimates/[id]/export
 *
 * body: { format: 'xlsx' | 'pdf', method: 'complex' | 'urethane' }
 * xlsx → XLSX binary stream
 * pdf  → Drive API 변환 후 PDF binary stream
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const estimateId = params.id

  let body: { format?: string; method?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { format, method: methodRaw } = body

  if (format !== 'xlsx' && format !== 'pdf') {
    return NextResponse.json({ error: `지원하지 않는 포맷: ${format}` }, { status: 400 })
  }

  // method 검증
  const methodMap: Record<string, Method> = { complex: '복합', urethane: '우레탄' }
  const method = methodMap[methodRaw ?? '']
  if (!method) {
    return NextResponse.json(
      { error: `method는 'complex' 또는 'urethane'이어야 합니다` },
      { status: 400 },
    )
  }

  // ── 견적서 로드 ──
  const { data: estimateRow, error: estErr } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single()

  if (estErr || !estimateRow) {
    return NextResponse.json({ error: '견적서를 찾을 수 없습니다' }, { status: 404 })
  }

  // ── 시트 + 아이템 로드 ──
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
      warranty_option: sr.warranty_option,
      grand_total: Number(sr.grand_total),
      sort_order: sr.sort_order,
      items,
    })
  }

  // 요청된 공법의 시트가 없으면 404
  const targetSheet = sheets.find(s => s.type === method)
  if (!targetSheet) {
    return NextResponse.json(
      { error: `'${method}' 시트가 이 견적서에 없습니다` },
      { status: 404 },
    )
  }

  // ── 관리번호 생성 (없으면) ──
  let mgmtNo = estimateRow.mgmt_no as string | null
  if (!mgmtNo && estimateRow.company_id) {
    mgmtNo = await generateMgmtNo(estimateRow.company_id, estimateRow.date)
    await supabase
      .from('estimates')
      .update({ mgmt_no: mgmtNo, updated_at: new Date().toISOString() })
      .eq('id', estimateId)
  }

  const estimate: Estimate = {
    id: estimateRow.id,
    company_id: estimateRow.company_id,
    mgmt_no: mgmtNo ?? undefined,
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

  try {
    // XLSX 생성 (PDF든 XLSX든 먼저 필요)
    const xlsxBuffer = await generateMethodExcel(estimate, method)

    const dateStr = estimate.date || 'unknown'
    const customer = (estimate.customer_name || '미지정').replace(/[/\\:*?"<>|]/g, '')

    if (format === 'xlsx') {
      const fileName = `견적서_${dateStr}_${customer}_${methodRaw}.xlsx`
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': String(xlsxBuffer.length),
        },
      })
    }

    // format === 'pdf': Drive API로 XLSX → PDF 변환
    const folderId = getEstimateFolderId()
    const tempXlsxName = `_temp_export_${estimateId}_${methodRaw}.xlsx`
    const pdfBuffer = await convertXlsxToPdf(xlsxBuffer, tempXlsxName, folderId)

    const pdfFileName = `견적서_${dateStr}_${customer}_${methodRaw}.pdf`
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(pdfFileName)}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : `${format?.toUpperCase()} 생성 실패`
    console.error('[export] error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
