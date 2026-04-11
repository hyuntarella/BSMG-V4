import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 규칙서 설정 페이지 전용 — acdb_entries 를 이름/단위만 추려 반환.
// 클라이언트에서 전역 supabase 접근 없이 사용하기 위한 얇은 프록시.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

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
    .from('acdb_entries')
    .select('canon, display, unit, used_count')
    .eq('company_id', companyId)
    .order('used_count', { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const entries = (data ?? []).map((r) => ({
    name: r.display ?? r.canon,
    unit: r.unit ?? 'm²',
    used_count: r.used_count ?? 0,
  }))

  return NextResponse.json({ entries })
}
