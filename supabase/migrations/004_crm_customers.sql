-- ============================================
-- CRM 마이그레이션 — crm_customers + crm_comments
-- Notion CRM → Supabase 이전용
-- ============================================

CREATE TABLE crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE,

  -- 기본 정보
  address TEXT NOT NULL DEFAULT '',
  customer_name TEXT,
  phone TEXT,
  email TEXT,
  manager TEXT,

  -- 상태
  stage TEXT,
  pipeline TEXT DEFAULT '신규문의',
  contract_status TEXT,
  inquiry_channel TEXT,
  work_types TEXT[] DEFAULT '{}',

  -- 금액
  estimate_amount BIGINT,
  contract_amount BIGINT,
  deposit BIGINT,
  balance BIGINT,

  -- 기타 정보
  area TEXT,
  memo TEXT,

  -- 날짜
  inquiry_date DATE,
  visit_date DATE,
  balance_complete_date DATE,
  estimate_sent_date DATE,
  estimate_viewed_date DATE,

  -- URL
  drive_url TEXT,
  estimate_web_url TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_crm_customers_name ON crm_customers(customer_name);
CREATE INDEX idx_crm_customers_address ON crm_customers(address);
CREATE INDEX idx_crm_customers_pipeline ON crm_customers(pipeline);
CREATE INDEX idx_crm_customers_stage ON crm_customers(stage);
CREATE INDEX idx_crm_customers_notion ON crm_customers(notion_id);
CREATE INDEX idx_crm_comments_customer ON crm_comments(customer_id);

-- RLS
ALTER TABLE crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_customers_auth" ON crm_customers FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "crm_comments_auth" ON crm_comments FOR ALL
  USING (auth.role() = 'authenticated');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_customers_updated_at
  BEFORE UPDATE ON crm_customers
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
