-- 011: 견적서 파일 URL 컬럼 추가 (Phase 4G)
-- json_url, composite_pdf_url, urethane_pdf_url, files_generated_at
-- 기존 excel_url, pdf_url은 001에서 이미 존재

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS json_url TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS composite_pdf_url TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS urethane_pdf_url TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS files_generated_at TIMESTAMPTZ;
