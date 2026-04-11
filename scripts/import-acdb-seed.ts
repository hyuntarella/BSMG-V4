/**
 * acdb-seed.json 을 acdb_entries 테이블에 주입.
 * - 이미 source='seed' 행이 있으면 skip (lib/acdb/import.ts 와 동일 정책)
 * - 실행: npx tsx scripts/import-acdb-seed.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal() {
  try {
    const c = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of c.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  } catch {}
}

interface SeedEntry {
  canon: string
  display: string
  aliases: string[]
  unit: string
  spec_default: string
  spec_options: string[]
  usedCount: number
  mat: unknown
  labor: unknown
  exp: unknown
  year_history: Record<string, unknown>
}
interface SeedFile { meta: Record<string, unknown>; entries: SeedEntry[] }

loadEnvLocal()

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('[X] Supabase env 없음'); process.exit(1) }
  const sb = createClient(url, key)

  const { data: co } = await sb.from('companies').select('id,name').limit(1)
  const companyId = co?.[0]?.id
  const companyName = co?.[0]?.name
  if (!companyId) { console.error('[X] 회사 없음'); process.exit(2) }
  console.log(`[1] target company: ${companyName} (${companyId})`)

  const seed = JSON.parse(readFileSync(resolve(process.cwd(), 'data/acdb-seed.json'), 'utf-8')) as SeedFile
  console.log(`[2] seed entries: ${seed.entries.length}`)

  const { count: existing } = await sb
    .from('acdb_entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('source', 'seed')
  if ((existing || 0) > 0) {
    console.log(`[3] 이미 seed ${existing}건 존재 — skip`)
    return
  }

  const rows = seed.entries.map((e) => ({
    company_id: companyId,
    canon: e.canon,
    display: e.display,
    aliases: e.aliases,
    unit: e.unit,
    spec_default: e.spec_default,
    spec_options: e.spec_options,
    used_count: e.usedCount,
    mat_stats: e.mat,
    labor_stats: e.labor,
    exp_stats: e.exp,
    year_history: e.year_history,
    source: 'seed',
  }))

  const BATCH = 100
  let ok = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await sb.from('acdb_entries').insert(batch)
    if (error) {
      console.error(`[X] batch ${i}:`, error.message)
      process.exit(3)
    }
    ok += batch.length
    process.stdout.write(`\r[4] inserted ${ok}/${rows.length}`)
  }
  console.log(`\n[5] done — ${ok}건 주입 완료`)
}

main().catch((e) => { console.error(e); process.exit(99) })
