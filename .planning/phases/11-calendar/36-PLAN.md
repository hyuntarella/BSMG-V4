---
phase: 11-calendar
plan: 36
type: execute
wave: 3
depends_on: [34, 35]
files_modified:
  - components/calendar/EventModal.tsx
  - components/calendar/EventDetail.tsx
  - components/calendar/SettingsModal.tsx
  - app/api/calendar/members/route.ts
  - app/(authenticated)/calendar/page.tsx
  - e2e/calendar.spec.ts
autonomous: true
requirements: [CAL-05, CAL-06, CAL-07]
must_haves:
  truths:
    - "빈 시간 슬롯 클릭 시 이벤트 생성 모달이 열린다"
    - "이벤트 클릭 시 상세 패널이 표시된다"
    - "이벤트 생성/수정/삭제가 Notion에 반영된다"
    - "설정 모달에서 팀원을 추가/제거할 수 있다"
    - "이벤트에 CRM 고객을 연결할 수 있다"
  artifacts:
    - path: "components/calendar/EventModal.tsx"
      provides: "이벤트 생성/편집 모달"
    - path: "components/calendar/EventDetail.tsx"
      provides: "이벤트 상세 패널"
    - path: "components/calendar/SettingsModal.tsx"
      provides: "캘린더 설정 모달"
    - path: "e2e/calendar.spec.ts"
      provides: "캘린더 E2E 테스트"
  key_links:
    - from: "components/calendar/EventModal.tsx"
      to: "/api/calendar"
      via: "POST (create) or PATCH (update)"
      pattern: "fetch.*api/calendar"
    - from: "components/calendar/EventDetail.tsx"
      to: "/api/calendar/[id]"
      via: "PATCH (update) or DELETE (delete)"
      pattern: "fetch.*api/calendar/"
---

<objective>
이벤트 CRUD 모달 + 팀원 관리 + CRM 고객 연동 + E2E 테스트.

Purpose: 캘린더의 상호작용 기능 완성. GAS 캘린더의 이벤트 관리 + 팀원 설정 재현.
Output: EventModal + EventDetail + SettingsModal + E2E 테스트
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@lib/notion/calendar.ts
@components/calendar/MonthView.tsx
@components/calendar/WeekView.tsx
@components/calendar/CalendarHeader.tsx
</context>

