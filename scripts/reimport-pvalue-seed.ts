/**
 * P값 시드 재임포트 (덮어쓰기 모드)
 *
 * 012_equipment_column_fix 마이그레이션과 짝을 이루는 스크립트.
 * 기존 price_matrix 데이터를 DELETE → INSERT 로 완전히 새 seed로 교체한다.
 *
 * 실행:
 *   node --env-file=.env.local -e "require('tsx/cjs'); require('./scripts/reimport-pvalue-seed.ts')"
 *   또는
 *   npx tsx scripts/reimport-pvalue-seed.ts
 *   (후자는 환경변수가 shell에 export 돼 있어야 함)
 *
 * 안전장치:
 *   - --yes 플래그 없으면 dry-run (삭제/삽입 건수만 출력하고 종료)
 *   - company_id 별로 이전 데이터 존재 여부 확인 → 대상 company_id 리스트 표시
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const DRY_RUN = !process.argv.includes('--yes')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type SeedJson = Record<string, Record<string, Record<string, number[][]>>>

async function main() {
  console.log(`\n📖 P값 시드 읽기... (mode=${DRY_RUN ? 'DRY-RUN' : 'APPLY'})\n`)

  const seedPath = resolve(__dirname, '..', 'supabase', 'price_matrix_pvalue_seed.json')
  const rawMatrix: SeedJson = JSON.parse(readFileSync(seedPath, 'utf-8'))

  // 1. 기존 company_id 목록 조회
  const { data: existing, error: listErr } = await supabase
    .from('price_matrix')
    .select('company_id')
    .limit(5000)

  if (listErr) {
    console.error('기존 데이터 조회 실패:', listErr.message)
    process.exit(1)
  }

  const companyIds = Array.from(new Set((existing ?? []).map((r) => r.company_id)))
  console.log(`기존 price_matrix company_id (${companyIds.length}개):`)
  for (const cid of companyIds) console.log(`  - ${cid}`)

  // 2. seed를 각 company_id 용 row로 확장
  const buildRows = (companyId: string) => {
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
    for (const [areaRange, methods] of Object.entries(rawMatrix)) {
      for (const [method, prices] of Object.entries(methods)) {
        for (const [ppp, items] of Object.entries(prices)) {
          items.forEach((costs, idx) => {
            rows.push({
              company_id: companyId,
              area_range: areaRange,
              method,
              price_per_pyeong: parseInt(ppp),
              item_index: idx,
              mat: costs[0] ?? 0,
              labor: costs[1] ?? 0,
              exp: costs[2] ?? 0,
              effective_from: '2025-04-01',
            })
          })
        }
      }
    }
    return rows
  }

  // 샘플 rows 로 통계만 출력
  const sampleRows = buildRows(companyIds[0] ?? '00000000-0000-0000-0000-000000000001')
  console.log(`\n📊 seed → row 변환: 회사당 ${sampleRows.length} rows`)
  console.log(`   총 삽입 예정: ${sampleRows.length * companyIds.length} rows`)

  if (DRY_RUN) {
    console.log('\n⚠️  DRY-RUN 모드: 실제 DELETE/INSERT는 실행하지 않습니다.')
    console.log('   적용하려면 --yes 플래그를 붙여 다시 실행하세요.\n')
    return
  }

  // 3. 각 company 별로 DELETE → INSERT (트랜잭션은 supabase-js 제한으로 배치 단위)
  for (const companyId of companyIds) {
    console.log(`\n▶ [${companyId}] 처리 중...`)

    // delete
    const { error: delErr, count: delCount } = await supabase
      .from('price_matrix')
      .delete({ count: 'exact' })
      .eq('company_id', companyId)

    if (delErr) {
      console.error(`  DELETE 실패: ${delErr.message}`)
      process.exit(1)
    }
    console.log(`  DELETE: ${delCount} rows`)

    // insert 500개씩
    const rows = buildRows(companyId)
    let inserted = 0
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error: insErr } = await supabase.from('price_matrix').insert(batch)
      if (insErr) {
        console.error(`  INSERT batch ${i} 실패: ${insErr.message}`)
        process.exit(1)
      }
      inserted += batch.length
    }
    console.log(`  INSERT: ${inserted} rows`)
  }

  console.log(`\n✅ 재임포트 완료.\n`)
}

main().catch((e) => {
  console.error('예외:', e)
  process.exit(1)
})
