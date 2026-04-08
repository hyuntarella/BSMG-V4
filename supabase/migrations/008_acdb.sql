-- 008_acdb.sql
-- v1 acDB (학습형 자동완성). 519개 시드 + 학습된 항목

CREATE TABLE IF NOT EXISTS acdb_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  canon TEXT NOT NULL,
  display TEXT NOT NULL,
  aliases TEXT[] DEFAULT ARRAY[]::TEXT[],
  unit TEXT NOT NULL,
  spec_default TEXT DEFAULT '',
  spec_options TEXT[] DEFAULT ARRAY[]::TEXT[],
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  mat_stats JSONB,
  labor_stats JSONB,
  exp_stats JSONB,
  year_history JSONB DEFAULT '{}'::JSONB,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, canon)
);

CREATE INDEX idx_acdb_company ON acdb_entries(company_id);
CREATE INDEX idx_acdb_canon ON acdb_entries(canon);
CREATE INDEX idx_acdb_used_count ON acdb_entries(company_id, used_count DESC);

ALTER TABLE acdb_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY acdb_company_isolation ON acdb_entries
  FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

COMMENT ON TABLE acdb_entries IS 'v1의 acDB (학습형 자동완성). 519개 시드 + 학습된 항목';
COMMENT ON COLUMN acdb_entries.source IS 'seed | manual | learned';
