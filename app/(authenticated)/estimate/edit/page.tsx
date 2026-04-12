import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import EstimateEditorForm from '@/components/estimate/EstimateEditorForm'
import type { Estimate, EstimateSheet, EstimateItem, PriceMatrixRaw } from '@/lib/estimate/types'

interface Props {
  searchParams: { source?: string; quoteId?: string; id?: string }
}

/**
 * Phase 4I — 통합 견적서 편집 페이지
 * - lens 진입: /estimate/edit?source=lens&quoteId=xxx
 * - 직접 진입: /estimate/edit?id=xxx
 * - 빈 시작: /estimate/edit (새 견적서 생성)
 */
export default async function EstimateEditPage({ searchParams }: Props) {
  const supabase = createClient()
  const isTestMode = process.env.TEST_MODE === 'true'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isTestMode) redirect('/login')

  let companyId: string | null = null
  let managerName: string | null = null

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('company_id, name')
      .eq('id', user.id)
      .single()
    companyId = userData?.company_id ?? null
    managerName = userData?.name ?? null
  }

  if (!companyId && isTestMode) {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: firstCompany } = await svc.from('companies').select('id').limit(1).single()
    companyId = firstCompany?.id ?? null
    managerName = '테스트'
  }

  if (!companyId) redirect('/dashboard')

  // service client for RLS-bypassed queries
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const queryClient = isTestMode ? serviceClient : supabase
  const insertClient = isTestMode ? serviceClient : supabase

  // --- Estimate 로드 또는 생성 ---
  let estimateRow: Record<string, unknown> | null = null
  const isLens = searchParams.source === 'lens' && !!searchParams.quoteId

  if (isLens) {
    // lens 진입: external_quote_id로 검색
    const { data } = await queryClient
      .from('estimates')
      .select('*')
      .eq('external_quote_id', searchParams.quoteId!)
      .eq('company_id', companyId)
      .limit(1)
      .single()
    estimateRow = data
  } else if (searchParams.id) {
    // 직접 진입: ID로 로드
    const { data } = await queryClient
      .from('estimates')
      .select('*')
      .eq('id', searchParams.id)
      .single()
    estimateRow = data
  }

  // 없으면 새 견적서 생성
  if (!estimateRow) {
    const now = new Date()
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const mgmtNo = `BS-${dateStr}-${random}`

    const { data: created, error } = await insertClient
      .from('estimates')
      .insert({
        company_id: companyId,
        created_by: user?.id ?? null,
        mgmt_no: mgmtNo,
        status: 'draft',
        date: now.toISOString().slice(0, 10),
        manager_name: managerName,
      })
      .select()
      .single()

    if (error || !created) redirect('/dashboard')
    estimateRow = created
  }

  // --- Sheets + Items 로드 ---
  const { data: sheetRows } = await queryClient
    .from('estimate_sheets')
    .select('*')
    .eq('estimate_id', (estimateRow as { id: string }).id)
    .order('sort_order')

  const sheets: EstimateSheet[] = await Promise.all(
    (sheetRows ?? []).map(async (sr: Record<string, unknown>) => {
      const { data: itemRows } = await queryClient
        .from('estimate_items')
        .select('*')
        .eq('sheet_id', sr.id as string)
        .order('sort_order')

      const items: EstimateItem[] = (itemRows ?? []).map((ir: Record<string, unknown>) => ({
        id: ir.id as string,
        sheet_id: ir.sheet_id as string,
        sort_order: ir.sort_order as number,
        name: ir.name as string,
        spec: ir.spec as string,
        unit: ir.unit as string,
        qty: Number(ir.qty),
        mat: ir.mat as number,
        labor: ir.labor as number,
        exp: ir.exp as number,
        mat_amount: Number(ir.mat_amount),
        labor_amount: Number(ir.labor_amount),
        exp_amount: Number(ir.exp_amount),
        total: Number(ir.total),
        is_base: ir.is_base as boolean,
        is_equipment: ir.is_equipment as boolean,
        is_fixed_qty: ir.is_fixed_qty as boolean,
        is_locked: ir.is_locked as boolean | undefined,
        is_hidden: ir.is_hidden as boolean | undefined,
        lump_amount: ir.lump_amount as number | null | undefined,
        original_mat: ir.original_mat as number | null | undefined,
        original_labor: ir.original_labor as number | null | undefined,
        original_exp: ir.original_exp as number | null | undefined,
      }))

      return {
        id: sr.id as string,
        estimate_id: sr.estimate_id as string,
        type: sr.type as '복합' | '우레탄',
        title: sr.title as string,
        plan: sr.plan as string | undefined,
        price_per_pyeong: sr.price_per_pyeong as number,
        warranty_years: sr.warranty_years as number,
        warranty_bond: sr.warranty_bond as number,
        grand_total: Number(sr.grand_total),
        sort_order: sr.sort_order as number,
        items,
        is_free_mode: sr.is_free_mode as boolean | undefined,
      }
    })
  )

  const row = estimateRow as Record<string, unknown>
  const estimate: Estimate = {
    id: row.id as string,
    company_id: row.company_id as string,
    customer_id: row.customer_id as string | undefined,
    created_by: row.created_by as string | undefined,
    mgmt_no: row.mgmt_no as string,
    status: (row.status as Estimate['status']) ?? 'draft',
    date: row.date as string,
    customer_name: row.customer_name as string | undefined,
    site_name: row.site_name as string | undefined,
    m2: Number(row.m2 ?? 0),
    wall_m2: Number(row.wall_m2 ?? 0),
    manager_name: row.manager_name as string | undefined,
    manager_phone: row.manager_phone as string | undefined,
    memo: row.memo as string | undefined,
    sheets,
    sync_urethane: (row.sync_urethane as boolean | undefined) ?? true,
    external_quote_id: row.external_quote_id as string | null | undefined,
    external_customer_id: row.external_customer_id as string | null | undefined,
    source: row.source as 'direct' | 'lens' | undefined,
  }

  // --- P매트릭스 로드 ---
  const { data: matrixRows } = await serviceClient
    .from('price_matrix')
    .select('*')
    .eq('company_id', companyId)

  const priceMatrix: PriceMatrixRaw = {}
  for (const mRow of matrixRows ?? []) {
    if (!priceMatrix[mRow.area_range]) priceMatrix[mRow.area_range] = {}
    if (!priceMatrix[mRow.area_range][mRow.method]) priceMatrix[mRow.area_range][mRow.method] = {}
    const key = String(mRow.price_per_pyeong)
    if (!priceMatrix[mRow.area_range][mRow.method][key]) {
      priceMatrix[mRow.area_range][mRow.method][key] = []
    }
    priceMatrix[mRow.area_range][mRow.method][key][mRow.item_index] = [
      Number(mRow.mat),
      Number(mRow.labor),
      Number(mRow.exp),
    ]
  }

  return (
    <>
      <Header />
      <EstimateEditorForm
        initialEstimate={estimate}
        priceMatrix={priceMatrix}
        isLens={isLens}
      />
    </>
  )
}
