-- 006_create_inquiries.sql
-- CRM 재구축: inquiries 테이블 (crm_customers 대체)

-- 파이프라인 단계
DO $$ BEGIN
  CREATE TYPE pipeline_stage AS ENUM (
    '문의접수','연락대기','견적서전송','한달이상걸림',
    '계약중','착수금대기','착수금완료','공사중',
    '잔금대기','잔금완료','정산대기','정산완료','보수완료'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 채널
DO $$ BEGIN
  CREATE TYPE inquiry_channel AS ENUM (
    'naver_powerlink','naver_powercontent','naver_phone',
    'soomgo','daum_nate','referral','etc'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 시공 분야
DO $$ BEGIN
  CREATE TYPE work_type AS ENUM (
    '옥상','외벽','화장실','지하','베란다','기타'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 계약 상태
DO $$ BEGIN
  CREATE TYPE contract_status_enum AS ENUM (
    '진행중','Won','Lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 메인 테이블
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 자동 필드
  channel inquiry_channel NOT NULL DEFAULT 'etc',
  utm_medium TEXT,
  utm_keyword TEXT,
  first_response_at TIMESTAMPTZ,
  stage_changed_at TIMESTAMPTZ DEFAULT now(),

  -- 필수 입력 필드
  address TEXT NOT NULL,
  client_name TEXT,
  phone TEXT,
  work_type work_type DEFAULT '기타',

  -- 선택 입력 필드
  estimate_amount INTEGER,
  contract_amount INTEGER,
  area_sqm NUMERIC,
  memo TEXT,

  -- 체크박스
  proposal_sent BOOLEAN NOT NULL DEFAULT false,
  ir_inspection BOOLEAN NOT NULL DEFAULT false,
  case_documented BOOLEAN NOT NULL DEFAULT false,

  -- 파이프라인
  pipeline_stage pipeline_stage NOT NULL DEFAULT '문의접수',
  contract_status contract_status_enum NOT NULL DEFAULT '진행중',

  -- 담당자
  manager TEXT,

  -- 소개 출처
  referral_source TEXT,

  -- 기존 CRM 링크 (마이그레이션용)
  legacy_crm_id UUID,
  drive_url TEXT,
  estimate_web_url TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_inquiries_pipeline ON inquiries(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_inquiries_channel ON inquiries(channel);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_contract ON inquiries(contract_status);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inquiries_updated ON inquiries;
CREATE TRIGGER trg_inquiries_updated
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_inquiries_updated_at();

-- stage_changed_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_inquiries_stage_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    NEW.stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inquiries_stage_changed ON inquiries;
CREATE TRIGGER trg_inquiries_stage_changed
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_inquiries_stage_changed_at();
