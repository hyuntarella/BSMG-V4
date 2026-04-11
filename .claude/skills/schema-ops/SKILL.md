---
name: schema-ops
description: "방수명가 Supabase 스키마 작업 스킬. 마이그레이션 생성, RLS 정책 추가, TypeScript 타입 동기화, 테이블/컬럼 변경, 실시간 구독 설정 등 모든 DB 관련 작업을 수행한다. 'Supabase', '스키마', '마이그레이션', 'RLS', '테이블', '컬럼', '타입 동기화', '구독', 'company_id' 키워드가 있으면 이 스킬을 사용하라."
---

# 스키마 작업 스킬

Schema Guard 에이전트가 사용하는 작업 스킬.

## 마이그레이션 생성 절차

1. 기존 마이그레이션 파일 목록 확인 (`/supabase/migrations/`)
2. 다음 순번으로 마이그레이션 파일 생성
3. SQL 작성 시 반드시 포함:
   - `CREATE TABLE` / `ALTER TABLE` 등 DDL
   - RLS 활성화: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
   - RLS 정책: `company_id` 기반 격리 (필수)
   - 역할별 권한 (admin/sales/customer)
4. `/lib/estimate/types.ts` TypeScript 타입 동기화
5. 영향받는 API 라우트 확인 및 수정

## RLS 정책 패턴

```sql
-- 기본: company_id 격리 (모든 테이블 필수)
CREATE POLICY "{table}_company_isolation" ON {table}
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- admin: 회사 내 전체 접근
CREATE POLICY "{table}_admin_all" ON {table}
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- sales: 자기 데이터만
CREATE POLICY "{table}_sales_own" ON {table}
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );
```

## 타입 동기화 체크리스트

DB 스키마 변경 후:
- [ ] `/lib/estimate/types.ts` 업데이트
- [ ] 해당 타입을 사용하는 API route 확인
- [ ] 해당 타입을 사용하는 hooks 확인
- [ ] 해당 타입을 사용하는 components 확인

## Supabase 클라이언트 규칙

- 브라우저: `/lib/supabase/client.ts`만 사용
- 서버: `/lib/supabase/server.ts`만 사용
- 새 인스턴스 생성 금지 (CLAUDE.md 절대 규칙)

## 금지 사항
- RLS 없는 테이블 생성 금지
- 기존 마이그레이션 파일 수정 금지 (새 마이그레이션으로 변경)
- company_id 없는 테이블 생성 금지 (시스템 테이블 제외)
- Supabase 클라이언트 새 인스턴스 생성 금지
