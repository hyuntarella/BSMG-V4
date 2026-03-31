import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EstimateEditor from '@/components/estimate/EstimateEditor'
import type { Estimate, EstimateSheet, EstimateItem, PriceMatrixRaw } from '@/lib/estimate/types'

interface Props {
  params: { id: string }
}

export default async function EstimatePage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 유저 company_id
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/dashboard')

  // 견적서 로드
  const { data: estimateRow } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!estimateRow) redirect('/dashboard')

  // 시트 + 아이템 로드
  const { data: sheetRows } = await supabase
    .from('estimate_sheets')
    .select('*')
    .eq('estimate_id', params.id)
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
      type: sr.type as '복합' | '우레탄',
      title: sr.title,
      plan: sr.plan,
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
    customer_id: estimateRow.customer_id,
    created_by: estimateRow.created_by,
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

  // P매트릭스 로드 (service role로 — RLS 우회, company_id 필터는 직접)
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: matrixRows } = await serviceClient
    .from('price_matrix')
    .select('*')
    .eq('company_id', userData.company_id)

  const priceMatrix: PriceMatrixRaw = {}
  for (const row of matrixRows ?? []) {
    if (!priceMatrix[row.area_range]) priceMatrix[row.area_range] = {}
    if (!priceMatrix[row.area_range][row.method]) priceMatrix[row.area_range][row.method] = {}
    const key = String(row.price_per_pyeong)
    if (!priceMatrix[row.area_range][row.method][key]) {
      priceMatrix[row.area_range][row.method][key] = []
    }
    // item_index 위치에 배치
    priceMatrix[row.area_range][row.method][key][row.item_index] = [
      Number(row.mat),
      Number(row.labor),
      Number(row.exp),
    ]
  }

  return <EstimateEditor initialEstimate={estimate} priceMatrix={priceMatrix} />
}
