---
phase: 09-crm
plan: 27
subsystem: crm
tags: [crm, performance, kanban, ui, gallery]
dependency_graph:
  requires: [crm-kanban-ui]
  provides: [crm-performance-tab]
  affects: [phase-09-plans-28]
tech_stack:
  added: []
  patterns: [useMemo-group-by-year-month, sticky-section-headers, conditional-tab-render]
key_files:
  created:
    - components/crm/PerformanceCard.tsx
    - components/crm/PerformanceTab.tsx
  modified:
    - components/crm/KanbanBoard.tsx
decisions:
  - "성공/실패 분류는 contractStatus 우선, pipeline 보조로 OR 조건 — Notion 데이터 일관성 불균일 대응"
  - "월별 sticky 헤더는 top-10 (z-[9]) — 연도 헤더(top-0 z-10)보다 아래에 겹쳐지도록 오프셋"
  - "실적 탭 카운트: 칸반 탭과 동일 계산 방식으로 직접 인라인 필터 — STAGE_MAP에 '실적' 없으므로 별도 처리"
metrics:
  duration_seconds: 406
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 09 Plan 27: CRM 실적 탭 Summary

실적(계약성공/실패) 카드 갤러리 뷰 — 연도>월 그룹핑 + 검색/필터 + 통계 요약. 칸반보드 6번째 탭으로 통합.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | PerformanceCard + PerformanceTab 컴포넌트 | 9d58e12 | components/crm/{PerformanceCard,PerformanceTab}.tsx |
| 2 | 칸반보드에 실적 탭 통합 | 9dcb640 | components/crm/KanbanBoard.tsx |

## What Was Built

### components/crm/PerformanceCard.tsx
- Props: `record: CrmRecord`, `isSuccess: boolean`, `onClick: () => void`
- 성공: `bg-blue-50 border-blue-200`, 실패: `bg-red-50 border-red-200`
- 주소(truncate, font-medium) + 고객명 + 시공분야(workTypes.join) + 시공평수 + 금액(만원 단위)
- 담당자 칩: 이창엽=blue, 박민우=green, 미배정=gray

### components/crm/PerformanceTab.tsx
- 검색바(주소/고객명) + 담당자 필터 드롭다운
- 실적 분류: `isSuccessRecord` (contractStatus==='계약성공' || pipeline==='잔금완료'), `isFailRecord` (계약실패 || 재연락금지)
- 통계 요약: 전체/성공/실패/성공률 표시
- 연도>월 그룹핑 (`groupByYearMonth`): Map<year, Map<month, CrmRecord[]>> 최신 순 정렬
- 연도 헤더: `sticky top-0 z-10 bg-gray-100`
- 월 헤더: `sticky top-10 z-[9] bg-gray-50` (연도 헤더 아래 겹침)
- 카드 그리드: `grid grid-cols-2 sm:grid-cols-3 gap-3`
- 빈 상태: "실적 데이터가 없습니다" 텍스트

### components/crm/KanbanBoard.tsx
- STAGE_TABS에 '실적' 추가 (6번째 탭)
- '실적' 탭 뱃지: 성공+실패 레코드 합산
- `isPerformanceTab` 플래그로 조건부 렌더: `PerformanceTab` vs 칸반 컬럼

## Decisions Made

- 성공/실패 OR 조건: Notion 데이터에서 `contractStatus`와 `pipeline`이 항상 일관되게 채워지지 않을 수 있어 두 필드 모두 체크
- 월 sticky 헤더 top-10: 연도 헤더 높이가 약 40px(py-2+text-lg=~40px)이므로 top-10(40px)으로 오프셋
- 실적 탭 레코드 수 계산: STAGE_MAP에 '실적' 키가 없으므로 KanbanBoard 내부에서 직접 인라인 필터 작성

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] InitialGuide.tsx 누락**
- **Found during:** Task 2 (npm run build)
- **Issue:** worktree에 components/estimate/InitialGuide.tsx 파일이 없어 빌드 실패
- **Fix:** 메인 리포에서 파일 복사
- **Files modified:** components/estimate/InitialGuide.tsx (새로 추가)
- **Commit:** 9dcb640

## Known Stubs

None - 실적 탭 카드 클릭 시 `onCardClick`은 KanbanBoard → CrmPageClient로 전달되며, Plan 25/26에서 구현된 상세 모달이 있으면 연결됨.

## Self-Check: PASSED
