---
phase: 10-dashboard
plan: 33
type: execute
wave: 3
depends_on: [29, 30, 31, 32]
files_modified:
  - lib/notion/calendar.ts
  - app/api/calendar/today/route.ts
  - components/dashboard/TodaySchedule.tsx
  - components/estimate/LoadEstimateModal.tsx
  - app/(authenticated)/dashboard/page.tsx
  - middleware.ts
  - e2e/dashboard.spec.ts
autonomous: true
requirements: [DASH-05, DASH-06]
must_haves:
  truths:
    - "오늘 일정이 최대 5건 표시된다"
    - "각 이벤트에 시간, 색상 점, 제목, 담당자가 보인다"
    - "견적서 불러오기 버튼 클릭 시 모달이 열린다"
    - "모달에서 견적서 검색/선택 시 해당 견적서로 이동한다"
    - "TEST_MODE=true 시 middleware 인증 우회"
  artifacts:
    - path: "lib/notion/calendar.ts"
      provides: "Notion 캘린더 조회 함수 (기초)"
    - path: "components/dashboard/TodaySchedule.tsx"
      provides: "오늘 일정 컴포넌트"
    - path: "components/estimate/LoadEstimateModal.tsx"
      provides: "견적서 불러오기 모달"
    - path: "e2e/dashboard.spec.ts"
      provides: "대시보드 E2E 테스트"
  key_links:
    - from: "components/dashboard/TodaySchedule.tsx"
      to: "/api/calendar/today"
      via: "fetch GET on mount"
      pattern: "fetch.*api/calendar/today"
    - from: "components/estimate/LoadEstimateModal.tsx"
      to: "Supabase estimates"
      via: "fetch GET /api/estimates"
      pattern: "fetch.*api/estimates"
---

<objective>
오늘 일정 + 견적서 불러오기 모달 + Playwright 테스트 + 테스트용 인증 우회.

Purpose: 대시보드 마지막 섹션들. 오늘 일정은 Notion 캘린더 기초 연동, 견적서 불러오기는 별도 페이지 대신 모달 통합.
Output: TodaySchedule + LoadEstimateModal + E2E 테스트
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@lib/notion/client.ts
@app/(authenticated)/estimates/estimate-list.tsx
@app/(authenticated)/estimates/page.tsx
@middleware.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Notion 캘린더 기초 + 오늘 일정 API/컴포넌트</name>
  <files>lib/notion/calendar.ts, app/api/calendar/today/route.ts, components/dashboard/TodaySchedule.tsx</files>
  <action>
1. `lib/notion/calendar.ts` 생성:
   - `export interface CalendarEvent { id: string; title: string; start: string; end: string | null; type: string; color: string; memberName: string | null }`
   - `export async function getEventsForDate(date: string): Promise<CalendarEvent[]>`
     - Notion 캘린더 DB (NOTION_CALENDAR_SCHED_DB) 쿼리
     - 날짜 필터: date 속성이 해당 날짜인 이벤트
     - getNotionCalendarClient() 사용
     - 속성 매핑 (Notion DB 속성):
       - "이벤트" 또는 "제목" → title (title)
       - "날짜" → start, end (date)
       - "타입" → type (select)
       - "담당자" → memberName (relation → 이름 조회 또는 people)
     - 색상: 타입별 매핑 (방문=blue, 시공=green, 미팅=purple, 기타=gray)
   - 이 함수는 Phase 34에서 getEvents(start, end)로 확장 예정. 여기서는 단일 날짜용만.

2. `app/api/calendar/today/route.ts` 생성:
   - GET: getEventsForDate(오늘 날짜 YYYY-MM-DD) 호출 → 최대 5건 반환
   - 시작 시간순 정렬

3. `components/dashboard/TodaySchedule.tsx` 생성 ('use client'):
   - useState: events, loading
   - useEffect: `/api/calendar/today` GET 호출
   - 각 이벤트:
     - 색상 점 (w-2 h-2 rounded-full) — event.color
     - 시간: HH:MM 포맷 (event.start에서 추출)
     - 제목 (font-medium text-sm)
     - 담당자 (text-xs text-gray-500)
   - 섹션 제목: "오늘 일정" + 건수
   - 빈 상태: "오늘 일정이 없습니다"
   - 카드 스타일: 각 이벤트가 한 줄, 좌측 색상점 + 시간 + 제목 + 담당자
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>Notion 캘린더 기초 연동, 오늘 일정 API가 최대 5건 반환, TodaySchedule 컴포넌트 렌더링</done>
</task>

