---
phase: 10-dashboard
plan: 32
type: execute
wave: 2
depends_on: [29]
files_modified:
  - app/api/dashboard/follow-up/route.ts
  - components/dashboard/FollowUpCard.tsx
  - app/(authenticated)/dashboard/page.tsx
autonomous: true
requirements: [DASH-04]
must_haves:
  truths:
    - "발송 후 성공확률 미배정 건이 카드로 표시된다"
    - "각 카드에 주소, 경과일수, 견적금액, 담당자가 보인다"
    - "x 버튼으로 카드를 숨길 수 있다"
    - "더보기 토글로 전체 목록을 확장/축소할 수 있다"
  artifacts:
    - path: "app/api/dashboard/follow-up/route.ts"
      provides: "연락해야 할 곳 API"
      exports: ["GET"]
    - path: "components/dashboard/FollowUpCard.tsx"
      provides: "연락해야 할 곳 카드 컴포넌트"
  key_links:
    - from: "components/dashboard/FollowUpCard.tsx"
      to: "/api/dashboard/follow-up"
      via: "fetch GET on mount"
      pattern: "fetch.*api/dashboard/follow-up"
---

<objective>
연락해야 할 곳 카드 — Notion CRM에서 파이프라인="견적서 전송"이고 성공확률이 미배정인 건을 조회하여 표시.

Purpose: 견적서를 보냈지만 아직 성공/실패를 판단하지 않은 건을 팔로업 대상으로 표시.
Output: 연락해야 할 곳 API + FollowUpCard 컴포넌트
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: 연락해야 할 곳 API + FollowUpCard 컴포넌트</name>
  <files>app/api/dashboard/follow-up/route.ts, components/dashboard/FollowUpCard.tsx</files>
  <action>
1. `lib/notion/crm.ts`에 함수 추가 (또는 기존 queryCrmByPipeline 확장):
   - 파이프라인="견적서 전송" AND 성공확률 속성이 비어있는 건 조회
   - 성공확률 속성명: "성공확률↑" 또는 "성공확률" (Notion DB 실제 속성명 확인 필요 — select 타입으로 추정)
   - 추가 필드: estimateAmount (견적금액), manager (담당자)

2. `app/api/dashboard/follow-up/route.ts` 생성:
   - GET: Notion CRM 쿼리 — 파이프라인="견적서 전송", 성공확률 is_empty
   - 경과일수 계산: 견적서발송일 기준 (없으면 문의일자 기준)
   - 반환: `{ records: FollowUpRecord[] }` — id, name, address, daysSince, estimateAmount, manager

3. `components/dashboard/FollowUpCard.tsx` 생성 ('use client'):
   - CsStatusSection/UnsentCard와 동일한 패턴:
     - useState: records, loading, expanded
     - useEffect: `/api/dashboard/follow-up` GET 호출
     - getDismissed('dismissed_followup')로 필터링
   - 각 카드:
     - 주소 (font-medium)
     - 경과일수: `-N일` 칩 (7일 이상이면 빨간색, 아니면 주황색)
     - 견적금액: fm(estimateAmount) + "원" (text-brand)
     - 담당자 칩 (bg-blue-50 text-blue-600)
     - x 버튼: addDismissed('dismissed_followup', id) → state 제거
   - 기본 3건 + "더보기" / "접기" 토글
   - 섹션 제목: "연락해야 할 곳" + 건수 뱃지
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>연락해야 할 곳 API가 미배정 건 반환, FollowUpCard가 카드 리스트 + 더보기 + 숨김 제공</done>
</task>

<task type="auto">
  <name>Task 2: 대시보드에 연락해야 할 곳 섹션 통합</name>
  <files>app/(authenticated)/dashboard/page.tsx</files>
  <action>
1. dashboard/page.tsx에서 `{/* 연락해야 할 곳 섹션 — Phase 32 */}` 주석을 FollowUpCard import + 렌더링으로 교체
2. ViewedCard와 FollowUpCard 사이에 mt-6 간격
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>대시보드에 CS현황 + 미발송 + 열람고객 + 연락해야 할 곳 네 섹션 표시. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /dashboard에 연락해야 할 곳 섹션 표시
3. 경과일수 + 견적금액 + 담당자 표시
4. 더보기/숨김 동작
</verification>

<success_criteria>
- 견적서 전송 후 성공확률 미배정 건이 표시됨
- 경과일수가 색상으로 긴급도 표현
- 견적금액이 표시되어 중요도 판단 가능
</success_criteria>

<output>
After completion, create `.planning/phases/10-dashboard/32-SUMMARY.md`
</output>
