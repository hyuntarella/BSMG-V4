import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { PresetRow } from '@/lib/estimate/types'

// ── 서비스 역할 클라이언트 (RLS bypass) ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── 기본 company_id (싱글테넌트 기준) ──
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
    .from('presets')
    .select('*')
    .eq('company_id', companyId)
    .order('category')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ presets: data as PresetRow[] })
}

export async function POST(request: NextRequest) {
  let body: Partial<PresetRow>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const { name, spec = '', unit = 'm²', mat = 0, labor = 0, exp = 0, category = 'custom' } = body

  if (!name) {
    return NextResponse.json({ error: 'name 필드 필요' }, { status: 400 })
  }

  const companyId = await getDefaultCompanyId()
  if (!companyId) {
    return NextResponse.json({ error: 'company not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('presets')
    .insert({ company_id: companyId, name, spec, unit, mat, labor, exp, category })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ preset: data as PresetRow }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  let body: Partial<PresetRow> & { id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const { id, ...updates } = body
  if (!id) {
    return NextResponse.json({ error: 'id 필드 필요' }, { status: 400 })
  }

  // company_id 변경 금지
  delete (updates as Partial<PresetRow>).company_id

  const { data, error } = await supabase
    .from('presets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ preset: data as PresetRow })
}

export async function DELETE(request: NextRequest) {
  let body: { id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const { id } = body
  if (!id) {
    return NextResponse.json({ error: 'id 필드 필요' }, { status: 400 })
  }

  const { error } = await supabase.from('presets').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
