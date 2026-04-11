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
import { isQuickChipCategoryArray } from '@/lib/estimate/favorites'
import type { QuickChipCategory } from '@/lib/estimate/quickChipConfig'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'estimates'

/**
 * 견적 저장 시 규칙서에 없는 공종을 cost_config.new_items 에 자동 등록.
 * 기존에 favorites / other_items / new_items 중 하나에 있으면 스킵.
 * 실패해도 저장 전체를 막지 않는다 (경고 로그만).
 */
async function registerNewItems(companyId: string, estimate: Estimate) {
  try {
    const { data: cfgRow } = await supabase
      .from('cost_config')
      .select('config')
      .eq('company_id', companyId)
      .single()

    const cfg = (cfgRow?.config ?? {}) as Record<string, unknown>

    // 기존 공종 이름 집합
    const known = new Set<string>()
    const favRaw = cfg.favorites
    if (isQuickChipCategoryArray(favRaw)) {
      for (const cat of favRaw as QuickChipCategory[]) {
        for (const chip of cat.chips) known.add(chip.name)
      }
    }
    const other = cfg.other_items as Record<string, unknown> | undefined
    if (other && typeof other === 'object') {
      for (const name of Object.keys(other)) known.add(name)
    }
    const existingNew = (cfg.new_items as Record<string, unknown> | undefined) ?? {}
    for (const name of Object.keys(existingNew)) known.add(name)

    // 시트 내 is_base=false 공종 중 기존에 없는 것만 대상
    const additions: Record<string, {
      unit: string
      mat: number
      labor: number
      exp: number
      registered_at: string
    }> = {}
    const now = new Date().toISOString()

    for (const sheet of estimate.sheets) {
      for (const it of sheet.items) {
        if (it.is_base) continue
        const name = (it.name ?? '').trim()
        if (!name) continue
        if (known.has(name)) continue
        if (additions[name]) continue
        additions[name] = {
          unit: it.unit ?? 'm²',
          mat: typeof it.mat === 'number' ? it.mat : 0,
          labor: typeof it.labor === 'number' ? it.labor : 0,
          exp: typeof it.exp === 'number' ? it.exp : 0,
          registered_at: now,
        }
      }
    }

    if (Object.keys(additions).length === 0) return

    const nextNewItems = {
      ...(existingNew as Record<string, unknown>),
      ...additions,
    }
    const nextConfig = { ...cfg, new_items: nextNewItems }

    await supabase
      .from('cost_config')
      .upsert(
        { company_id: companyId, config: nextConfig, updated_at: new Date().toISOString() },
        { onConflict: 'company_id' },
      )

    console.log(`[save-all] 신규 공종 ${Object.keys(additions).length}건 자동 등록`)
  } catch (err) {
    console.warn('[save-all] 신규 공종 자동 등록 실패:', err)
  }
}

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

    // ── 5. 신규 공종 자동 등록 (cost_config.new_items) ──
    if (estimate.company_id) {
      await registerNewItems(estimate.company_id, estimate)
    }

    // ── 6. DB 업데이트 ──
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
