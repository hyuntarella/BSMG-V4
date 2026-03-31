---
phase: 09-crm
plan: 28
subsystem: crm
tags: [crm, navigation, search, filter, e2e, playwright, middleware]
dependency_graph:
  requires: [crm-detail-modal, crm-kanban-ui, crm-performance-tab]
  provides: [crm-estimate-link, crm-proposal-link, crm-e2e-tests]
  affects: []
tech_stack:
  added: []
  patterns: [useRouter-navigation, playwright-e2e, test-mode-middleware]
key_files:
  created:
    - playwright.config.ts
    - e2e/crm.spec.ts
  modified:
    - components/crm/DetailModal.tsx
    - components/crm/KanbanCard.tsx
    - components/crm/CrmPageClient.tsx
    - hooks/useCrm.ts
    - lib/supabase/middleware.ts
decisions:
  - "TEST_MODE 우회는 updateSession 함수 내에서 supabase.auth.getUser() 호출 전에 위치 — getUser() 불필요 호출 없이 early return"
  - "E2E 검색 테스트는 data 의존 없이 input 존재/값만 확인 — 실제 Notion 데이터 없이도 통과 가능한 구조"
  - "useCrm.ts에 실적 탭 early return 추가: activeStage==='실적'일 때 전체 records 반환 — PerformanceTab이 내부적으로 필터링"
metrics:
  duration_seconds: 365
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 2
  files_modified: 5
---

# Phase 09 Plan 28: CRM 연결 + 검색 + 필터 + E2E 테스트 Summary

CRM 상세 모달에 견적서/제안서 작성 연결 버튼 추가, data-testid 마커 삽입, Playwright E2E 테스트 파일 생성, TEST_MODE 미들웨어 우회 구현.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 견적서/제안서 연결 버튼 + data-testid + useCrm 수정 | 1eb35bb | DetailModal.tsx, KanbanCard.tsx, CrmPageClient.tsx, useCrm.ts |
| 2 | Playwright E2E 테스트 + TEST_MODE 미들웨어 | 3984760 | playwright.config.ts, e2e/crm.spec.ts, lib/supabase/middleware.ts |

## What Was Built

### components/crm/DetailModal.tsx
- `useRouter` (next/navigation) import 추가
- `handleGoToEstimate`: router.push(`/estimate/new?crmId=...&address=...&customerName=...&manager=...`)
- `handleGoToProposal`: router.push(`/proposal?address=...&manager=...`)
- "견적서 작성" 버튼 (bg-brand + 문서 아이콘)
- "제안서 작성" 버튼 (bg-gray-700 + 파일 아이콘)
- 두 버튼 flex gap-2 같은 줄 배치
- `data-testid="detail-modal"` 추가 (E2E 테스트용)

### components/crm/KanbanCard.tsx
- `data-testid="kanban-card"` 추가 (E2E 테스트용)

### components/crm/CrmPageClient.tsx
- 검색 placeholder를 "주소, 고객명, 전화번호 검색"으로 수정 (E2E 테스트 정합성, trailing "..." 제거)

### hooks/useCrm.ts
- `filteredRecords` useMemo에 `activeStage === '실적'` early return 추가
- 실적 탭에서는 전체 records 반환 → PerformanceTab 내부에서 성공/실패 분류 및 검색 필터링 수행

### lib/supabase/middleware.ts
- `updateSession` 함수 내 `supabase.auth.getUser()` 호출 전에 TEST_MODE 체크 추가
- `process.env.TEST_MODE === 'true'`이면 supabaseResponse early return

### playwright.config.ts (신규)
- testDir: './e2e'
- baseURL: 'http://localhost:3000'
- webServer: npm run dev (port 3000, reuseExistingServer: true, TEST_MODE: 'true')

### e2e/crm.spec.ts (신규)
- 테스트 4개: 칸반보드 로드, 탭 전환, 검색 input, 카드 클릭 모달
- data-testid 셀렉터 사용 (`[data-testid="kanban-card"]`, `[data-testid="detail-modal"]`)
- 데이터 의존 없는 구조 (카드 없으면 모달 테스트 skip)

## Decisions Made

- TEST_MODE 우회는 supabase 클라이언트 초기화 이후, getUser() 호출 전에 위치 — Supabase 쿠키 복사는 필요하지만 getUser() 호출은 불필요
- E2E 검색 테스트는 input 존재/값 반영만 확인 — 실제 Notion API 데이터 없이도 통과 가능
- useCrm.ts 실적 탭 early return: 기존 검색/담당자 필터를 실적 탭에 적용하지 않음 (PerformanceTab이 자체 필터 보유)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CrmPageClient 검색 placeholder 불일치**
- **Found during:** Task 1
- **Issue:** CrmPageClient.tsx의 검색 input placeholder가 "주소, 고객명, 전화번호 검색..."으로 E2E 테스트 예상값("주소, 고객명, 전화번호 검색")과 불일치
- **Fix:** trailing "..." 제거
- **Files modified:** components/crm/CrmPageClient.tsx
- **Commit:** 1eb35bb

**2. [Rule 2 - Missing] useCrm.ts 실적 탭 필터링 로직 누락**
- **Found during:** Task 1 코드 검토
- **Issue:** `filteredRecords`가 '실적' 탭에서 빈 배열 반환 → PerformanceTab에 빈 데이터 전달됨
- **Fix:** activeStage==='실적' early return으로 전체 records 반환
- **Files modified:** hooks/useCrm.ts
- **Commit:** 1eb35bb

## Known Stubs

None - 모든 기능이 완전히 구현됨.

## Self-Check: PASSED
- e2e/crm.spec.ts: FOUND
- playwright.config.ts: FOUND
- TEST_MODE 우회: FOUND in middleware.ts
- 견적서 작성 버튼: FOUND in DetailModal.tsx
- 제안서 작성 버튼: FOUND in DetailModal.tsx
- data-testid="detail-modal": FOUND
- data-testid="kanban-card": FOUND
- commit 1eb35bb: FOUND
- commit 3984760: FOUND
