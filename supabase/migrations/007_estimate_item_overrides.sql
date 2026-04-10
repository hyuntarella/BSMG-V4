-- 007_estimate_item_overrides.sql
-- v1 기능 부활: #4(단가잠금), #5(공종숨김), #7~9(오버라이드), #11(lump), #12(자유입력), #13(우레탄동기화)

ALTER TABLE estimate_items
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lump_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS original_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS original_spec TEXT NULL,
  ADD COLUMN IF NOT EXISTS original_unit TEXT NULL,
  ADD COLUMN IF NOT EXISTS original_qty NUMERIC NULL;

ALTER TABLE estimate_sheets
  ADD COLUMN IF NOT EXISTS is_free_mode BOOLEAN DEFAULT FALSE;

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS sync_urethane BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN estimate_items.is_locked IS '단가 잠금. 평단가 변경해도 갱신 안 됨';
COMMENT ON COLUMN estimate_items.is_hidden IS '공종 숨김. UI 미표시 (삭제 아님)';
COMMENT ON COLUMN estimate_items.lump_amount IS '식 단위 lump 금액. NULL이면 단가×수량 사용';
COMMENT ON COLUMN estimate_items.original_name IS '오버라이드 전 원본 이름 (BASE 복원용)';
COMMENT ON COLUMN estimate_sheets.is_free_mode IS 'BASE 없이 자유입력 모드';
COMMENT ON COLUMN estimates.sync_urethane IS '복합 탭 우레탄 항목을 우레탄 탭 단가로 자동 일치';