<interfaces>
From lib/notion/calendar.ts:
```typescript
export interface CalendarEvent {
  id: string; title: string; start: string; end: string | null;
  allDay: boolean; type: string; color: string;
  memberName: string | null; memberId: string | null;
  crmCustomerId: string | null; crmCustomerName: string | null;
  memo: string | null; action: string | null;
}

export interface CreateEventInput {
  title: string; start: string; end?: string; allDay?: boolean;
  type?: string; memberId?: string; crmCustomerId?: string;
  memo?: string; action?: string;
}

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent>
export async function updateEvent(id: string, input: Partial<CreateEventInput>): Promise<void>
export async function deleteEvent(id: string): Promise<void>
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: EventModal + EventDetail 컴포넌트</name>
  <files>components/calendar/EventModal.tsx, components/calendar/EventDetail.tsx</files>
  <action>
1. `components/calendar/EventModal.tsx` 생성 ('use client'):
   - Props: `{ isOpen: boolean; onClose: () => void; onSave: (event: CalendarEvent) => void; initialDate?: string; editEvent?: CalendarEvent | null; members: { id: string; name: string }[] }`
   - isOpen=false → null 반환
   - 모달 오버레이 + 본체 (max-w-md)
   - 폼 필드:
     - 제목 (text input, required)
     - 날짜/시간 (date + time input for start/end)
     - 종일 토글 (checkbox — 체크 시 시간 input 숨김)
     - 타입 (select: 방문, 시공, 미팅, 기타)
     - 액션 (select: 방문, 견적, 시공, 하자점검, 기타)
     - 담당자 (select: members 목록에서 선택)
     - CRM 고객 검색 (text input + 자동완성):
       - 입력 시 `/api/crm/cs-status` 또는 Notion CRM 검색 API 호출 (debounce 300ms)
       - 검색 결과를 드롭다운으로 표시 → 선택 시 crmCustomerId + crmCustomerName 세팅
     - 메모 (textarea)
   - 저장 버튼:
     - editEvent 있으면 PATCH `/api/calendar/${editEvent.id}` → onSave
     - 없으면 POST `/api/calendar` → onSave
   - editEvent 있으면 "삭제" 버튼: DELETE `/api/calendar/${editEvent.id}` → onClose
   - 취소 버튼: onClose

2. `components/calendar/EventDetail.tsx` 생성 ('use client'):
   - Props: `{ event: CalendarEvent | null; onClose: () => void; onEdit: (event: CalendarEvent) => void; onDelete: (id: string) => void }`
   - event=null → null 반환
   - 사이드 패널 (fixed right-0, w-80, bg-white shadow-xl) 또는 하단 시트
   - 표시: 제목, 날짜/시간, 타입 칩(색상), 액션, 담당자, CRM고객(클릭 시 CRM 이동), 메모
   - 메모 편집: textarea, blur 시 PATCH `/api/calendar/${event.id}` body: { memo }
   - "편집" 버튼 → onEdit(event) (상위에서 EventModal 열기)
   - "삭제" 버튼 → confirm 후 onDelete(event.id)
   - x 닫기 버튼
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>이벤트 생성/편집 모달과 상세 패널이 타입 에러 없이 완성</done>
</task>

<task type="auto">
  <name>Task 2: SettingsModal + 멤버 API + 페이지 연결 + E2E</name>
  <files>components/calendar/SettingsModal.tsx, app/api/calendar/members/route.ts, app/(authenticated)/calendar/page.tsx, e2e/calendar.spec.ts</files>
  <action>
1. `app/api/calendar/members/route.ts` 생성:
   - GET: Notion MEMBER_DB에서 멤버 목록 조회 → `{ members: { id: string; name: string; color: string }[] }`
   - `lib/notion/calendar.ts`에 `getMembers()` 함수 추가:
     - NOTION_CALENDAR_MEMBER_DB 쿼리
     - 이름, 색상 속성 매핑

2. `components/calendar/SettingsModal.tsx` 생성 ('use client'):
   - Props: `{ isOpen: boolean; onClose: () => void }`
   - isOpen=false → null 반환
   - 모달 (max-w-md)
   - 탭: "팀원 관리" / "이벤트 타입"
   - 팀원 관리 탭:
     - 현재 멤버 리스트 (이름 + 색상 점)
     - 멤버 추가: 이름 input + "추가" 버튼 → POST to Notion MEMBER_DB (또는 별도 API)
     - 멤버 삭제: x 버튼 → archive
   - 이벤트 타입 탭:
     - 현재 타입 리스트 (이름 + 색상)
     - 타입은 Notion select 옵션이므로, NOTION_CALENDAR_SETTINGS_DB에서 관리하거나 하드코딩
     - 간단하게: 기본 4개 타입(방문/시공/미팅/기타) + 색상을 표시 (편집은 Notion에서 직접)

3. `app/(authenticated)/calendar/page.tsx` 수정:
   - 상태 추가: selectedEvent, showEventModal, showSettings, editingEvent, members
   - useEffect: `/api/calendar/members` GET → members 세팅
   - CalendarHeader에 "설정" 버튼 (기어 아이콘) 추가 → showSettings 토글
   - MonthView/WeekView/DayView에 onEventClick prop 연결 → selectedEvent 세팅 → EventDetail 표시
   - 빈 시간 슬롯 클릭 (onSlotClick) → showEventModal + initialDate 세팅
   - MonthView에서 날짜 셀 더블클릭 → 이벤트 생성 모달
   - EventDetail.onEdit → editingEvent 세팅 → EventModal 열기 (editEvent prop)
   - EventDetail.onDelete → DELETE API → events에서 제거
   - EventModal.onSave → events 업데이트 (추가 또는 수정)
   - SettingsModal 연결

4. `e2e/calendar.spec.ts` 생성:
   - "캘린더 페이지 로드": /calendar 접속 → 월간 그리드 표시
   - "뷰 전환": 주간 클릭 → 시간 그리드 표시, 일간 클릭 → 멤버 컬럼 표시, 월간 → 그리드 복귀
   - "이벤트 생성 모달": + 버튼 또는 빈 셀 클릭 → 모달 visible → 취소 → 모달 hidden
   - TEST_MODE=true 필요
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>캘린더 이벤트 CRUD 전체 동작, 설정 모달, CRM 고객 연결, E2E 테스트 존재. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. 빈 셀/시간 클릭 → 이벤트 생성 모달 → 저장 → 캘린더에 표시
3. 이벤트 클릭 → 상세 패널 → 편집/삭제 가능
4. CRM 고객 검색/연결 동작
5. 설정 모달에서 멤버 목록 표시
</verification>

<success_criteria>
- 캘린더 이벤트 CRUD가 Notion에 반영
- CRM 고객과 이벤트 연결 가능
- 팀원 관리 기능 제공
- GAS 캘린더의 핵심 기능 재현 완료
</success_criteria>

<output>
After completion, create `.planning/phases/11-calendar/36-SUMMARY.md`
</output>
