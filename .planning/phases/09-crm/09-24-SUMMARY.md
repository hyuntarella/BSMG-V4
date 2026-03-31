---
phase: 09-crm
plan: 24
subsystem: crm
tags: [notion, kanban, crm, ui, frontend]
dependency_graph:
  requires: [notion-crm-api]
  provides: [crm-kanban-ui]
  affects: [phase-09-plans-25-28]
tech_stack:
  added: []
  patterns: [ssr-server-component-with-client-delegate, useMemo-filter-pattern]
key_files:
  created:
    - hooks/useCrm.ts
    - components/crm/KanbanBoard.tsx
    - components/crm/KanbanCard.tsx
    - components/crm/CrmPageClient.tsx
  modified:
    - app/(authenticated)/crm/page.tsx
decisions:
  - "getAllRecords() 직접 import (server component에서 API route 거치지 않음) — 서버사이드 호출이 더 효율적"
  - "CrmPageClient 별도 파일 분리 — CRM page.tsx를 순수 서버 컴포넌트로 유지하고 클라이언트 로직 분리"
  - "KanbanBoard 탭 카운트: STAGE_MAP[stage]로 해당 stage 파이프라인 목록 구해서 레코드 필터 — O(n) per tab render"
  - "Notion 환경변수 미설정 시 빈 배열 폴백 — try/catch로 개발 환경에서도 빌드 통과"
metrics:
  duration_seconds: 206
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 09 Plan 24: CRM 칸반보드 UI Summary

Notion SSR 데이터를 5탭 칸반보드로 렌더링하는 CRM 페이지 완성. 탭별 파이프라인 컬럼 + 카드 UI.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | CRM 페이지 SSR + useCrm 훅 | 2e07872 | hooks/useCrm.ts, app/(authenticated)/crm/page.tsx, components/crm/CrmPageClient.tsx |
| 2 | KanbanBoard + KanbanCard 컴포넌트 | 3357665 | components/crm/{KanbanBoard,KanbanCard,CrmPageClient}.tsx |

## What Was Built

### hooks/useCrm.ts
- `records`, `loading`, `error` 상태
- `activeStage` (기본 `'0.문의'`), `searchQuery`, `managerFilter`
- `fetchRecords()`: GET /api/crm 클라이언트 재조회
- `filteredRecords`: useMemo — PIPELINE_TO_STAGE 매핑 + searchQuery (address/customerName/phone) + managerFilter
- `updateRecordLocal()`: 낙관적 로컬 업데이트
- `initialRecords` prop으로 SSR 데이터 수신 (useState 초기값)

### app/(authenticated)/crm/page.tsx
- async 서버 컴포넌트
- `getAllRecords()` 직접 import → Notion API 직접 호출 (API route 우회)
- 오류 시 빈 배열 폴백 (개발/스테이징 환경 대비)
- `CrmPageClient`에 `initialRecords` 전달

### components/crm/CrmPageClient.tsx
- `'use client'` — `useCrm` 훅 연결
- 필터 바: 검색 입력 + 담당자 select
- `KanbanBoard`에 `filteredRecords`, `activeStage`, `onStageChange`, `onCardClick` 전달

### components/crm/KanbanBoard.tsx
- 5개 탭 (문의/영업/장기/시공/하자) — `activeStage` 강조, 탭별 레코드 수 뱃지
- `STAGE_MAP[activeStage]` 파이프라인들을 가로 컬럼으로 배치
- 각 컬럼: 파이프라인명 헤더 + 카드 수 + 세로 스크롤 카드 목록
- 빈 컬럼: "레코드 없음" 표시

### components/crm/KanbanCard.tsx
- 주소 (truncate), 고객명 + 전화번호 (tel: 링크), 시공평수
- 담당자 컬러 칩 (이창엽=blue, 박민우=green, 미배정=gray)
- 문의채널 텍스트
- 견적금액 만원 단위 포맷 (있을 때만)

## Decisions Made

- `getAllRecords()` 직접 import — 서버 컴포넌트에서 API route 거치는 overhead 없음
- `CrmPageClient` 별도 파일 — page.tsx를 순수 SSR로 유지, 클라이언트 코드 분리
- Notion 미설정 시 빈 배열 폴백 — `NOTION_CRM_TOKEN` 없는 환경에서도 빌드/렌더 통과

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `onCardClick` in CrmPageClient: 카드 클릭 시 상세 모달/페이지 이동 미구현. Plan 25+ 에서 구현 예정.

## Self-Check: PASSED

Files created:
- hooks/useCrm.ts: FOUND
- components/crm/KanbanBoard.tsx: FOUND
- components/crm/KanbanCard.tsx: FOUND
- components/crm/CrmPageClient.tsx: FOUND
- app/(authenticated)/crm/page.tsx: MODIFIED

Build: PASSED (/crm shows as ƒ dynamic 3.84 kB)
TypeScript: PASSED (npx tsc --noEmit 0 errors)
Commits: 2e07872 (Task 1), 3357665 (Task 2)
