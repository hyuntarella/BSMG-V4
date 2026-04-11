-- 014_fix_encoding_and_extend_equipment.sql
--
-- (1) seed 시점 인코딩 깨짐으로 저장된 presets 행을 정상 한글로 복구.
--     대상: '스◆◆◆이차' → '스카이차', '모르◆◆◆르' (보호누름 spec) → '모르타르'
--     U+FFFD 치환문자(�)를 포함한 모든 presets 행을 안전 식별해 업데이트.
--
-- (2) cost_config.equipment_prices 레거시 형태 {ladder: number} 를 신형
--     {ladder: {mat, labor, exp}} 구조로 in-place 마이그레이션.
--     + 신규 키 forklift / crane / ropeman 기본값 추가.
--
-- 방침: 데이터 손실 0. 이미 신형 구조이면 건너뜀. 롤백 가능하도록 트랜잭션.

BEGIN;

-- ── (1) presets 한글 복구 ──
-- '스'로 시작하고 '이차'로 끝나며 중간에 U+FFFD가 있는 경우만 복구.
UPDATE presets
SET name = '스카이차'
WHERE name LIKE '스%이차'
  AND name LIKE '%' || U&'\FFFD' || '%';

-- 보호누름의 spec 이 '모르...르' 꼴이고 중간에 U+FFFD 포함된 경우 복구.
UPDATE presets
SET spec = '시멘트 모르타르'
WHERE name = '보호누름'
  AND spec LIKE '시멘트 모르%'
  AND spec LIKE '%' || U&'\FFFD' || '%';

-- 혹시 모를 잔여 U+FFFD 포함 presets 로그 (파괴하지 않음)
-- 실제 운영에서 이 행은 수작업 판단이 필요하므로 주석으로 남김.
-- SELECT id, name, spec FROM presets WHERE name LIKE '%' || U&'\FFFD' || '%' OR spec LIKE '%' || U&'\FFFD' || '%';

-- ── (2) cost_config.equipment_prices 구조 마이그레이션 ──
-- 기존 형태: { ladder: 120000, sky: 350000, waste: 200000 }
-- 신규 형태: { ladder: {mat,labor,exp}, sky: {...}, waste: {...},
--              forklift: {...}, crane: {...}, ropeman: {...} }
--
-- 각 키를 개별 판단:
--   - JSONB가 number이면 → { mat:0, labor:0, exp:<기존값> } 로 승격
--   - JSONB가 object이면 → 그대로 유지
--   - 키 자체가 없으면 → 기본값 삽입

WITH current_configs AS (
  SELECT company_id, config
  FROM cost_config
),
upgraded AS (
  SELECT
    company_id,
    config
      || jsonb_build_object(
        'equipment_prices',
        jsonb_build_object(
          'ladder',
          CASE
            WHEN jsonb_typeof(config->'equipment_prices'->'ladder') = 'number'
              THEN jsonb_build_object('mat', 0, 'labor', 0, 'exp', (config->'equipment_prices'->>'ladder')::int)
            WHEN jsonb_typeof(config->'equipment_prices'->'ladder') = 'object'
              THEN config->'equipment_prices'->'ladder'
            ELSE jsonb_build_object('mat', 0, 'labor', 0, 'exp', 120000)
          END,
          'sky',
          CASE
            WHEN jsonb_typeof(config->'equipment_prices'->'sky') = 'number'
              THEN jsonb_build_object('mat', 0, 'labor', 0, 'exp', (config->'equipment_prices'->>'sky')::int)
            WHEN jsonb_typeof(config->'equipment_prices'->'sky') = 'object'
              THEN config->'equipment_prices'->'sky'
            ELSE jsonb_build_object('mat', 0, 'labor', 0, 'exp', 350000)
          END,
          'waste',
          CASE
            WHEN jsonb_typeof(config->'equipment_prices'->'waste') = 'number'
              THEN jsonb_build_object('mat', 0, 'labor', 0, 'exp', (config->'equipment_prices'->>'waste')::int)
            WHEN jsonb_typeof(config->'equipment_prices'->'waste') = 'object'
              THEN config->'equipment_prices'->'waste'
            ELSE jsonb_build_object('mat', 0, 'labor', 0, 'exp', 200000)
          END,
          'forklift',
          COALESCE(
            config->'equipment_prices'->'forklift',
            jsonb_build_object('mat', 0, 'labor', 0, 'exp', 700000)
          ),
          'crane',
          COALESCE(
            config->'equipment_prices'->'crane',
            jsonb_build_object('mat', 0, 'labor', 0, 'exp', 1500000)
          ),
          'ropeman',
          COALESCE(
            config->'equipment_prices'->'ropeman',
            jsonb_build_object('mat', 0, 'labor', 450000, 'exp', 600000)
          )
        )
      ) AS new_config
  FROM current_configs
)
UPDATE cost_config cc
SET config = u.new_config,
    updated_at = NOW()
FROM upgraded u
WHERE cc.company_id = u.company_id;

COMMIT;
