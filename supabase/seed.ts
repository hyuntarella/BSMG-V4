/**
 * Supabase seed 스크립트
 *
 * 실행: npx tsx supabase/seed.ts
 *
 * - 기본 company + admin user 생성
 * - price_matrix_seed.json → price_matrix 테이블
 * - PRESETS_DEFAULT → presets 테이블
 * - COST_TABLE → cost_config 테이블
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 기본 프리셋 ──
const PRESETS_DEFAULT = [
  { name: '바탕정리', spec: '기존 방수층 철거', unit: 'm²', mat: 300, labor: 700, exp: 0, category: 'base' },
  { name: '바탕조정제', spec: '', unit: 'm²', mat: 0, labor: 0, exp: 0, category: 'base' },
  { name: '바탕미장', spec: '시멘트 액체 방수', unit: 'm²', mat: 700, labor: 1300, exp: 0, category: 'base' },
  { name: '복합시트', spec: '개량형 1.5T', unit: 'm²', mat: 9000, labor: 6000, exp: 500, category: 'complex' },
  { name: '보호누름', spec: '시멘트 모르���르', unit: 'm²', mat: 1300, labor: 1700, exp: 0, category: 'complex' },
  { name: '우레탄도막', spec: '1차+2차 (KS)', unit: 'm²', mat: 7500, labor: 4500, exp: 500, category: 'complex' },
  { name: '상도 (톱코트)', spec: '불소계', unit: 'm²', mat: 5000, labor: 4300, exp: 500, category: 'common' },
  { name: '벽체실링', spec: '우레탄실링', unit: 'm', mat: 2200, labor: 1800, exp: 0, category: 'common' },
  { name: '노출 우레탄 1차', spec: 'KS 인증 1.0mm', unit: 'm²', mat: 6000, labor: 4000, exp: 500, category: 'urethane' },
  { name: '노출 우레탄 2차', spec: 'KS 인증 1.0mm', unit: 'm²', mat: 4000, labor: 3000, exp: 500, category: 'urethane' },
  { name: '크랙보수', spec: 'V컷 + 실링', unit: 'm', mat: 3000, labor: 5000, exp: 0, category: 'extra' },
  { name: '드라이비트 절개', spec: '', unit: 'm', mat: 0, labor: 3500, exp: 0, category: 'extra' },
  { name: '사다리차', spec: '1톤', unit: '일', mat: 0, labor: 0, exp: 120000, category: 'equipment' },
  { name: '폐기물 처리', spec: '마대 및 운반', unit: '일', mat: 0, labor: 0, exp: 200000, category: 'equipment' },
  { name: '스���이차', spec: '0.5톤', unit: '일', mat: 0, labor: 0, exp: 350000, category: 'equipment' },
]

// ── 원가 테이블 ──
const COST_CONFIG = {
  complex: {
    '20평이하': 15000,
    '50평미만': 13000,
    '50~100평': 12000,
    '100~200평': 11000,
    '200평이상': 10000,
  },
  urethane: {
    '20평이하': 12000,
    '50평미만': 10500,
    '50~100평': 9500,
    '100~200평': 8500,
    '200평이상': 7500,
  },
}

async function main() {
  console.log('🏗️  Seed 시작...')

  // 1. 기본 company 생성
  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .upsert({ name: '방수명가', ceo_name: '대표', phone: '010-0000-0000' }, { onConflict: 'id' })
    .select()
    .single()

  if (companyErr) {
    console.error('Company 생��� 실패:', companyErr)
    // company가 이미 있을 수 있음 — 조회 시도
    const { data: existing } = await supabase.from('companies').select().limit(1).single()
    if (!existing) {
      console.error('Company 조회도 실패')
      process.exit(1)
    }
    console.log('기존 company 사용:', existing.id)
    await seedData(existing.id)
    return
  }

  console.log('✅ Company:', company.id)
  await seedData(company.id)
}

async function seedData(companyId: string) {
  // 2. P매트릭스 seed
  const seedPath = resolve(__dirname, '..', 'price_matrix_seed.json')
  const rawMatrix = JSON.parse(readFileSync(seedPath, 'utf-8'))

  const matrixRows: {
    company_id: string
    area_range: string
    method: string
    price_per_pyeong: number
    item_index: number
    mat: number
    labor: number
    exp: number
  }[] = []

  for (const [areaRange, methods] of Object.entries(rawMatrix) as [string, Record<string, Record<string, number[][]>>][]) {
    for (const [method, prices] of Object.entries(methods)) {
      for (const [ppp, items] of Object.entries(prices)) {
        items.forEach((costs: number[], idx: number) => {
          matrixRows.push({
            company_id: companyId,
            area_range: areaRange,
            method,
            price_per_pyeong: parseInt(ppp),
            item_index: idx,
            mat: costs[0],
            labor: costs[1],
            exp: costs[2],
          })
        })
      }
    }
  }

  console.log(`📊 P매트릭스: ${matrixRows.length} rows`)

  // 배치 insert (500개씩)
  for (let i = 0; i < matrixRows.length; i += 500) {
    const batch = matrixRows.slice(i, i + 500)
    const { error } = await supabase.from('price_matrix').upsert(batch, {
      onConflict: 'company_id,area_range,method,price_per_pyeong,item_index',
    })
    if (error) console.error(`P매트릭스 batch ${i} 오류:`, error)
  }
  console.log('✅ P매트릭스 완료')

  // 3. 프리셋 seed
  const presetRows = PRESETS_DEFAULT.map(p => ({ ...p, company_id: companyId }))
  const { error: presetErr } = await supabase.from('presets').upsert(presetRows, {
    onConflict: 'id',
  })
  if (presetErr) console.error('프리셋 오류:', presetErr)
  else console.log('✅ 프리셋 완료')

  // 4. 원가 테이블 seed
  const { error: costErr } = await supabase.from('cost_config').upsert({
    company_id: companyId,
    config: COST_CONFIG,
  }, {
    onConflict: 'company_id',
  })
  if (costErr) console.error('원가 ���류:', costErr)
  else console.log('✅ 원가 테이블 완료')

  console.log('🎉 Seed 완료!')
}

main().catch(console.error)
