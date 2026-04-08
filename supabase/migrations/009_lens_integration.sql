-- 009_lens_integration.sql
-- lens 슈퍼앱 연동: 외부 견적 ID, 웹훅 로그

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS external_quote_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS external_customer_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS input_mode TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_estimates_external_quote_id
  ON estimates(external_quote_id)
  WHERE external_quote_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lens_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL,
  endpoint TEXT,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  error TEXT,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lens_webhook_log_created ON lens_webhook_log(created_at DESC);

COMMENT ON COLUMN estimates.external_quote_id IS 'lens 발급 quoteId. NULL이면 직접 생성';
COMMENT ON COLUMN estimates.source IS 'direct | lens';
COMMENT ON COLUMN estimates.input_mode IS 'voice | form';
