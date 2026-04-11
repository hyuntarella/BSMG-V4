/**
 * acdb 데이터 진단 스크립트
 * 실행: npx tsx scripts/diag-acdb.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  } catch {}
}

loadEnvLocal()

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('[X] Supabase env 없음'); process.exit(1) }
  const sb = createClient(url, key)

  // 1) 기본 회사
  const { data: co } = await sb.from('companies').select('id,name').limit(1)
  console.log('[1] companies[0] =', co?.[0])
  const companyId = co?.[0]?.id
  if (!companyId) { console.error('[X] 회사 없음'); process.exit(2) }

  // 2) acdb_entries count
  const { count: acdbCount, error: e1 } = await sb
    .from('acdb_entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
  console.log('[2] acdb_entries count =', acdbCount, 'err =', e1?.message ?? 'none')

  // 3) 샘플 3건
  const { data: sample } = await sb
    .from('acdb_entries')
    .select('canon, display, used_count')
    .eq('company_id', companyId)
    .limit(3)
  console.log('[3] sample =', sample)

  // 4) cost_config favorites 병합 소스 확인
  const { data: cfg } = await sb
    .from('cost_config')
    .select('config')
    .eq('company_id', companyId)
    .maybeSingle()
  const favs = (cfg?.config as any)?.favorites
  const favCount = Array.isArray(favs) ? favs.reduce((n: number, c: any) => n + (c?.chips?.length ?? 0), 0) : 0
  console.log('[4] cost_config.favorites total chips =', favCount)

  // 5) /api/acdb/list 흉내
  console.log('\n[요약]')
  console.log('  acdb_entries rows   :', acdbCount)
  console.log('  favorites chips     :', favCount)
  console.log('  => API 응답 예상 건수:', (acdbCount ?? 0) + favCount)
}

main().catch((e) => { console.error(e); process.exit(99) })
