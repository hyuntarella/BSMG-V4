import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * GET /api/estimates/search?q=김철수&date=yesterday
 * 견적서 검색 (음성 load 명령용)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const date = searchParams.get('date')

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: '유저 정보 없음' }, { status: 404 })
  }

  let query = supabase
    .from('estimates')
    .select('id, mgmt_no, customer_name, site_name, date, status')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .limit(5)

  // 검색어 필터
  if (q) {
    query = query.or(`customer_name.ilike.%${q}%,site_name.ilike.%${q}%,mgmt_no.ilike.%${q}%`)
  }

  // 날짜 필터
  if (date) {
    const targetDate = resolveDate(date)
    if (targetDate) {
      query = query.eq('date', targetDate)
    }
  }

  const { data: estimates, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ estimates: estimates ?? [] })
}

function resolveDate(dateStr: string): string | null {
  const today = new Date()

  if (dateStr === 'yesterday' || dateStr === '어제') {
    today.setDate(today.getDate() - 1)
    return today.toISOString().slice(0, 10)
  }

  if (dateStr === 'today' || dateStr === '오늘') {
    return today.toISOString().slice(0, 10)
  }

  // YYYY-MM-DD 형식이면 그대로
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  return null
}
