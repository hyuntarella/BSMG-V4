---
phase: 10-dashboard
plan: 31
subsystem: dashboard
tags: [dashboard, viewed, relative-time, client-fetch, localStorage]
dependency_graph:
  requires: [10-dashboard/29]
  provides: [viewed-api, relative-time-util, ViewedCard]
  affects: [app/dashboard/page.tsx]
tech_stack:
  added: []
  patterns: [client component + server API, localStorage dismissed, Link navigation]
key_files:
  created:
    - lib/utils/relativeTime.ts
    - app/api/dashboard/viewed/route.ts
    - components/dashboard/ViewedCard.tsx
  modified:
    - app/dashboard/page.tsx
decisions:
  - "ViewTrackingCard (SSR) replaced by ViewedCard (client-fetch) — avoids SSR+client duplication, aligns with CsStatusSection/FollowUpCard pattern"
  - "totalAmount set to 0 in API response — estimates table has no grand_total column; sheets join out of scope"
metrics:
  duration: ~10min
  completed_date: "2026-03-31"
  tasks: 2
  files_changed: 4
---

# Phase 10 Plan 31: 열람 고객 카드 Summary

**One-liner:** email_viewed_at 기반 열람 고객 조회 API + 상대시간 유틸(방금/분/시간/일/30일+) + ViewedCard 클라이언트 컴포넌트 구현.

## What Was Built

1. **`lib/utils/relativeTime.ts`** — `formatRelativeTime(dateStr)`: 방금 전(1분 미만), N분 전(1~59분), N시간 전(1~23시간), N일 전(1~29일), 30일+ 전.

2. **`app/api/dashboard/viewed/route.ts`** — GET: Supabase `estimates` 테이블에서 `email_viewed_at IS NOT NULL` 조건으로 최신 열람순 20건 조회. 인증 + company_id 필터 적용.

3. **`components/dashboard/ViewedCard.tsx`** — 'use client'. 마운트 시 `/api/dashboard/viewed` fetch. `getDismissed('dismissed_viewed')` 필터링. 24h 이내 열람은 `text-orange-600`, 이후는 `text-gray-500`. x 버튼으로 localStorage에 저장 후 state 제거. 카드 클릭 시 `/estimate/${id}` Link.

4. **`app/dashboard/page.tsx`** — `ViewTrackingCard` (SSR) + 관련 Supabase 쿼리 제거. `ViewedCard` import + `{/* 열람 고객 섹션 — Phase 31 */}` 교체.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Refactor] ViewTrackingCard SSR 제거 및 ViewedCard로 교체**
- **Found during:** Task 2
- **Issue:** 대시보드에 이미 SSR 기반 `ViewTrackingCard`가 있어 `ViewedCard`와 동일한 섹션이 두 번 표시될 예정
- **Fix:** `ViewTrackingCard` import + SSR `viewedEstimates` 쿼리 제거. ViewedCard가 같은 역할을 더 개선된 방식(클라이언트 fetch + 상대시간 + dismissed)으로 수행
- **Files modified:** app/dashboard/page.tsx
- **Commit:** 8b416e2

## Known Stubs

**totalAmount = 0** — `app/api/dashboard/viewed/route.ts` ViewedRecord의 `totalAmount`가 항상 0. estimates 테이블에 `grand_total` 컬럼이 없고, `estimate_sheets` 조인은 이 Plan 범위 밖. UI에서 `totalAmount > 0`일 때만 표시하므로 기능에 영향 없음. 향후 sheets 조인 추가 가능.

## Self-Check: PASSED

- `lib/utils/relativeTime.ts` — exists
- `app/api/dashboard/viewed/route.ts` — exists
- `components/dashboard/ViewedCard.tsx` — exists
- `app/dashboard/page.tsx` — ViewedCard integrated
- Commits: 9127f8a (Task 1), 8b416e2 (Task 2) — confirmed
- `npx tsc --noEmit` — no errors
