---
phase: 11-calendar
plan: 34
subsystem: calendar
tags: [notion, calendar, crud, month-view, ui]
dependency_graph:
  requires: [33-PLAN]
  provides: [calendar-crud-api, month-view, calendar-page]
  affects: [app/calendar, dashboard]
tech_stack:
  added: []
  patterns: [notion-rest-fetch, client-component-state, useEffect-fetch]
key_files:
  created:
    - app/api/calendar/route.ts
    - app/api/calendar/[id]/route.ts
    - components/calendar/CalendarHeader.tsx
    - components/calendar/MonthView.tsx
  modified:
    - lib/notion/calendar.ts
    - app/(authenticated)/calendar/page.tsx
decisions:
  - "getEventsForDate() preserved as getEvents(date, date) wrapper for backward compatibility with dashboard widget"
  - "Record<string, unknown> instead of any for Notion properties — no eslint-disable needed"
  - "Inline SVG chevrons instead of heroicons (not installed)"
  - "View switch (week/day) renders placeholder text — Phase 35 activates these views"
  - "selectedDate toggle: click same date again to deselect"
metrics:
  duration_seconds: 432
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 6
---

# Phase 11 Plan 34: 캘린더 CRUD + 월간 뷰 Summary

Notion 캘린더 DB 전체 CRUD 라이브러리 + REST API 4개 엔드포인트 + 월간 그리드 UI 구현.

## What Was Built

### Task 1: Notion 캘린더 CRUD 라이브러리 + API 라우트

**`lib/notion/calendar.ts`** — Phase 33 기초에서 전체 CRUD로 확장:
- `CalendarEvent` 타입 확장: `allDay`, `memberId`, `crmCustomerId`, `crmCustomerName`, `memo`, `action` 추가
- `CreateEventInput` 타입 추가
- `getEvents(start, end)` — 날짜 범위 쿼리 (on_or_after / on_or_before 필터)
- `createEvent(input)` — Notion page create
- `updateEvent(id, input)` — Notion page PATCH
- `deleteEvent(id)` — Notion page archive (archived: true)
- `getEventsForDate(date)` — 하위 호환: `getEvents(date, date)` wrapper

**`app/api/calendar/route.ts`**:
- `GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` → `{ events: CalendarEvent[] }`
- `POST /api/calendar` → `{ event: CalendarEvent }` (201)

**`app/api/calendar/[id]/route.ts`**:
- `PATCH /api/calendar/[id]` → `{ success: true }`
- `DELETE /api/calendar/[id]` → `{ success: true }` (archive)

### Task 2: 월간 뷰 + 캘린더 페이지

**`components/calendar/CalendarHeader.tsx`**:
- 이전/다음 월 이동 버튼 (SVG chevron), 오늘 버튼
- 현재 "YYYY년 M월" 표시
- 월간/주간/일간 뷰 전환 탭 (bg-gray-100 + active bg-white shadow-sm)

**`components/calendar/MonthView.tsx`**:
- 7×6 그리드 (일~토 헤더 + 6주)
- 이전/다음 달 날짜: text-gray-300 (희미하게)
- 오늘 날짜: bg-brand text-white rounded-full
- 이벤트 칩: 색상 점 (w-1.5 h-1.5) + 제목 truncate, 최대 3개 + "+N" overflow
- 날짜 셀 클릭 → `onDateClick(YYYY-MM-DD)`

**`app/(authenticated)/calendar/page.tsx`** — 'use client' 재작성:
- `currentDate`, `view`, `events`, `selectedDate` state
- `useEffect` — currentDate 변경 시 `GET /api/calendar?start=...&end=...`
- `CalendarHeader` + `MonthView` 렌더링
- 날짜 클릭 → 하단 이벤트 리스트 패널 (제목, 타입, 메모, 담당자, 시간)
- 주간/일간 뷰는 placeholder — Phase 35에서 활성화

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] heroicons 미설치로 ChevronLeft/Right import 실패**
- **Found during:** Task 2 (CalendarHeader.tsx 작성)
- **Issue:** `@heroicons/react` 패키지가 package.json에 없음
- **Fix:** 인라인 SVG 함수 ChevronLeft/ChevronRight로 대체
- **Files modified:** components/calendar/CalendarHeader.tsx

**2. [Rule 1 - Bug] `eslint-disable @typescript-eslint/no-explicit-any` 빌드 오류**
- **Found during:** Task 2 (npm run build)
- **Issue:** .eslintrc.json에 `@typescript-eslint/no-explicit-any` 룰이 미설정 상태에서 eslint-disable 주석 사용 시 "Definition for rule was not found" 에러
- **Fix:** `any` 타입을 `Record<string, unknown>`으로 교체, eslint-disable 주석 제거
- **Files modified:** lib/notion/calendar.ts

## Self-Check

- [x] `lib/notion/calendar.ts` — exists, 260+ lines, full CRUD
- [x] `app/api/calendar/route.ts` — exists, GET/POST handlers
- [x] `app/api/calendar/[id]/route.ts` — exists, PATCH/DELETE handlers
- [x] `components/calendar/CalendarHeader.tsx` — exists
- [x] `components/calendar/MonthView.tsx` — exists
- [x] `app/(authenticated)/calendar/page.tsx` — rewritten, 'use client'
- [x] Commit 2d4df1c — Task 1 (CRUD + API)
- [x] Commit c33eac2 — Task 2 (월간 뷰 + 페이지)
- [x] `npm run build` — PASSED (/calendar: 3.72 kB, /api/calendar, /api/calendar/[id] 모두 빌드됨)

## Self-Check: PASSED
