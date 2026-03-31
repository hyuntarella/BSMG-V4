---
phase: 10-dashboard
plan: 32
subsystem: dashboard
tags: [notion, crm, dashboard, follow-up, localStorage]
dependency_graph:
  requires: [10-dashboard/29]
  provides: [follow-up-api, follow-up-card]
  affects: [app/dashboard/page.tsx, lib/notion/crm.ts]
tech_stack:
  added: []
  patterns: [Notion REST fetch, localStorage dismissed list, client component + server API, daysSince calculation]
key_files:
  created:
    - app/api/dashboard/follow-up/route.ts
  modified:
    - lib/notion/crm.ts
    - components/dashboard/FollowUpCard.tsx
    - app/dashboard/page.tsx
decisions:
  - "Pipeline filter uses 견적서전송 (no space) — matches actual Notion CRM pipeline value from STAGE_MAP"
  - "FollowUpCard rewritten as no-prop component (fetches from API on mount) — eliminates Supabase sentEstimates query"
  - "daysSince uses estimateSentDate fallback to inquiryDate — handles records missing 견적서발송일"
  - "Red chip for ≥7 days, orange for <7 days — matches plan urgency color spec"
metrics:
  duration: ~8min
  completed_date: "2026-03-31"
  tasks: 2
  files_changed: 4
---

# Phase 10 Plan 32: 연락해야 할 곳 카드 Summary

**One-liner:** Notion CRM 파이프라인 "견적서전송" 미배정 건 조회 API + 경과일수/견적금액/담당자 표시 FollowUpCard 구현.

## What Was Built

1. **`lib/notion/crm.ts`** — `queryCrmFollowUp()` 함수 추가. 파이프라인="견적서전송" 필터, 견적서발송일 오름차순 정렬. 기존 `notionFetch()` 패턴 재사용.

2. **`app/api/dashboard/follow-up/route.ts`** — GET 엔드포인트. `queryCrmFollowUp()` 호출 → `FollowUpRecord[]` 반환. daysSince 계산 (견적서발송일 → 문의일자 fallback). try/catch 에러 처리.

3. **`components/dashboard/FollowUpCard.tsx`** — 완전 재작성. 'use client'. fetch on mount (`/api/dashboard/follow-up`). localStorage dismissed 필터링. 각 카드에 주소(font-medium), 경과일수 칩(빨간색 ≥7일, 주황색 <7일), 견적금액(text-brand), 담당자 칩(bg-blue-50). 기본 3건 + 더보기/접기 토글. × 버튼으로 숨김.

4. **`app/dashboard/page.tsx`** — 미사용 `sentEstimates` Supabase 쿼리 제거. `<FollowUpCard />` (props 없음) 로 교체. mt-6 간격 래퍼 추가.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

## Known Stubs

None — data wired to Notion CRM API.

## Self-Check: PASSED

- `app/api/dashboard/follow-up/route.ts` created ✓
- `components/dashboard/FollowUpCard.tsx` rewritten ✓
- `lib/notion/crm.ts` updated with queryCrmFollowUp ✓
- `app/dashboard/page.tsx` updated ✓
- Task 1 commit: 92cfa24 ✓
- Task 2 commit: fe515b5 ✓
- TypeScript: no source file errors ✓
