-- Migration 012: 장비 단가를 labor → exp 컬럼으로 이동
--
-- 배경:
--   사다리차/스카이차/폐기물처리/드라이비트하부절개는 구조적으로 경비(exp) 항목인데,
--   과거 buildItems.ts 로직 버그로 labor 컬럼에 잘못 기록돼 왔음.
--   코드는 별도 커밋으로 수정했고, 이 마이그레이션은 기존 저장 데이터를 정리한다.
--
-- 적용 범위:
--   1) estimate_items: 장비 행의 labor 값을 exp로 이전
--   2) estimate_item_overrides: 동일 규칙 적용 (override 백업)
--
-- 안전 규칙:
--   - labor > 0 이고 exp = 0 인 경우에만 이전 (exp에 이미 값이 있으면 건드리지 않음 = 이중 집계 방지)
--   - original_labor / original_exp 는 편집 이력이므로 그대로 보존
--   - 금액 컬럼(labor_amount, exp_amount, total)은 단가 × qty 로 재계산
--
-- 롤백: 있는 그대로의 SQL 백업 필요 시 이전에 수동 dump 권장

BEGIN;

-- ── 1. estimate_items 정리 ───────────────────────────────────
-- 장비 4종만 대상. is_equipment 플래그가 과거에 누락된 행도 이름으로 잡는다.
WITH equipment_rows AS (
  SELECT id, qty, mat, labor, exp
  FROM estimate_items
  WHERE
    (is_equipment = true OR name IN ('사다리차','스카이차','폐기물처리','드라이비트하부절개'))
    AND labor > 0
    AND (exp IS NULL OR exp = 0)
)
UPDATE estimate_items ei
SET
  labor = 0,
  labor_amount = 0,
  exp = equipment_rows.labor,
  exp_amount = ROUND(COALESCE(equipment_rows.qty, 0) * equipment_rows.labor),
  total = ROUND(
    COALESCE(equipment_rows.qty, 0) * (
      COALESCE(equipment_rows.mat, 0) + equipment_rows.labor
    )
  )
FROM equipment_rows
WHERE ei.id = equipment_rows.id;

-- ── 2. estimate_item_overrides 정리 (있는 경우에만) ───────────
-- override 테이블 구조가 estimate_items와 다르면 스킵. 컬럼 존재 여부 확인 후 실행.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estimate_item_overrides'
      AND column_name = 'labor'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estimate_item_overrides'
      AND column_name = 'exp'
  ) THEN
    EXECUTE $sql$
      WITH equipment_override AS (
        SELECT id, labor
        FROM estimate_item_overrides
        WHERE
          name IN ('사다리차','스카이차','폐기물처리','드라이비트하부절개')
          AND labor > 0
          AND (exp IS NULL OR exp = 0)
      )
      UPDATE estimate_item_overrides eo
      SET labor = 0, exp = equipment_override.labor
      FROM equipment_override
      WHERE eo.id = equipment_override.id
    $sql$;
  END IF;
END $$;

-- ── 3. 감사 로그 (마이그레이션 흔적) ─────────────────────────
COMMENT ON TABLE estimate_items IS
  '장비 단가는 exp 컬럼 사용. 012_equipment_column_fix 마이그레이션으로 과거 labor 값을 exp로 이전함.';

COMMIT;
