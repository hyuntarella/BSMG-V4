---
phase: 11-calendar
plan: 35
type: execute
wave: 2
depends_on: [34]
files_modified:
  - components/calendar/WeekView.tsx
  - components/calendar/DayView.tsx
  - components/calendar/TimeGrid.tsx
  - app/(authenticated)/calendar/page.tsx
autonomous: true
requirements: [CAL-03, CAL-04]
must_haves:
  truths:
    - "주간 뷰에서 7일 컬럼 + 시간 슬롯에 이벤트 블록이 표시된다"
    - "일간 뷰에서 멤버별 컬럼 + 시간 슬롯에 이벤트 블록이 표시된다"
    - "뷰 전환 탭(월간/주간/일간)이 동작한다"
    - "오늘인 경우 현재 시간에 빨간 선이 표시된다"
  artifacts:
    - path: "components/calendar/WeekView.tsx"
      provides: "주간 달력 뷰"
    - path: "components/calendar/DayView.tsx"
      provides: "일간 달력 뷰"
    - path: "components/calendar/TimeGrid.tsx"
      provides: "시간 그리드 공통 컴포넌트"
  key_links:
    - from: "app/(authenticated)/calendar/page.tsx"
      to: "components/calendar/WeekView.tsx"
      via: "view === 'week' conditional render"
      pattern: "view.*week.*WeekView"
    - from: "components/calendar/WeekView.tsx"
      to: "components/calendar/TimeGrid.tsx"
      via: "TimeGrid import"
      pattern: "import.*TimeGrid"
---

<objective>
주간/일간 뷰 + 뷰 전환 완성.

Purpose: 월간 뷰와 함께 3가지 뷰를 제공하여 GAS 캘린더의 기능 재현.
Output: WeekView + DayView + TimeGrid 공통 컴포넌트 + 뷰 전환 연결
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@components/calendar/MonthView.tsx
@components/calendar/CalendarHeader.tsx
@lib/notion/calendar.ts
</context>

<interfaces>
From lib/notion/calendar.ts:
```typescript
export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string | null
  allDay: boolean
  type: string
  color: string
  memberName: string | null
  memberId: string | null
  memo: string | null
  action: string | null
}
```

From components/calendar/CalendarHeader.tsx:
```typescript
interface CalendarHeaderProps {
  currentDate: Date
  view: 'month' | 'week' | 'day'
  onDateChange: (d: Date) => void
  onViewChange: (v: 'month' | 'week' | 'day') => void
}
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: TimeGrid 공통 + WeekView 컴포넌트</name>
  <files>components/calendar/TimeGrid.tsx, components/calendar/WeekView.tsx</files>
  <action>
1. `components/calendar/TimeGrid.tsx` 생성 ('use client'):
   - Props: `{ columns: { key: string; label: string; date?: string }[]; events: CalendarEvent[]; startHour?: number; endHour?: number; onEventClick?: (event: CalendarEvent) => void }`
   - startHour 기본 8, endHour 기본 20
   - 좌측 시간 라벨 컬럼 (w-14): "08:00", "09:00", ... "20:00"
   - 각 컬럼: columns 배열에 따라 동적 생성
   - 시간 슬롯: 1시간 단위 행 (h-16), 15분 단위 점선 구분
   - 이벤트 블록:
     - position: absolute, top 계산: (event.start 시간 - startHour) * 64px (h-16 = 64px)
     - height: (duration in hours) * 64px, min-height: 32px (30분 이상)
     - 배경: event.color + opacity-20, 좌측 border-l-4 event.color
     - 내용: 시간 + 제목 (text-xs)
   - 현재 시간 빨간 선:
     - 오늘 날짜인 컬럼에만 표시
     - top: (현재 시간 - startHour) * 64px
     - border-t-2 border-red-500, z-10
     - 좌측에 빨간 원 (w-2 h-2 rounded-full bg-red-500)
   - AllDay 이벤트: 컬럼 상단에 칩으로 표시

2. `components/calendar/WeekView.tsx` 생성 ('use client'):
   - Props: `{ events: CalendarEvent[]; currentDate: Date; onEventClick?: (event: CalendarEvent) => void }`
   - 해당 주의 7일 계산 (일요일 시작)
   - columns: 7일 각각 { key: YYYY-MM-DD, label: "월 31", date: YYYY-MM-DD }
   - 상단에 요일 헤더 (일~토), 오늘은 bg-brand/10 강조
   - TimeGrid에 columns + 해당 주 이벤트 전달
   - 이벤트 필터: event.start가 해당 주에 속하는 것
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>TimeGrid 공통 컴포넌트가 시간 슬롯 + 이벤트 블록 + 현재시간 빨간선 제공, WeekView가 7일 컬럼으로 렌더링</done>
</task>

<task type="auto">
  <name>Task 2: DayView + 캘린더 페이지 뷰 전환 연결</name>
  <files>components/calendar/DayView.tsx, app/(authenticated)/calendar/page.tsx</files>
  <action>
1. `components/calendar/DayView.tsx` 생성 ('use client'):
   - Props: `{ events: CalendarEvent[]; currentDate: Date; members: { id: string; name: string }[]; onEventClick?: (event: CalendarEvent) => void }`
   - 멤버별 컬럼: members 배열에서 columns 생성 { key: memberId, label: memberName }
   - 멤버가 없으면 단일 "전체" 컬럼
   - 이벤트를 memberName/memberId 기준으로 해당 컬럼에 배치
   - TimeGrid에 columns + 이벤트 전달

2. `app/(authenticated)/calendar/page.tsx` 수정:
   - view state에 따라 조건부 렌더링:
     - 'month': MonthView
     - 'week': WeekView
     - 'day': DayView
   - view 변경 시 API 호출 날짜 범위도 변경:
     - month: 해당 월 1일 ~ 말일
     - week: 해당 주 일~토
     - day: 해당 일
   - CalendarHeader의 날짜 표시도 view에 따라 변경:
     - month: "2026년 3월"
     - week: "2026년 3월 29일 ~ 4월 4일"
     - day: "2026년 3월 31일 (월)"
   - 이전/다음 버튼도 view에 따라:
     - month: +-1개월
     - week: +-1주
     - day: +-1일
   - members 목록: Notion MEMBER_DB에서 가져오기 — `/api/calendar?type=members` GET 추가 또는 별도 API
     - 간단하게: `lib/notion/calendar.ts`에 `getMembers()` 함수 추가
     - `app/api/calendar/members/route.ts` 또는 calendar/route.ts에 type=members 분기
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>3가지 뷰(월간/주간/일간) 전환 동작, 각 뷰에 이벤트 표시, 현재 시간 빨간선. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. 월간/주간/일간 뷰 전환 탭 동작
3. 주간 뷰: 7일 컬럼 + 시간 슬롯 + 이벤트 블록
4. 일간 뷰: 멤버별 컬럼 + 이벤트 블록
5. 오늘인 경우 빨간 선 표시
6. 이전/다음/오늘 버튼이 뷰에 맞게 동작
</verification>

<success_criteria>
- 3가지 캘린더 뷰가 완성되어 GAS 캘린더 기능 대체
- 시간 그리드 공통 컴포넌트로 코드 재사용
- 현재 시간 빨간 선으로 시각적 위치 표시
</success_criteria>

<output>
After completion, create `.planning/phases/11-calendar/35-SUMMARY.md`
</output>
