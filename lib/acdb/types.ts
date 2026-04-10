export interface AcdbStats {
  n: number
  min: number
  p25: number
  median: number
  p75: number
  max: number
  mean: number
}

export interface AcdbYearHistory {
  [year: string]: {
    n: number
    mat_median: number | null
    labor_median: number | null
    exp_median: number | null
  }
}

export interface AcdbEntry {
  id?: string
  company_id?: string
  canon: string
  display: string
  aliases: string[]
  unit: string
  spec_default: string
  spec_options: string[]
  used_count: number
  last_used_at?: string
  mat_stats: AcdbStats | null
  labor_stats: AcdbStats | null
  exp_stats: AcdbStats | null
  year_history: AcdbYearHistory
  source: 'seed' | 'manual' | 'learned'
}

export interface AcdbSearchResult {
  entry: AcdbEntry
  matchType: 'exact' | 'prefix' | 'contains' | 'chosung' | 'alias'
  score: number
}
