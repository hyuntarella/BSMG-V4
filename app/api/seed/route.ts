import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import seedData from '@/price_matrix_seed.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/seed
 * price_matrix_seed.json → Supabase price_matrix 테이블
 * 1회만 실행하면 됨
 */
export async function POST(request: Request) {
  // company_id 필요
  const { company_id } = await request.json()
  if (!company_id) {
    return NextResponse.json({ error: 'company_id 필요' }, { status: 400 })
  }

  // 기존 데이터 삭제
  await supabase
    .from('price_matrix')
    .delete()
    .eq('company_id', company_id)

  const rows: {
    company_id: string
    area_range: string
    method: string
    price_per_pyeong: number
    item_index: number
    mat: number
    labor: number
    exp: number
  }[] = []

  const data = seedData as Record<string, Record<string, Record<string, number[][]>>>

  for (const areaRange of Object.keys(data)) {
    for (const method of Object.keys(data[areaRange])) {
      for (const ppp of Object.keys(data[areaRange][method])) {
        const items = data[areaRange][method][ppp]
        for (let i = 0; i < items.length; i++) {
          const [mat, labor, exp] = items[i]
          rows.push({
            company_id,
            area_range: areaRange,
            method,
            price_per_pyeong: parseInt(ppp),
            item_index: i,
            mat,
            labor,
            exp,
          })
        }
      }
    }
  }

  // batch insert (1000개씩)
  let inserted = 0
  for (let i = 0; i < rows.length; i += 1000) {
    const batch = rows.slice(i, i + 1000)
    const { error } = await supabase.from('price_matrix').insert(batch)
    if (error) {
      return NextResponse.json({ error: error.message, inserted }, { status: 500 })
    }
    inserted += batch.length
  }

  return NextResponse.json({ success: true, inserted, total: rows.length })
}
