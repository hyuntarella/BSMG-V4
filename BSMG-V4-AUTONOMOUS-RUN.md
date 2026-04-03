# BSMG-V4 자율 실행 — CRM Phase 3 + 캘린더 이전 (사람 개입 없음)

---

## 지시

사람이 자리를 비운다. 아래 작업을 **전부 끝내고 커밋+푸시**까지 완료하라.
중간에 사람에게 질문하지 말 것. 판단이 필요하면 이 문서의 규칙을 따를 것.
막히면 해당 단계를 스킵하지 말고, 원인을 로그에 남기고 우회 방법을 찾아서 진행할 것.

---

## 서브에이전트 팀 구조

모든 작업을 4개 역할로 분리하여 교차 검증한다.

### 🎯 기획자 (Planner)
- 각 Phase 시작 전 작업 목록 + 완료 조건 정리
- Phase 간 의존성 확인
- 문제 발생 시 우회 전략 결정

### 💻 개발자 (Developer)
- 코드 작성, 파일 수정, 스키마 변경
- 기획자가 정의한 범위만 수정 (범위 밖 수정 금지)

### 🔍 검수자 (Reviewer)
- 개발자 작업 완료 후 코드 리뷰 체크리스트 실행
- 기존 테스트 깨짐 여부 확인
- API 응답 형식 호환성 검증

### 🤖 테스터 (Tester — Playwright + Vitest)
- 모든 테스트 실행하고 결과 로그 첨부
- 테스트 실행 없이 "통과했다"고 보고 금지
- 실패 시 개발자에게 구체적 실패 내용 전달

---

## 절대 규칙

1. test.skip() 사용 금지
2. expect 매처 느슨화 금지
3. VoiceBar.tsx 수정 금지
4. buildItems.ts / constants.ts 구조 변경 금지
5. 캘린더 Phase에서 CRM 코드 건드리지 않음
6. 자기 보고 금지 — 테스트 실행 로그를 증거로 첨부
7. 파일 3개 이상 수정 시 기존 테스트 조기 실행
8. 커밋 메시지는 한국어로

---

## STEP 1: CRM Phase 3 — 테스트 + 교차 검증

### 🎯 기획자

Phase 3 작업 목록:
- CRM CRUD 테스트 작성 (생성/조회/수정/삭제/검색/댓글)
- 참조 무결성 테스트 (CASCADE 삭제)
- API 응답 형식 호환성 테스트
- 전체 테스트 재실행
- 코드 리뷰 12항목

### 💻 개발자

```
tests/crm/crm-supabase.test.ts 작성:
- 고객 생성 → 조회 → 수정 → 삭제
- 검색 (이름, 주소)
- 댓글 추가 → 조회
- 파이프라인 조회/수정
- CASCADE 삭제 (고객 삭제 시 댓글도 삭제)

tests/crm/crm-api-compat.test.ts 작성:
- 각 API route 응답 구조가 CrmRecord 인터페이스와 일치하는지
- GET /api/crm → 배열 반환
- POST /api/crm → CrmRecord 반환, status 201
- PATCH /api/crm/[id] → { success: true }
- DELETE /api/crm/[id] → { success: true }
- GET /api/crm/search → { results: [...] }
```

### 🔍 검수자

코드 리뷰 체크리스트 (전부 PASS여야 진행):

| # | 항목 |
|---|------|
| 1 | UI 컴포넌트 수정 없음 (import 외) |
| 2 | API route 요청/응답 형식 변경 없음 |
| 3 | 캘린더 Notion 연결 건드리지 않음 |
| 4 | lib/notion/client.ts 삭제 안 함 |
| 5 | lib/notion/types.ts — 캘린더가 아직 사용 중이면 유지 |
| 6 | RLS 정책 적용됨 |
| 7 | 인덱스 생성됨 |
| 8 | test.skip() 사용 안 함 |
| 9 | expect 매처 다운그레이드 안 함 |
| 10 | 빌드 에러 없음 |
| 11 | 기존 E2E 전부 PASS (기존 실패 3건은 허용) |
| 12 | 기존 vitest 전부 PASS (기존 실패 2건은 허용) |

### 🤖 테스터

```bash
npx vitest run
npx playwright test --project=chromium
npx vitest run tests/crm/
```

### 완료 조건

- [ ] 신규 CRM 테스트 전부 PASS
- [ ] 기존 E2E 기존 상태 유지
- [ ] 기존 vitest 기존 상태 유지
- [ ] 코드 리뷰 12/12 PASS
- [ ] 빌드 성공

### 완료 시 커밋

```bash
git add -A
git commit -m "test: CRM Supabase 이전 검증 — CRUD/호환성 테스트 전부 통과"
git push origin main
```

---

## STEP 2: 캘린더 Notion → Supabase 이전

CRM과 동일 패턴. CRM이 완료된 후에만 시작한다.

### 🎯 기획자

Phase 순서:
1. 캘린더 참조 전수 스캔
2. Notion 캘린더 필드 → Supabase 컬럼 매핑
3. SQL 스키마 설계 (005_calendar.sql)
4. lib/supabase/calendar.ts 구현
5. API route import 교체
6. 테스트 + 검증

### 💻 개발자 — Phase A: 분석 + 스키마

```bash
# 캘린더 참조 전수 스캔
grep -rn "calendar\|notion.*calendar\|lib/notion/calendar" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next
```