<task type="auto">
  <name>Task 2: 견적서 불러오기 모달 + 대시보드 통합 + 테스트 인증 우회</name>
  <files>components/estimate/LoadEstimateModal.tsx, app/(authenticated)/dashboard/page.tsx, middleware.ts, e2e/dashboard.spec.ts</files>
  <action>
1. `components/estimate/LoadEstimateModal.tsx` 생성 ('use client'):
   - Props: `{ isOpen: boolean; onClose: () => void }`
   - isOpen=false면 null 반환
   - 모달 오버레이 (fixed inset-0 bg-black/40) + 모달 본체 (bg-white rounded-xl max-w-lg)
   - 검색 input (estimate-list.tsx의 검색 로직 재사용 패턴)
   - 견적서 목록: `/api/estimates` 또는 Supabase 직접 조회로 최근 20건 로드
   - 각 항목: 고객명, 현장명, 날짜, 총액 (estimate-list.tsx 카드와 유사한 레이아웃)
   - 항목 클릭 시: `router.push('/estimate/${id}')` → onClose()
   - ESC로 닫기, 오버레이 클릭으로 닫기

2. `app/(authenticated)/dashboard/page.tsx` 최종 통합:
   - TodaySchedule import + 렌더링 (`{/* 오늘 일정 + 견적서 불러오기 — Phase 33 */}` 주석 교체)
   - "견적서 불러오기" 버튼 (bg-brand text-white rounded-md px-4 py-2)
   - useState: showLoadModal → LoadEstimateModal 연결
   - 전체 대시보드 레이아웃:
     - CS 현황 (CsStatusSection)
     - 미발송 (UnsentCard)
     - 견적서 열람 고객 (ViewedCard)
     - 연락해야 할 곳 (FollowUpCard)
     - 오늘 일정 (TodaySchedule) + 견적서 불러오기 버튼
   - 각 섹션 사이 mt-6 간격

3. `middleware.ts` 수정 — 테스트 인증 우회:
   - updateSession 함수 내 인증 체크 전에:
   ```typescript
   if (process.env.TEST_MODE === 'true') {
     return supabaseResponse
   }
   ```
   - 이렇게 하면 TEST_MODE=true 환경에서는 미인증 상태에서도 /dashboard 등 접근 가능

4. `e2e/dashboard.spec.ts` 생성:
   - Playwright 설치 확인: `npx playwright --version` 또는 `npm install -D @playwright/test`
   - `playwright.config.ts` 없으면 기본 설정 생성 (baseURL: http://localhost:3000, webServer 미설정 — 별도 시작 가정)
   - 테스트:
     - "대시보드 페이지 로드": /dashboard 접속 → "대시보드" 텍스트 존재 확인
     - "섹션 제목 표시": CS 현황, 미발송, 견적서 열람 고객, 연락해야 할 곳, 오늘 일정 제목 존재
     - "견적서 불러오기 모달 열기/닫기": 버튼 클릭 → 모달 visible → ESC → 모달 hidden
   - 환경: TEST_MODE=true로 실행 필요 (use.env 또는 .env.test)
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>대시보드 5개 섹션 완성, 견적서 불러오기 모달 동작, TEST_MODE 인증 우회, E2E 테스트 파일 존재. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /dashboard에 5개 섹션 모두 표시
3. "견적서 불러오기" 버튼 → 모달 → 검색 → 선택 → 이동
4. TEST_MODE=true 시 인증 없이 접근 가능
5. e2e/dashboard.spec.ts 파일 존재 (실행은 서버 필요)
</verification>

<success_criteria>
- 대시보드 5개 섹션이 모두 통합된 완성 페이지
- Notion 캘린더 기초 연동으로 오늘 일정 표시
- 견적서 불러오기가 모달로 통합되어 별도 페이지 불필요
- Playwright 테스트 기반 구축
</success_criteria>

<output>
After completion, create `.planning/phases/10-dashboard/33-SUMMARY.md`
</output>
