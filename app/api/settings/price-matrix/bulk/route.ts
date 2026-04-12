import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { PriceMatrixRow } from '@/lib/estimate/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * GET /api/settings/price-matrix/bulk
 * 전체 P매트릭스 일괄 조회 (복합 26세트 + 우레탄 18세트).
 * 진입 시 1회 호출, 이후 클라이언트 메모리에서 필터링.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('price_matrix')
    .select('*')
    .order('method')
    .order('area_range')
    .order('price_per_pyeong')
    .order('item_index')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rows: data as PriceMatrixRow[] })
}