lib/notion/calendar.ts를 분석하여:
- 모든 필드명 + Notion property type 추출
- CRUD 함수 시그니처 추출
- Supabase 테이블 설계 (calendar_events, calendar_members)

```sql
-- 005_calendar.sql
-- CRM 패턴과 동일하게 설계
-- notion_id 컬럼 포함 (마이그레이션용)
-- RLS + 인덱스 + updated_at 트리거
```

### 💻 개발자 — Phase B: Supabase 테이블 생성

> ⚠️ 중요: Supabase SQL은 사람이 수동 실행해야 하지만, 사람이 부재중이다.
> Supabase JS Client의 rpc() 또는 supabase-js로 SQL 실행이 가능한지 확인할 것.
> 불가능하면: SQL 파일만 작성하고, STEP 2를 "스키마 준비 완료, SQL 실행 대기" 상태로 남겨둘 것.
> 절대로 스키마 없이 다음 단계로 넘어가지 말 것.

방법 1 (권장): supabase-js의 rpc 또는 REST API로 SQL 실행
```typescript
const supabase = createClient(url, serviceRoleKey);
// DDL은 rpc로 안 될 수 있음 — 확인 필요
```

방법 2: Supabase Management API (프로젝트 ID + service role key)

방법 3 (폴백): SQL 파일만 작성하고 멈춤. 사람이 돌아와서 실행.

### 💻 개발자 — Phase C: 마이그레이션 + 코드 교체

CRM과 동일 패턴:
1. scripts/migrate-calendar.ts 작성
2. lib/supabase/calendar.ts 작성 (lib/notion/calendar.ts 1:1 대체)
3. API route import 교체
4. 컴포넌트 타입 import 교체
5. lib/notion/calendar.ts → .bak 백업

> Supabase SQL 실행이 안 됐으면 (방법 3 폴백):
> 코드 교체까지만 하고 "SQL 실행 후 마이그레이션 스크립트 실행 필요"로 남겨둘 것.

### 🔍 검수자

| # | 항목 |
|---|------|
| 1 | CRM 코드 건드리지 않음 |
| 2 | lib/supabase/crm.ts 변경 없음 |
| 3 | API route 응답 형식 변경 없음 |
| 4 | 캘린더 UI 컴포넌트 수정 없음 (import 외) |
| 5 | RLS 정책 적용됨 |
| 6 | test.skip() 사용 안 함 |
| 7 | 빌드 에러 없음 |
| 8 | 기존 E2E 기존 상태 유지 |
| 9 | 기존 vitest 기존 상태 유지 |

### 🤖 테스터

```bash
npx vitest run
npx playwright test --project=chromium
```

### 완료 시 커밋

```bash
git add -A
git commit -m "feat: 캘린더 Notion → Supabase 이전 완료"
git push origin main
```

---

## STEP 3: Notion 의존성 정리

### 🎯 기획자

CRM + 캘린더 모두 Supabase로 전환 완료 후:

```bash
# Notion 참조 잔여 확인
grep -rn "lib/notion" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude="*.bak"
```

### 💻 개발자

결과가 0건이면:
- lib/notion/client.ts → .bak 백업
- lib/notion/types.ts → .bak 백업 (이미 crm-types.ts로 이전됐으면)
- .env.local에서 NOTION_* 변수 주석 처리 (삭제는 안 함 — 롤백 대비)

결과가 0건이 아니면:
- 잔여 참조 파일 목록을 로그에 남기고 정리하지 않음 (사람 확인 필요)

### 완료 시 커밋

```bash
git add -A
git commit -m "chore: Notion 의존성 정리 — CRM/캘린더 Supabase 이전 완료"
git push origin main
```

---

## 최종 리포트 (모든 STEP 완료 후 출력)

```
=== BSMG-V4 자율 실행 최종 리포트 ===

STEP 1: CRM Phase 3
- 상태: ✅/❌
- 신규 테스트: XX개 PASS
- 기존 E2E: XXX/XXX PASS
- 코드 리뷰: 12/12 PASS
- 커밋: (해시)

STEP 2: 캘린더 이전
- 상태: ✅/❌/⏸️(SQL 실행 대기)
- SQL 파일: 작성됨/실행됨
- 마이그레이션: 완료/대기
- 코드 교체: 완료
- 기존 E2E: XXX/XXX PASS
- 커밋: (해시)

STEP 3: Notion 정리
- 상태: ✅/⏸️(잔여 참조 있음)
- 잔여 Notion 참조: 0건/N건
- 커밋: (해시)

=== 사람이 돌아와서 해야 할 것 ===
1. (STEP 2가 SQL 대기면) Supabase SQL Editor에서 005_calendar.sql 실행 → npx tsx scripts/migrate-calendar.ts
2. (STEP 3에 잔여 참조 있으면) 잔여 파일 확인 후 정리
3. Vercel 배포 확인 → 실기기 테스트
4. 정상이면 Notion 구독 해지 (-$50/월)
5. Google Workspace Starter 다운그레이드 (-$35/월)
```

---

## 실행

이 프롬프트를 Claude Code에 전달하면 STEP 1부터 자동 실행된다.
사람 개입 없이 가능한 데까지 진행하고, 불가능한 부분은 대기 상태로 남긴다.
