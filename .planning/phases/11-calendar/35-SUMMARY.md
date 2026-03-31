---
phase: 11-calendar
plan: 35
subsystem: calendar
tags: [calendar, week-view, day-view, time-grid, view-switch]
dependency_graph:
  requires: [34-PLAN]
  provides: [week-view, day-view, time-grid, view-switch]
  affects: [app/calendar]
tech_stack:
  added: []
  patterns: [time-grid-abstraction, absolute-positioning-event-blocks, interval-for-current-time]
key_files:
  created:
    - components/calendar/TimeGrid.tsx
    - components/calendar/WeekView.tsx
    - components/calendar/DayView.tsx
  modified:
    - components/calendar/CalendarHeader.tsx
    - app/(authenticated)/calendar/page.tsx
decisions:
  - "TimeGrid 공통 컴포넌트: WeekView/DayView 모두 재사용 — 이벤트 블록 absolute positioning, HOUR_HEIGHT=64px 기준"
  - "현재 시간선: setInterval(60s)로 갱신 — requestAnimationFrame 대신 탭 비활성 환경 대응 (Phase 07b 결정과 동일 패턴)"
  - "CalendarHeader에 title/onPrev/onNext/onToday optional props 추가 — 기존 onDateChange fallback 유지로 하위 호환"
  - "calendar/page.tsx fetchEvents에 view 파라미터 추가 — 뷰 전환 시 적절한 날짜 범위로 API 재호출"
  - "DayView 멤버별 뷰: TimeGrid에 memberId를 date 기준 컬럼 key로 매핑 — 멤버 없으면 단일 전체 컬럼"
metrics:
  duration_seconds: 358
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 5
---

# Phase 11 Plan 35: 주간/일간 뷰 + 뷰 전환 완성 Summary

TimeGrid 공통 컴포넌트 + WeekView + DayView 구현으로 3가지 캘린더 뷰 완성.

## What Was Built

### Task 1: TimeGrid 공통 + WeekView

**`components/calendar/TimeGrid.tsx`**:
- Props: `columns`, `events`, `startHour=8`, `endHour=20`, `onEventClick`
- 좌측 시간 라벨 컬럼 (w-14): "08:00" ~ "20:00"
- 컬럼별 AllDay 이벤트: 상단 h-10 영역에 칩으로 표시
- 시간 슬롯: 1시간 h-16(64px) 행, 15분 단위 점선 구분선
- 이벤트 블록: absolute positioning, top=(시작-startHour)*64px, height=duration*64px (최소 32px)
  - 배경: event.color + 33(투명도), 좌측 border-l-4 event.color
  - 시간 + 제목 text-xs
- 현재 시간 빨간선: 오늘 날짜 컬럼에만, setInterval(60s)로 갱신
  - 좌측 w-2 h-2 빨간 원 + border-t-2 border-red-500

**`components/calendar/WeekView.tsx`**:
- 해당 주 일요일 시작 7일 계산
- 요일/날짜 헤더: 오늘은 bg-brand/10 배경 + bg-brand text-white 숫자 원
- 일/토 색상 구분 (red/blue)
- TimeGrid에 7개 컬럼 + 주간 이벤트 전달

### Task 2: DayView + 뷰 전환 연결

**`components/calendar/DayView.tsx`**:
- 멤버 있을 때: 멤버별 컬럼 헤더 + TimeGrid에 memberId별 이벤트 분리
- 멤버 없을 때: 단일 "전체" 컬럼
- 날짜 헤더에 오늘 여부 + 요일 표시

**`components/calendar/CalendarHeader.tsx`** 확장:
- `title` prop: 뷰별 커스텀 타이틀 (없으면 "YYYY년 M월" 기본값)
- `onPrev` / `onNext` prop: 뷰 인식 이동 핸들러 (없으면 월 단위 fallback)
- `onToday` prop: 커스텀 오늘 핸들러
- 모든 추가 props optional — 하위 호환 유지

**`app/(authenticated)/calendar/page.tsx`** 업데이트:
- `fetchEvents(date, view)` — view 파라미터로 적절한 날짜 범위 계산
  - month: 해당 월 1일 ~ 말일
  - week: 해당 주 일 ~ 토
  - day: 해당 날짜 단일
- `navigate(date, view, direction)`: 뷰에 따라 +-1일/주/월 이동
- `getTitle(date, view)`: 뷰별 헤더 타이틀 문자열
- 주간/일간 뷰에서 이벤트 클릭 → 하단 이벤트 상세 패널 표시 (× 닫기 버튼)
- 월간 뷰: 기존 날짜 클릭 → 이벤트 목록 패널 유지

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `components/calendar/TimeGrid.tsx` — exists, 시간 슬롯 + 이벤트 블록 + 빨간선
- [x] `components/calendar/WeekView.tsx` — exists, 7일 컬럼 + TimeGrid 사용
- [x] `components/calendar/DayView.tsx` — exists, 멤버별/단일 컬럼
- [x] `components/calendar/CalendarHeader.tsx` — title/onPrev/onNext/onToday props 추가
- [x] `app/(authenticated)/calendar/page.tsx` — 3가지 뷰 전환 + API 범위 연동
- [x] Commit c0b4ded — Task 1 (TimeGrid + WeekView)
- [x] Commit 4afdcb0 — Task 2 (DayView + 페이지 뷰 전환)
- [x] `npm run build` — PASSED (/calendar: 5.7 kB)

## Self-Check: PASSED
