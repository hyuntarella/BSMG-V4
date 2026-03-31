---
phase: 11-calendar
plan: 34
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/notion/calendar.ts
  - app/api/calendar/route.ts
  - app/api/calendar/[id]/route.ts
  - app/(authenticated)/calendar/page.tsx
  - components/calendar/MonthView.tsx
  - components/calendar/CalendarHeader.tsx
autonomous: true
requirements: [CAL-01, CAL-02]
must_haves:
  truths:
    - "월간 그리드에 이벤트가 칩으로 표시된다"
    - "이전/다음/오늘 버튼으로 월 이동이 가능하다"
    - "이벤트 칩에 색상 + 제목이 표시된다"
    - "날짜 셀 클릭 시 해당 날짜의 이벤트 목록이 표시된다"
  artifacts:
    - path: "lib/notion/calendar.ts"
      provides: "캘린더 CRUD 함수 (getEvents, createEvent, updateEvent, deleteEvent)"
    - path: "app/api/calendar/route.ts"
      provides: "캘린더 API (GET/POST)"
      exports: ["GET", "POST"]
    - path: "app/api/calendar/[id]/route.ts"
      provides: "캘린더 개별 이벤트 API (PATCH/DELETE)"
      exports: ["PATCH", "DELETE"]
    - path: "components/calendar/MonthView.tsx"
      provides: "월간 달력 그리드"
  key_links:
    - from: "components/calendar/MonthView.tsx"
      to: "/api/calendar"
      via: "fetch GET with start/end params"
      pattern: "fetch.*api/calendar"
    - from: "app/api/calendar/route.ts"
      to: "lib/notion/calendar.ts"
      via: "getEvents/createEvent import"
      pattern: "import.*from.*notion/calendar"
---

<objective>
Notion 캘린더 API 전체 CRUD + 월간 뷰 구현.

Purpose: 캘린더 페이지의 기반. Notion 캘린더 DB에서 이벤트를 조회/생성/수정/삭제하고, 월간 그리드로 표시.
Output: 캘린더 라이브러리 + API 라우트 + 월간 뷰 + 네비게이션 헤더
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@lib/notion/client.ts
@components/layout/Header.tsx
@app/(authenticated)/calendar/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Notion 캘린더 CRUD 라이브러리 + API 라우트</name>
  <files>lib/notion/calendar.ts, app/api/calendar/route.ts, app/api/calendar/[id]/route.ts</files>
  <action>
1. `lib/notion/calendar.ts` 확장 (Phase 33에서 기초 생성됨, 여기서 전체 CRUD):
   - 타입 정의:
     ```typescript
     export interface CalendarEvent {
       id: string
       title: string
       start: string        // ISO datetime
       end: string | null
       allDay: boolean
       type: string         // 방문, 시공, 미팅, 기타
       color: string        // type별 매핑 색상
       memberName: string | null
       memberId: string | null
       crmCustomerId: string | null
       crmCustomerName: string | null
       memo: string | null
       action: string | null  // 방문, 견적, 시공, 하자점검 등
     }

     export interface CreateEventInput {
       title: string
       start: string
       end?: string
       allDay?: boolean
       type?: string
       memberId?: string
       crmCustomerId?: string
       memo?: string
       action?: string
     }
     ```
   - `export async function getEvents(start: string, end: string): Promise<CalendarEvent[]>`
     - NOTION_CALENDAR_SCHED_DB 쿼리
     - 날짜 범위 필터: date >= start AND date <= end
     - 속성 매핑 (Notion DB):
       - title → title (title 속성)
       - 날짜 → start, end (date 속성)
       - 타입 → type (select)
       - 담당자 → memberId, memberName (relation → NOTION_CALENDAR_MEMBER_DB 참조)
       - 메모 → memo (rich_text)
       - 액션 → action (select)
       - CRM 고객 → crmCustomerId, crmCustomerName (relation)
     - 색상 매핑: { 방문: '#3B82F6', 시공: '#10B981', 미팅: '#8B5CF6', 기타: '#6B7280' }

   - `export async function createEvent(input: CreateEventInput): Promise<CalendarEvent>`
     - Notion page create → NOTION_CALENDAR_SCHED_DB에 새 페이지

   - `export async function updateEvent(id: string, input: Partial<CreateEventInput>): Promise<void>`
     - Notion page update

   - `export async function deleteEvent(id: string): Promise<void>`
     - Notion page archive (archive: true)

   - `export async function getEventsForDate(date: string)` — 기존 함수 유지, getEvents를 내부 호출

