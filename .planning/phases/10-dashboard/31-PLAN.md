---
phase: 10-dashboard
plan: 31
type: execute
wave: 2
depends_on: [29]
files_modified:
  - app/api/dashboard/viewed/route.ts
  - components/dashboard/ViewedCard.tsx
  - lib/utils/relativeTime.ts
  - app/(authenticated)/dashboard/page.tsx
autonomous: true
requirements: [DASH-03]
must_haves:
  truths:
    - "견적서 열람한 고객이 카드로 표시된다"
    - "24시간 이내 열람은 시간 단위로 표시 ('3시간 전')"
    - "24시간 이후 열람은 일 단위로 표시 ('5일 전')"
    - "x 버튼으로 카드를 UI에서 숨길 수 있다"
  artifacts:
    - path: "app/api/dashboard/viewed/route.ts"
      provides: "열람 고객 API"
      exports: ["GET"]
    - path: "components/dashboard/ViewedCard.tsx"
      provides: "열람 고객 카드 컴포넌트"
    - path: "lib/utils/relativeTime.ts"
      provides: "상대 시간 포맷 함수"
  key_links:
    - from: "app/api/dashboard/viewed/route.ts"
      to: "estimates table"
      via: "Supabase query email_viewed_at IS NOT NULL"
      pattern: "supabase.*estimates.*email_viewed_at"
    - from: "components/dashboard/ViewedCard.tsx"
      to: "lib/utils/relativeTime.ts"
      via: "formatRelativeTime import"
      pattern: "formatRelativeTime"
---

<objective>
견적서 열람 고객 카드 — estimates 테이블에서 email_viewed_at이 있는 건을 조회하여 상대 시간과 함께 표시.

Purpose: 견적서를 열람한 고객은 관심도가 높으므로 즉시 연락 대상.
Output: 열람 고객 API + 상대시간 유틸 + ViewedCard 컴포넌트
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@lib/supabase/server.ts
@app/api/track/[id]/route.ts
@lib/utils/dismissed.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: 상대시간 유틸 + 열람 고객 API</name>
  <files>lib/utils/relativeTime.ts, app/api/dashboard/viewed/route.ts</files>
  <action>
1. `lib/utils/relativeTime.ts` 생성:
   - `export function formatRelativeTime(dateStr: string): string`
   - 현재 시각과의 차이 계산
   - 24시간 이내: 시간 단위 반환 ("1시간 전", "3시간 전", "방금 전" for <1h)
   - 24시간 이후: 일 단위 반환 ("1일 전", "5일 전")
   - 30일 이상: "30일+ 전"
   - dayjs 등 외부 라이브러리 없이 직접 구현 (Date.now() - new Date(dateStr).getTime())

2. `app/api/dashboard/viewed/route.ts` 생성:
   - GET: Supabase에서 estimates 조회
     - 조건: `email_viewed_at IS NOT NULL`
     - select: id, customer_name, site_name, email_viewed_at, grand_total (sheets join 또는 별도 쿼리)
     - 최신 열람순 정렬 (email_viewed_at desc)
     - limit 20
   - 인증: createClient() (서버) → auth.getUser() → company_id 조회 → estimates.company_id 필터
   - 반환: `{ records: ViewedRecord[] }` — id, customerName, siteName, viewedAt, totalAmount
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>상대시간 유틸이 시간/일 단위 분기, 열람 고객 API가 email_viewed_at 기반 조회</done>
</task>

<task type="auto">
  <name>Task 2: ViewedCard 컴포넌트 + 대시보드 통합</name>
  <files>components/dashboard/ViewedCard.tsx, app/(authenticated)/dashboard/page.tsx</files>
  <action>
1. `components/dashboard/ViewedCard.tsx` 생성 ('use client'):
   - useState: records, loading
   - useEffect: `/api/dashboard/viewed` GET 호출
   - getDismissed('dismissed_viewed')로 숨긴 ID 필터링
   - 각 카드:
     - 고객명 또는 현장명 (font-medium)
     - 열람 시간: formatRelativeTime(viewedAt) — 24h 이내면 `text-orange-600`, 이후면 `text-gray-500`
     - 총액: fm(totalAmount) + "원" (text-sm text-brand)
     - x 버튼: addDismissed('dismissed_viewed', id) → state에서 제거
     - 카드 클릭 시 `/estimate/${id}`로 이동 (Link)
   - 섹션 제목: "견적서 열람 고객" + 건수 뱃지
   - 빈 상태: "열람 기록이 없습니다"

2. dashboard/page.tsx에서 `{/* 열람 고객 섹션 — Phase 31 */}` 주석을 ViewedCard import + 렌더링으로 교체
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>열람 고객 카드가 대시보드에 표시, 상대 시간 포맷 적용, 숨김/클릭 이동 동작. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /dashboard에 열람 고객 섹션 표시
3. 시간 포맷이 24h 기준으로 분기
4. 카드 클릭 시 견적서 편집 페이지로 이동
</verification>

<success_criteria>
- 추적 픽셀로 기록된 email_viewed_at 기반 열람 고객 표시
- 상대시간이 시간/일 단위로 정확히 분기
- 카드에서 바로 견적서로 이동 가능
</success_criteria>

<output>
After completion, create `.planning/phases/10-dashboard/31-SUMMARY.md`
</output>
