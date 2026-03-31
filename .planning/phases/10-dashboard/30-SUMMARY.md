---
phase: 10-dashboard
plan: 30
subsystem: dashboard
tags: [notion, crm, dashboard, unsent, localStorage]
dependency_graph:
  requires: [10-dashboard/29]
  provides: [unsent-api, unsent-card]
  affects: [app/dashboard/page.tsx]
tech_stack:
  added: []
  patterns: [Notion REST fetch, localStorage dismissed list, client component + server API]
key_files:
  created:
    - app/api/dashboard/unsent/route.ts
    - components/dashboard/UnsentCard.tsx
  modified:
    - app/dashboard/page.tsx
decisions:
  - "queryCrmByPipeline reused from lib/notion/crm.ts — no new Notion function needed, just filter estimateSentDate=null client-side"
  - "UnsentRecord type exported from route.ts and imported by UnsentCard — single source of truth"
  - "daysSince based on inquiryDate (문의일자) as specified in plan"
  - "dashboard page already integrated by plan 32 agent — Task 2 was pre-completed"
metrics:
  duration: ~8min
  completed_date: "2026-03-31"
  tasks: 2
  files_changed: 3
---

# Phase 10 Plan 30: 미발송 섹션 Summary

**One-liner:** Notion CRM 견적 방문 완료 + estimateSentDate null 필터 API + localStorage dismissed 기반 미발송 카드 컴포넌트 구현.

## What Was Built

1. **`app/api/dashboard/unsent/route.ts`** — GET: `queryCrmByPipeline('견적 방문 완료')` 후 `estimateSentDate === null` 필터링. `daysSince` 계산(문의일자 기준). `UnsentRecord[]` 반환.

2. **`components/dashboard/UnsentCard.tsx`** — 'use client'. `/api/dashboard/unsent` fetch on mount. `getDismissed('dismissed_unsent')` 필터링. 기본 3건 표시 + 더보기/접기 토글. 각 카드에 주소/경과일수(빨간 칩)/담당자(파란 칩)/x 버튼.

3. **`app/dashboard/page.tsx`** — UnsentCard import + 렌더링 (plan 32 agent에 의해 이미 통합됨 — Task 2 pre-completed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FollowUpCard stale 'estimates' prop**
- **Found during:** Task 2 build verification
- **Issue:** `app/dashboard/page.tsx` was passing `estimates={followUpData}` to `FollowUpCard` but the component was rewritten in plan 32 to accept no props — causing TypeScript build error
- **Fix:** Removed stale `estimates` prop and `followUpData` computation from dashboard page (already fixed by plan 32 agent's linter pass)
- **Files modified:** app/dashboard/page.tsx
- **Commit:** fe515b5 (plan 32 agent)

## Known Stubs

None — all data wired to Notion API.

## Self-Check: PASSED

- `app/api/dashboard/unsent/route.ts` — exists (commit 1892aa3)
- `components/dashboard/UnsentCard.tsx` — exists (commit 1892aa3)
- `app/dashboard/page.tsx` — UnsentCard imported and rendered (confirmed grep)
- npm run build — passes (28/28 static pages generated)
