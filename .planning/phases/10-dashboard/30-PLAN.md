---
phase: 10-dashboard
plan: 30
type: execute
wave: 2
depends_on: [29]
files_modified:
  - app/api/dashboard/unsent/route.ts
  - components/dashboard/UnsentCard.tsx
  - app/(authenticated)/dashboard/page.tsx
autonomous: true
requirements: [DASH-02]
must_haves:
  truths:
    - "견적 방문 완료인데 견적서 미작성 건이 카드로 표시된다"
    - "각 카드에 주소, 경과일수(-N일), 담당자 칩이 보인다"
    - "더보기 토글로 전체 목록을 확장/축소할 수 있다"
    - "x 버튼으로 카드를 UI에서 숨길 수 있다"
  artifacts:
    - path: "app/api/dashboard/unsent/route.ts"
      provides: "미발송 건 API"
      exports: ["GET"]
    - path: "components/dashboard/UnsentCard.tsx"
      provides: "미발송 섹션 컴포넌트"
  key_links:
    - from: "components/dashboard/UnsentCard.tsx"
      to: "/api/dashboard/unsent"
      via: "fetch GET on mount"
      pattern: "fetch.*api/dashboard/unsent"
    - from: "components/dashboard/UnsentCard.tsx"
      to: "lib/utils/dismissed.ts"
      via: "dismissed_unsent key"
      pattern: "getDismissed.*dismissed_unsent"
---

<objective>
미발송 카드 섹션 — Notion CRM에서 파이프라인="견적 방문 완료"이고 견적서발송일이 null인 건을 조회하여 대시보드에 표시.

Purpose: 견적 방문했지만 견적서를 아직 보내지 않은 고객을 한눈에 파악.
Output: 미발송 API + UnsentCard 컴포넌트 + 대시보드 통합
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@lib/notion/client.ts
@lib/notion/crm.ts
@lib/utils/dismissed.ts
@components/dashboard/CsStatusSection.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: 미발송 API + UnsentCard 컴포넌트</name>
  <files>app/api/dashboard/unsent/route.ts, components/dashboard/UnsentCard.tsx</files>
  <action>
1. `app/api/dashboard/unsent/route.ts` 생성:
   - GET: Notion CRM에서 파이프라인="견적 방문 완료" 건 조회 (queryCrmByPipeline 재사용 또는 커스텀 필터)
   - 추가 필터: "견적서발송일" 속성이 비어있는(null) 건만 반환
   - 각 레코드에 경과일수 계산: `Math.floor((Date.now() - new Date(inquiryDate).getTime()) / 86400000)` (문의일자 기준)
   - 반환: `{ records: UnsentRecord[] }` — id, name, address, daysSince, manager, phone

2. `components/dashboard/UnsentCard.tsx` 생성 ('use client'):
   - useState: records, loading, expanded (더보기 토글)
   - useEffect: `/api/dashboard/unsent` GET 호출
   - getDismissed('dismissed_unsent')로 숨긴 ID 필터링
   - 기본 3건 표시, expanded=true 시 전체 표시
   - 각 카드:
     - 주소 (text-sm font-medium)
     - 경과일수: 빨간색 "-N일" 칩 (`bg-red-50 text-red-600 text-xs`)
     - 담당자: 파란색 칩 (`bg-blue-50 text-blue-600 text-xs`)
     - x 버튼: 우측 상단, addDismissed('dismissed_unsent', id) → state에서 제거
   - "더보기" / "접기" 버튼: 3건 초과 시만 표시
   - 섹션 제목: "미발송" + 건수 뱃지
   - 빈 상태: "미발송 건이 없습니다"
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>미발송 API가 견적 방문 완료 + 미발송 건을 반환하고, UnsentCard가 카드 리스트/더보기/숨김 기능 제공</done>
</task>

<task type="auto">
  <name>Task 2: 대시보드에 미발송 섹션 통합</name>
  <files>app/(authenticated)/dashboard/page.tsx</files>
  <action>
1. dashboard/page.tsx에서 `{/* 미발송 섹션 — Phase 30 */}` 주석을 UnsentCard import + 렌더링으로 교체
2. CsStatusSection과 UnsentCard 사이에 `<div className="mt-6" />` 간격
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>대시보드에 CS현황 + 미발송 두 섹션이 순서대로 표시. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /dashboard에 미발송 카드 섹션 표시
3. 경과일수가 빨간 칩으로 표시
4. 더보기/접기 토글 동작
5. x 버튼으로 숨김 가능
</verification>

<success_criteria>
- 미발송 건이 경과일수와 함께 카드로 표시됨
- 더보기 토글로 3건 이상 확장 가능
- 숨김 기능이 localStorage 기반으로 동작
</success_criteria>

<output>
After completion, create `.planning/phases/10-dashboard/30-SUMMARY.md`
</output>
