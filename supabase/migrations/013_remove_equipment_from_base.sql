-- 013_remove_equipment_from_base.sql
-- #10 BASE 4종(사다리차/스카이차/폐기물처리/드라이비트하부절개)을 BASE에서 제거.
-- price_matrix 인덱스가 복합 12→8, 우레탄 11→7로 재정렬되므로 기존 데이터를 전량 삭제하고
-- seed 재임포트(supabase/seed.ts)로 채운다. estimate_items 역시 인덱스 기반 잠금/동기화
-- 로직과 충돌하지 않도록 테스트 데이터를 전량 초기화한다 (테스트 데이터라 무방).
--
-- 주의: 이 마이그레이션은 파괴적이다. 운영 데이터가 있는 환경에서는
--       백업을 먼저 확보한 뒤에 적용해야 한다. (#10 시점에는 테스트 데이터만 존재)

BEGIN;

-- 1) estimate_items 전량 삭제 (cascade로 시트 하위도 깔끔해짐)
DELETE FROM estimate_items;

-- 2) price_matrix 전량 삭제 → seed 재임포트에서 8/7 슬롯 구조로 재생성
DELETE FROM price_matrix;

COMMIT;
