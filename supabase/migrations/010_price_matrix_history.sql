-- 010_price_matrix_history.sql
-- 사장용 단가 시점 이력 (Phase 10에서 사용)

ALTER TABLE price_matrix
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE NULL,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES price_matrix(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_price_matrix_effective
  ON price_matrix(company_id, area_range, method, price_per_pyeong, effective_from);
