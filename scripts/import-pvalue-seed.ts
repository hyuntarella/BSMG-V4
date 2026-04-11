/**
 * P값 시드 JSON → Supabase price_matrix 테이블 import
 *
 * 실행: npx tsx scripts/import-pvalue-seed.ts
 *
 * 기존 데이터 보존: UNIQUE 충돌 시 스킵 (onConflict: ignoreDuplicates)
 * 기존 /api/seed 로직 변경 없음.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const COMPANY_ID = '00000000-0000-0000-0000-000000000001'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('📖 P값 시드 읽기...')

  const seedPath = resolve(__dirname, '..', 'supabase', 'price_matrix_pvalue_seed.json')
  const rawMatrix = JSON.parse(readFileSync(seedPath, 'utf-8'))

  const rows: {
    company_id: string
    area_range: string
    method: string
    price_per_pyeong: number
    item_index: number
    mat: number
    labor: number
    exp: number
    effective_from: string
  }[] = []

  for (const [areaRange, methods] of Object.entries(rawMatrix) as [string, Record<string, Record<string, number[][]>>][]) {
    for (const [method, prices] of Object.entries(methods)) {
      for (const [ppp, items] of Object.entries(prices)) {
        items.forEach((costs: number[], idx: number) => {
          rows.push({
            company_id: COMPANY_ID,
            area_range: areaRange,
            method,
            price_per_pyeong: parseInt(ppp),
            item_index: idx,
            mat: costs[0],
            labor: costs[1],
            exp: costs[2],
            effective_from: '2025-04-01',
          })
        })
      }
    }
  }

  console.log(`📊 총 ${rows.length} rows`)

  // UNIQUE 충돌 체크용 카운터
  let inserted = 0
  let skipped = 0

  // 배치 insert (500개씩, ignoreDuplicates)
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error, count } = await supabase
      .from('price_matrix')
      .upsert(batch, {
        onConflict: 'company_id,area_range,method,price_per_pyeong,item_index',
        ignoreDuplicates: true,
      })

    if (error) {
      console.error(`❌ Batch ${i} 오류:`, error.message)
      // UNIQUE 충돌률 체크
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        skipped += batch.length
        continue
      }
      process.exit(1)
    }
    inserted += batch.length
  }

  console.log(`✅ Import 완료: ${inserted} inserted, ${skipped} skipped (중복)`)

  // 충돌률 체크
  const conflictRate = skipped / rows.length
  if (conflictRate > 0.10) {
    console.warn(`⚠️  UNIQUE 충돌률 ${(conflictRate * 100).toFixed(1)}% > 10%`)
  }
}

main().catch(console.error)
