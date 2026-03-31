import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEstimateHtml, generatePdfBuffer } from '@/lib/pdf/generatePdf'
import type { Estimate, EstimateSheet, EstimateItem } from '@/lib/estimate/types'

// Vercel 서버리스 타임아웃: PDF 생성에 충분한 시간 확보
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/estimates/[id]/pdf
 * 견적서 데이터를 로드하고 PDF buffer를 생성하여 반환
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const estimateId = params.id

  // 견적서 로드
  const { data: estimateRow, error: estErr } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single()

  if (estErr || !estimateRow) {
    return NextResponse.json({ error: '견적서를 찾을 수 없습니다' }, { status: 404 })
  }

  // 시트 + 아이템 로드
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

  try {
    const html = generateEstimateHtml(estimate)
    const pdfBuffer = await generatePdfBuffer(html)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="견적서_${mgmtNo}.pdf"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF 생성 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
