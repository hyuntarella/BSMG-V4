---
phase: 10-dashboard
plan: 33
subsystem: dashboard
tags: [notion, calendar, dashboard, modal, playwright, e2e]
dependency_graph:
  requires: [10-dashboard/29, 10-dashboard/30, 10-dashboard/31, 10-dashboard/32]
  provides: [today-schedule, load-estimate-modal, calendar-api, e2e-tests]
  affects: [app/dashboard/page.tsx, middleware.ts]
tech_stack:
  added: []
  patterns: [Notion REST fetch, client component fetch-on-mount, Playwright E2E, modal overlay pattern]
key_files:
  created:
    - lib/notion/calendar.ts
    - app/api/calendar/today/route.ts
    - components/dashboard/TodaySchedule.tsx
    - components/estimate/LoadEstimateModal.tsx
    - app/api/estimates/route.ts
    - e2e/dashboard.spec.ts
  modified:
    - app/dashboard/page.tsx
decisions:
  - "dashboard/page.tsx converted to 'use client' — LoadEstimateModal requires useState; SSR user name removed (not essential)"
  - "app/api/estimates/route.ts created — no existing list endpoint; modal needs client-side fetch"
  - "TEST_MODE bypass already present in lib/supabase/middleware.ts from Phase 09-crm — no modification needed"
  - "getEventsForDate() single-date only — Phase 34 will extend to getEvents(start, end) range query"
  - "LoadEstimateModal fetches /api/estimates?limit=20 on open — lazy load avoids upfront cost"
metrics:
  duration: ~12min
  completed_date: "2026-03-31"
  tasks: 2
  files_changed: 7
---

# Phase 10 Plan 33: 오늘 일정 + 견적서 불러오기 모달 Summary

**One-liner:** Notion 캘린더 기초 연동으로 오늘 일정 최대 5건 표시, 견적서 불러오기 모달 통합, Playwright E2E 테스트 기반 구축.

## What Was Built

1. **`lib/notion/calendar.ts`** — `getEventsForDate(date)` 함수. NOTION_CALENDAR_SCHED_DB 쿼리, 타입별 색상 매핑 (방문=blue, 시공=green, 미팅=purple, 기타=gray). CalendarEvent 인터페이스 포함. Phase 34에서 getEvents(start, end) 범위 조회로 확장 예정.

2. **`app/api/calendar/today/route.ts`** — GET 엔드포인트. getEventsForDate(오늘) 호출 → 시작 시간순 정렬 → 최대 5건 반환. 에러 시 빈 배열 반환.

3. **`components/dashboard/TodaySchedule.tsx`** — 'use client'. fetch on mount. 색상 점 + HH:MM 시간 + 제목 + 담당자 한 줄 카드. loading/empty 상태 처리.

4. **`components/estimate/LoadEstimateModal.tsx`** — 'use client'. isOpen props로 조건부 렌더링. ESC 키 + 오버레이 클릭 닫기. /api/estimates?limit=20 fetch on open. 검색 필터링. 항목 클릭 → router.push + onClose.

5. **`app/api/estimates/route.ts`** — GET /api/estimates. 인증 후 company_id 기반 견적서 최근 N건 + grand_total 집계 반환.

6. **`app/dashboard/page.tsx`** — 'use client'로 전환. 5개 섹션 통합: CsStatusSection, UnsentCard, ViewedCard, FollowUpCard, TodaySchedule. "견적서 불러오기" 버튼 + LoadEstimateModal 연결.

7. **`e2e/dashboard.spec.ts`** — Playwright 테스트 3개: 페이지 로드, 섹션 제목 표시, 모달 열기/닫기 (ESC + 오버레이 클릭).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] /api/estimates list endpoint 없음**
- **Found during:** Task 2 LoadEstimateModal 구현 시
- **Issue:** 기존 estimates 목록은 SSR page.tsx에서 직접 Supabase 조회. 클라이언트 모달용 API 없음.
- **Fix:** `app/api/estimates/route.ts` 생성 (GET, limit 파라미터, grand_total 집계)
- **Files modified:** app/api/estimates/route.ts (신규)
- **Commit:** 6c8b0cc

**2. [Rule 1 - Adjustment] dashboard/page.tsx SSR → client 전환**
- **Found during:** Task 2 통합 시
- **Issue:** LoadEstimateModal은 useState 필요 → 서버 컴포넌트에서 직접 사용 불가
- **Fix:** 'use client' 선언, SSR user name 조회 제거 (인사말 "안녕하세요"만 유지)
- **Files modified:** app/dashboard/page.tsx
- **Commit:** 6c8b0cc

**3. [No action needed] middleware TEST_MODE 우회**
- Plan에서 수정 요청했으나 Phase 09-crm에서 이미 구현됨 (lib/supabase/middleware.ts L29-31)

## Known Stubs

None — calendar data wired to Notion API, estimate list wired to Supabase.

## Self-Check: PASSED

- `lib/notion/calendar.ts` created ✓
- `app/api/calendar/today/route.ts` created ✓
- `components/dashboard/TodaySchedule.tsx` created ✓
- `components/estimate/LoadEstimateModal.tsx` created ✓
- `app/api/estimates/route.ts` created ✓
- `app/dashboard/page.tsx` updated ✓
- `e2e/dashboard.spec.ts` created ✓
- Task 1 commit: cffe769 ✓
- Task 2 commit: 6c8b0cc ✓
- npm run build: passed ✓
- TypeScript: no errors ✓
