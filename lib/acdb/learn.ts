import { EstimateItem } from '@/lib/estimate/types'
import { upsertAcdbEntry, incrementUsedCount } from './client'
import { AcdbEntry } from './types'
import { canonicalize } from './canonical'

export async function learnFromItem(
  companyId: string,
  item: EstimateItem
): Promise<void> {
  const canon = canonicalize(item.name)
  if (!canon) return

  try {
    await incrementUsedCount(companyId, canon)
  } catch {
    const entry: AcdbEntry = {
      company_id: companyId,
      canon,
      display: item.name,
      aliases: [],
      unit: item.unit,
      spec_default: item.spec || '',
      spec_options: item.spec ? [item.spec] : [],
      used_count: 1,
      mat_stats: item.mat ? singleStat(item.mat) : null,
      labor_stats: item.labor ? singleStat(item.labor) : null,
      exp_stats: item.exp ? singleStat(item.exp) : null,
      year_history: {},
      source: 'learned',
    }
    await upsertAcdbEntry(entry)
  }
}

function singleStat(v: number) {
  return { n: 1, min: v, p25: v, median: v, p75: v, max: v, mean: v }
}