2. `app/api/calendar/route.ts`:
   - GET: searchParams에서 start, end 파싱 → getEvents(start, end) → JSON 반환
   - POST: body에서 CreateEventInput 파싱 → createEvent() → 201 + 생성된 이벤트

3. `app/api/calendar/[id]/route.ts`:
   - PATCH: body에서 Partial<CreateEventInput> 파싱 → updateEvent(id, input) → 200
   - DELETE: deleteEvent(id) → 200
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>Notion 캘린더 CRUD 라이브러리 + 4개 API 엔드포인트(GET/POST/PATCH/DELETE) 완성</done>
</task>

<task type="auto">
  <name>Task 2: 월간 뷰 + 캘린더 페이지 SSR</name>
  <files>components/calendar/MonthView.tsx, components/calendar/CalendarHeader.tsx, app/(authenticated)/calendar/page.tsx</files>
  <action>
1. `components/calendar/CalendarHeader.tsx` 생성 ('use client'):
   - Props: `{ currentDate: Date; view: 'month' | 'week' | 'day'; onDateChange: (d: Date) => void; onViewChange: (v: 'month' | 'week' | 'day') => void }`
   - 이전(chevron-left)/다음(chevron-right)/오늘 버튼
   - 현재 월/연도 표시: "2026년 3월"
   - 뷰 전환 탭: 월간/주간/일간 (bg-gray-100 rounded-lg, 선택 시 bg-white shadow-sm)
   - 주간/일간 탭은 Phase 35에서 활성화 — 여기서는 클릭 시 onViewChange만 호출

2. `components/calendar/MonthView.tsx` 생성 ('use client'):
   - Props: `{ events: CalendarEvent[]; currentDate: Date; onDateClick: (date: string) => void }`
   - 7x6 그리드 (일~토 헤더 + 최대 6주)
   - 각 날짜 셀:
     - 날짜 숫자 (현재 월이 아닌 날은 text-gray-300)
     - 오늘 날짜: bg-brand text-white rounded-full
     - 해당 날짜 이벤트: 최대 3개 칩 표시 (overflow면 "+N" 표시)
     - 이벤트 칩: 좌측 색상 점 (w-1.5 h-1.5 rounded-full) + 제목 (text-xs truncate)
   - 날짜 셀 클릭 → onDateClick(YYYY-MM-DD)
   - 그리드 스타일: border-collapse, 각 셀 min-h-24 border border-gray-100

3. `app/(authenticated)/calendar/page.tsx` 재작성:
   - 'use client' (클라이언트 상태 관리 필요: currentDate, view, events, selectedDate)
   - Header (레이아웃) import
   - useState: currentDate (Date), view ('month' | 'week' | 'day'), events (CalendarEvent[]), selectedDate
   - useEffect: currentDate 변경 시 `/api/calendar?start=YYYY-MM-01&end=YYYY-MM-31` GET → events 세팅
   - CalendarHeader + MonthView 렌더링
   - 주간/일간 뷰는 Phase 35에서 추가 — 여기서는 view='month'일 때만 MonthView 표시, 나머지는 placeholder
   - selectedDate 클릭 시: 해당 날짜 이벤트를 하단에 간단 리스트로 표시 (사이드패널 대신)
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>월간 달력 그리드에 Notion 이벤트 칩 표시, 월 이동 네비, 날짜 클릭 → 이벤트 리스트. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /calendar 접속 시 월간 그리드 표시
3. 이전/다음/오늘 버튼으로 월 이동
4. 이벤트가 해당 날짜 셀에 칩으로 표시
5. 날짜 클릭 시 해당 날짜 이벤트 리스트
</verification>

<success_criteria>
- Notion 캘린더 CRUD가 완전히 동작
- 월간 그리드가 이벤트를 색상 칩으로 표시
- 날짜 네비게이션이 동작
</success_criteria>

<output>
After completion, create `.planning/phases/11-calendar/34-SUMMARY.md`
</output>
