import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { PriceMatrixRow } from '@/lib/estimate/types'

// ── 서비스 역할 클라이언트 (RLS bypass) ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const area_range = searchParams.get('area_range')
  const method = searchParams.get('method')

  if (!area_range || !method) {
    return NextResponse.json({ error: 'area_range, method 파라미터 필요' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('price_matrix')
    .select('*')
    .eq('area_range', area_range)
    .eq('method', method)
    .order('price_per_pyeong')
    .order('item_index')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rows: data as PriceMatrixRow[] })
}

export async function PUT(request: NextRequest) {
  let body: { rows: PriceMatrixRow[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const { rows } = body
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows 배열 필요' }, { status: 400 })
  }

  const { error } = await supabase
    .from('price_matrix')
    .upsert(rows, {
      onConflict: 'company_id,area_range,method,price_per_pyeong,item_index',
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
