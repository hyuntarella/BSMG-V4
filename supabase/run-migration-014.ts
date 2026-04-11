/**
 * 014_fix_encoding_and_extend_equipment.sql 마이그레이션을 supabase-js로 실행.
 *
 * 프로젝트가 supabase CLI에 링크되지 않아 raw SQL을 못 돌리므로 013 과 같은 방식으로
 * supabase-js REST 호출을 통해 동일 효과를 낸다.
 *
 * 실행: npx tsx supabase/run-migration-014.ts
 *
 * 효과:
 *  (1) presets 테이블에서 U+FFFD (�) 포함 행을 정상 한글로 복구.
 *      - '스◆이차' 패턴 → '스카이차'
 *      - 보호누름 '시멘트 모르◆르' → '시멘트 모르타르'
 *      - 그 외 U+FFFD 포함 행은 로그만 남기고 수작업 판단.
 *  (2) cost_config.equipment_prices 레거시 number 구조를 {mat,labor,exp} 신형 구조로 승격.
 *      + forklift/crane/ropeman 기본값 삽입.
 *
 * 방침: 데이터 손실 0. 이미 신형 구조이면 건너뜀. 멱등(여러 번 실행해도 안전).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// U+FFFD (REPLACEMENT CHARACTER) — 인코딩이 깨진 자리에 들어간 문자
const FFFD = '\uFFFD'

interface PriceEntry {
  mat: number
  labor: number
  exp: number
}

function isNewEntry(raw: unknown): raw is PriceEntry {
  return (
    !!raw &&
    typeof raw === 'object' &&
    typeof (raw as Record<string, unknown>).mat === 'number' &&
    typeof (raw as Record<string, unknown>).labor === 'number' &&
    typeof (raw as Record<string, unknown>).exp === 'number'
  )
}

function upgradeEntry(raw: unknown, fallback: PriceEntry): PriceEntry {
  if (isNewEntry(raw)) return raw
  if (typeof raw === 'number') return { mat: 0, labor: 0, exp: raw }
  return fallback
}

const DEFAULTS: Record<string, PriceEntry> = {
  ladder: { mat: 0, labor: 0, exp: 120000 },
  sky: { mat: 0, labor: 0, exp: 350000 },
  waste: { mat: 0, labor: 0, exp: 200000 },
  forklift: { mat: 0, labor: 0, exp: 700000 },
  crane: { mat: 0, labor: 0, exp: 1500000 },
  ropeman: { mat: 0, labor: 450000, exp: 600000 },
}

// ── (1) presets 한글 복구 ──
async function fixPresets() {
  console.log('🔧 (1) presets 한글 복구 시작...')

  const { data: allPresets, error: loadErr } = await supabase
    .from('presets')
    .select('id, name, spec')
  if (loadErr) {
    console.error('presets 로드 실패:', loadErr)
    process.exit(1)
  }
  if (!allPresets) {
    console.log('  presets 비어있음 — 스킵')
    return
  }

  const broken = allPresets.filter(
    (p) => (p.name && p.name.includes(FFFD)) || (p.spec && p.spec.includes(FFFD)),
  )
  if (broken.length === 0) {
    console.log('  깨진 presets 0건 — 스킵')
    return
  }
  console.log(`  깨진 presets ${broken.length}건 발견`)

  let fixed = 0
  for (const preset of broken) {
    const updates: { name?: string; spec?: string } = {}

    // '스◆이차' 패턴 → '스카이차'
    if (preset.name && /^스.*이차$/.test(preset.name) && preset.name.includes(FFFD)) {
      updates.name = '스카이차'
    }

    // 보호누름 spec '모르◆르' → '시멘트 모르타르'
    if (
      preset.name === '보호누름' &&
      preset.spec &&
      preset.spec.includes('모르') &&
      preset.spec.includes(FFFD)
    ) {
      updates.spec = '시멘트 모르타르'
    }

    if (Object.keys(updates).length === 0) {
      console.warn(
        `  ⚠️  수작업 필요: id=${preset.id} name="${preset.name}" spec="${preset.spec}"`,
      )
      continue
    }

    const { error: updErr } = await supabase
      .from('presets')
      .update(updates)
      .eq('id', preset.id)
    if (updErr) {
      console.error(`  ❌ ${preset.id} 복구 실패:`, updErr)
      continue
    }
    console.log(`  ✅ ${preset.id}: ${JSON.stringify(updates)}`)
    fixed += 1
  }
  console.log(`  복구 완료: ${fixed}/${broken.length}`)
}

// ── (2) cost_config.equipment_prices 구조 승격 ──
async function upgradeEquipmentPrices() {
  console.log('🔧 (2) cost_config.equipment_prices 구조 승격 시작...')

  const { data: rows, error: loadErr } = await supabase
    .from('cost_config')
    .select('company_id, config')
  if (loadErr) {
    console.error('cost_config 로드 실패:', loadErr)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('  cost_config 비어있음 — 스킵')
    return
  }

  let upgraded = 0
  for (const row of rows) {
    const config = (row.config ?? {}) as Record<string, unknown>
    const currentEquip = (config.equipment_prices ?? {}) as Record<string, unknown>

    const newEquip: Record<string, PriceEntry> = {
      ladder: upgradeEntry(currentEquip.ladder, DEFAULTS.ladder),
      sky: upgradeEntry(currentEquip.sky, DEFAULTS.sky),
      waste: upgradeEntry(currentEquip.waste, DEFAULTS.waste),
      forklift: upgradeEntry(currentEquip.forklift, DEFAULTS.forklift),
      crane: upgradeEntry(currentEquip.crane, DEFAULTS.crane),
      ropeman: upgradeEntry(currentEquip.ropeman, DEFAULTS.ropeman),
    }

    // 이미 신형 구조이고 6 키가 전부 있다면 스킵 (멱등)
    const alreadyNew =
      isNewEntry(currentEquip.ladder) &&
      isNewEntry(currentEquip.sky) &&
      isNewEntry(currentEquip.waste) &&
      isNewEntry(currentEquip.forklift) &&
      isNewEntry(currentEquip.crane) &&
      isNewEntry(currentEquip.ropeman)

    if (alreadyNew) {
      console.log(`  ✅ ${row.company_id} 이미 신형 구조 — 스킵`)
      continue
    }

    const newConfig = { ...config, equipment_prices: newEquip }
    const { error: updErr } = await supabase
      .from('cost_config')
      .update({ config: newConfig, updated_at: new Date().toISOString() })
      .eq('company_id', row.company_id)
    if (updErr) {
      console.error(`  ❌ ${row.company_id} 업데이트 실패:`, updErr)
      continue
    }
    console.log(`  ✅ ${row.company_id} equipment_prices 승격 완료`)
    upgraded += 1
  }
  console.log(`  승격 완료: ${upgraded}/${rows.length}`)
}

async function main() {
  console.log('🏗️  014 마이그레이션 시작...')
  await fixPresets()
  await upgradeEquipmentPrices()
  console.log('🎉 014 마이그레이션 완료')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
