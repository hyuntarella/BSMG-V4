import { createClient } from '@/lib/supabase/client'
import { AcdbEntry } from './types'

export async function fetchAllAcdb(companyId: string): Promise<AcdbEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('acdb_entries')
    .select('*')
    .eq('company_id', companyId)
    .order('used_count', { ascending: false })
  if (error) throw error
  return (data || []) as AcdbEntry[]
}

export async function upsertAcdbEntry(entry: AcdbEntry): Promise<AcdbEntry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('acdb_entries')
    .upsert(entry, { onConflict: 'company_id,canon' })
    .select()
    .single()
  if (error) throw error
  return data as AcdbEntry
}

export async function incrementUsedCount(companyId: string, canon: string): Promise<void> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('acdb_entries')
    .select('used_count')
    .eq('company_id', companyId)
    .eq('canon', canon)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('acdb_entries')
      .update({
        used_count: existing.used_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('canon', canon)
  }
}
