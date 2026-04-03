-- ============================================
-- 캘린더 마이그레이션 — calendar_events + calendar_members
-- Notion Calendar → Supabase 이전용
-- ============================================

CREATE TABLE calendar_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT '(이름 없음)',
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE,

  title TEXT NOT NULL DEFAULT '(제목 없음)',
  start_at TEXT NOT NULL,         -- ISO datetime 또는 YYYY-MM-DD
  end_at TEXT,
  all_day BOOLEAN DEFAULT false,
  type TEXT DEFAULT '기타',        -- 방문, 시공, 미팅, 기타
  action TEXT,                     -- 방문, 견적, 시공, 하자점검
  color TEXT DEFAULT '#6B7280',

  member_id UUID REFERENCES calendar_members(id),
  member_name TEXT,

  crm_customer_id TEXT,            -- CRM 고객 UUID (crm_customers.id 또는 notion_id)
  crm_customer_name TEXT,

  memo TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_cal_events_start ON calendar_events(start_at);
CREATE INDEX idx_cal_events_type ON calendar_events(type);
CREATE INDEX idx_cal_events_member ON calendar_events(member_id);
CREATE INDEX idx_cal_events_notion ON calendar_events(notion_id);
CREATE INDEX idx_cal_members_notion ON calendar_members(notion_id);

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cal_events_auth" ON calendar_events FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "cal_members_auth" ON calendar_members FOR ALL
  USING (auth.role() = 'authenticated');

-- updated_at 자동 갱신
CREATE TRIGGER cal_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
