import { createClient } from '@/lib/supabase/server'
import { AcdbStats } from './types'

interface SeedEntry {
  canon: string
  display: string
  aliases: string[]
  unit: string
  spec_default: string
  spec_options: string[]
  usedCount: number
  mat: AcdbStats | null
  labor: AcdbStats | null
  exp: AcdbStats | null
  year_history: Record<string, {
    n: number
    mat_median: number | null
    labor_median: number | null
    exp_median: number | null
  }>
}

interface SeedFile {
  meta: Record<string, unknown>
  entries: SeedEntry[]
}

export async function importAcdbSeed(
  companyId: string,
  seed: SeedFile
): Promise<{ imported: number; skipped: number }> {
  const supabase = createClient()

  const { count } = await supabase
    .from('acdb_entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('source', 'seed')

  if ((count || 0) > 0) {
    return { imported: 0, skipped: count || 0 }
  }

  const entries = seed.entries.map(e => ({
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
    source: 'seed' as const,
  }))

  const BATCH = 100
  let imported = 0
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH)
    const { error } = await supabase.from('acdb_entries').insert(batch)
    if (error) throw error
    imported += batch.length
  }

  return { imported, skipped: 0 }
}
