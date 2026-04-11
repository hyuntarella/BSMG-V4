import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { AcdbEntry } from '@/lib/acdb/types'
import type { QuickChipCategory } from '@/lib/estimate/quickChipConfig'
import { isQuickChipCategoryArray } from '@/lib/estimate/favorites'

// 규칙서 acdb 제안 소스 — 견적서 품명 셀 자동완성용.
//
// 반환: AcdbEntry[]
//   - acdb_entries 테이블 (서비스 롤로 읽어 RLS/companyId 이슈 회피)
//   - + cost_config 의 favorites / other_items / new_items 를 pseudo AcdbEntry 로 병합
//   - 중복(canon 기준) 제거
//
// 이 엔드포인트는 클라이언트 useAcdbSuggest 훅이 직접 호출한다.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function getDefaultCompanyId(): Promise<string | null> {
  const { data } = await supabase.from('companies').select('id').limit(1).single()
  return data?.id ?? null
}

function normalizeCanon(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

function pseudoEntry(
  name: string,
  unit: string,
  source: 'manual' | 'learned' = 'manual',
): AcdbEntry {
  return {
    canon: name,
    display: name,
    aliases: [],
    unit: unit || 'm²',
    spec_default: '',
    spec_options: [],
    used_count: 0,
    mat_stats: null,
    labor_stats: null,
    exp_stats: null,
    year_history: {},
    source,
  }
}

export async function GET() {
  const companyId = await getDefaultCompanyId()
  if (!companyId) {
    return NextResponse.json({ entries: [] as AcdbEntry[], warning: 'no company' })
  }

  const byCanon = new Map<string, AcdbEntry>()

  // 1) acdb_entries
  const { data: acdbRows, error: acdbErr } = await supabase
    .from('acdb_entries')
    .select('*')
    .eq('company_id', companyId)
    .order('used_count', { ascending: false })
    .limit(2000)

  if (!acdbErr && acdbRows) {
    for (const row of acdbRows as unknown as AcdbEntry[]) {
      const key = normalizeCanon(row.canon)
      if (!byCanon.has(key)) byCanon.set(key, row)
    }
  }

  // 2) cost_config → favorites / other_items / new_items
  const { data: cfgRow } = await supabase
    .from('cost_config')
    .select('config')
    .eq('company_id', companyId)
    .single()

  const cfg = (cfgRow?.config ?? {}) as Record<string, unknown>

  // 2a) favorites
  const favRaw = cfg.favorites
  if (isQuickChipCategoryArray(favRaw)) {
    for (const cat of favRaw as QuickChipCategory[]) {
      for (const chip of cat.chips) {
        const key = normalizeCanon(chip.name)
        if (!byCanon.has(key)) byCanon.set(key, pseudoEntry(chip.name, chip.unit, 'manual'))
      }
    }
  }

  // 2b) other_items
  const other = cfg.other_items as Record<string, { unit?: string }> | undefined
  if (other && typeof other === 'object') {
    for (const [name, entry] of Object.entries(other)) {
      const key = normalizeCanon(name)
      if (!byCanon.has(key)) byCanon.set(key, pseudoEntry(name, entry?.unit ?? 'm²', 'manual'))
    }
  }

  // 2c) new_items
  const newItems = cfg.new_items as Record<string, { unit?: string }> | undefined
  if (newItems && typeof newItems === 'object') {
    for (const [name, entry] of Object.entries(newItems)) {
      const key = normalizeCanon(name)
      if (!byCanon.has(key)) byCanon.set(key, pseudoEntry(name, entry?.unit ?? 'm²', 'learned'))
    }
  }

  return NextResponse.json({ entries: Array.from(byCanon.values()) })
}
