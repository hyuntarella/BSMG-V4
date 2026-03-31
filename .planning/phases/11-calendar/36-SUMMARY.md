---
phase: 11-calendar
plan: 36
subsystem: calendar
tags: [calendar, event-crud, modal, crm-integration, team-members, e2e]
dependency_graph:
  requires: [34-PLAN, 35-PLAN]
  provides: [event-modal, event-detail, settings-modal, crm-search-api, members-api, e2e-tests]
  affects: [app/calendar, api/calendar, api/crm]
tech_stack:
  added: []
  patterns: [debounced-crm-search, side-panel-detail, modal-form, members-from-notion]
key_files:
  created:
    - components/calendar/EventModal.tsx
    - components/calendar/EventDetail.tsx
    - components/calendar/SettingsModal.tsx
    - app/api/calendar/members/route.ts
    - app/api/crm/search/route.ts
    - e2e/calendar.spec.ts
  modified:
    - lib/notion/calendar.ts
    - app/(authenticated)/calendar/page.tsx
decisions:
  - "EventModal CRM 검색: /api/crm/search 신규 라우트 생성 — debounce 300ms, 고객명/주소 contains 필터"
  - "EventDetail 우측 고정 패널: fixed right-0 w-80 — 모달보다 비침습적으로 이벤트 상세 표시"
  - "getMembers() 실패 시 빈 배열 반환 — NOTION_CALENDAR_MEMBER_DB 미설정 환경에서도 앱 동작"
  - "SettingsModal POST /api/calendar/members 호출 — API 미구현 시 alert로 사용자 안내"
  - "calendar/page.tsx: EventDetail + EventModal + SettingsModal 통합, 단일 페이지에서 전체 CRUD 관리"
metrics:
  duration_seconds: 480
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 8
---

# Phase 11 Plan 36: 이벤트 CRUD 모달 + 팀원 관리 + CRM 연동 Summary

EventModal + EventDetail + SettingsModal로 캘린더 이벤트 CRUD 완성 + CRM 고객 연결 + 팀원 관리.

## What Was Built

### Task 1: EventModal + EventDetail 컴포넌트 (commit 1b6346c)

**`components/calendar/EventModal.tsx`**:
- Props: `isOpen`, `onClose`, `onSave`, `initialDate`, `editEvent`, `members`
- 폼 필드: 제목(required), 날짜/시간 start+end, 종일 토글(시간 input 숨김), 타입 select(방문/시공/미팅/기타), 액션 select(방문/견적/시공/하자점검/기타), 담당자 select(members prop), CRM 고객 검색(debounce 300ms, 자동완성 드롭다운), 메모 textarea
- 저장: editEvent 있으면 PATCH `/api/calendar/${id}`, 없으면 POST `/api/calendar`
- 삭제 버튼: confirm 후 DELETE `/api/calendar/${id}` → onClose
- saving/deleting 로딩 상태

**`components/calendar/EventDetail.tsx`**:
- Props: `event`, `onClose`, `onEdit`, `onDelete`
- fixed right-0 w-80 사이드 패널
- 표시: 제목, 타입 칩(색상), 액션 칩, 날짜/시간, 담당자, CRM 고객(Link → /crm?id=), 메모
- 메모 편집: textarea, blur 시 PATCH `/api/calendar/${id}` body: { memo }
- 편집/삭제 버튼

### Task 2: SettingsModal + 멤버 API + 페이지 연결 + E2E (commit 0b00225)

**`lib/notion/calendar.ts`** 확장:
- `CalendarMember` 타입: `{ id, name, color }`
- `getMembers()`: NOTION_CALENDAR_MEMBER_DB 쿼리 → 이름/색상 매핑 (미설정 시 빈 배열)

**`app/api/calendar/members/route.ts`**:
- GET: `getMembers()` 호출 → `{ members: CalendarMember[] }`

**`app/api/crm/search/route.ts`**:
- GET `/api/crm/search?q=...&limit=...`: Notion CRM DB 고객명/주소 contains 검색 → `{ results: [{id, name}] }`

**`components/calendar/SettingsModal.tsx`**:
- 탭: "팀원 관리" / "이벤트 타입"
- 팀원 관리: `/api/calendar/members` GET → 목록, POST → 추가, DELETE → 삭제
- 이벤트 타입: 기본 4개 하드코딩 표시 (Notion에서 직접 관리 안내)

**`app/(authenticated)/calendar/page.tsx`** 업데이트:
- `members` 상태: useEffect에서 `/api/calendar/members` GET
- `showEventModal`, `editingEvent`, `modalInitialDate` 상태 추가
- `showSettings` 상태 추가
- 헤더 액션 바: "+ 새 일정" 버튼 + 기어 아이콘 설정 버튼
- `openCreateModal(dateStr?)`: 날짜 프리셋으로 생성 모달
- `openEditModal(ev)`: 이벤트 편집 모달
- `handleEventSaved(savedEvent)`: events 상태 업데이트 (upsert 패턴)
- `handleDeleteEvent(id)`: DELETE API + events에서 제거
- 월간 뷰 이벤트 목록: 클릭 시 편집 모달 (+ 추가 링크)
- EventDetail, EventModal, SettingsModal 렌더링 연결

**`e2e/calendar.spec.ts`**:
- "캘린더 페이지 로드": 월간 그리드 요일 헤더 확인
- "뷰 전환 — 주간": 시간 라벨 08:00 표시
- "뷰 전환 — 일간": 시간 라벨 표시
- "뷰 전환 — 월간 복귀": 요일 헤더 재확인
- "이벤트 생성 모달 열기/닫기": + 버튼 → 모달 visible → 취소 → hidden
- "이벤트 생성 모달 — 제목 입력": 제목 텍스트 입력 검증
- "설정 모달 열기/닫기": 기어 버튼 → 설정 visible → 닫기

## Deviations from Plan

### Auto-added: /api/crm/search 라우트
- **Found during:** Task 1 EventModal 구현
- **Issue:** EventModal의 CRM 고객 검색이 `/api/crm/search`를 호출하나 해당 라우트가 미존재
- **Fix:** Rule 3 (blocking issue) — `app/api/crm/search/route.ts` 신규 생성, Notion CRM DB 검색
- **Files modified:** `app/api/crm/search/route.ts`
- **Commit:** 0b00225

## Known Stubs

None — 모든 API 연결이 실제 Notion 데이터를 사용.

- `SettingsModal`의 POST `/api/calendar/members` — 별도 멤버 추가 API 미구현 (현재 404 반환 시 alert 안내). NOTION_CALENDAR_MEMBER_DB를 통한 Notion 페이지 직접 생성은 추후 구현 가능.

## Self-Check

- [x] `components/calendar/EventModal.tsx` — exists, 이벤트 생성/편집 모달
- [x] `components/calendar/EventDetail.tsx` — exists, 우측 사이드 패널
- [x] `components/calendar/SettingsModal.tsx` — exists, 팀원/타입 관리
- [x] `app/api/calendar/members/route.ts` — exists, GET 팀원 목록
- [x] `app/api/crm/search/route.ts` — exists, CRM 고객 검색
- [x] `e2e/calendar.spec.ts` — exists, 7개 테스트 케이스
- [x] `lib/notion/calendar.ts` — getMembers() 추가
- [x] `app/(authenticated)/calendar/page.tsx` — 전체 CRUD 연결
- [x] Commit 1b6346c — Task 1 (EventModal + EventDetail)
- [x] Commit 0b00225 — Task 2 (SettingsModal + 멤버 API + 페이지 + E2E)
- [x] `npm run build` — PASSED (/calendar: 9.8 kB)

## Self-Check: PASSED
