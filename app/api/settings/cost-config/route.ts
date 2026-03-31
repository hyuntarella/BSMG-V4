import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ── 서비스 역할 클라이언트 (RLS bypass) ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── config JSONB 구조 ──
// {
//   cost_breakpoints: CostBreakpoint[],
//   labor_cost_per_pum: number,
//   material_increase_rate: number,
//   base_items: { complex: BaseItem[], urethane: BaseItem[] }
// }

async function getDefaultCompanyId(): Promise<string | null> {
  const { data } = await supabase.from('companies').select('id').limit(1).single()
  return data?.id ?? null
}

export async function GET() {
  const companyId = await getDefaultCompanyId()
  if (!companyId) {
    return NextResponse.json({ error: 'company not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('cost_config')
    .select('config')
    .eq('company_id', companyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ config: data?.config ?? null })
}

export async function PUT(request: NextRequest) {
  let body: { config?: Record<string, unknown>; section?: string; value?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const companyId = await getDefaultCompanyId()
  if (!companyId) {
    return NextResponse.json({ error: 'company not found' }, { status: 404 })
  }

  let configToSave: Record<string, unknown>

  if (body.section && body.value !== undefined) {
    // 부분 업데이트: section 키만 교체
    const { data: existing } = await supabase
      .from('cost_config')
      .select('config')
      .eq('company_id', companyId)
      .single()
    const current = (existing?.config as Record<string, unknown>) ?? {}
    configToSave = { ...current, [body.section]: body.value }
  } else if (body.config) {
    configToSave = body.config
  } else {
    return NextResponse.json({ error: 'config 또는 section/value 필요' }, { status: 400 })
  }

  const { error } = await supabase
    .from('cost_config')
    .upsert(
      { company_id: companyId, config: configToSave, updated_at: new Date().toISOString() },
      { onConflict: 'company_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
