---
phase: 10-dashboard
plan: 29
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/notion/client.ts
  - lib/notion/crm.ts
  - lib/utils/dismissed.ts
  - app/api/crm/cs-status/route.ts
  - components/dashboard/CsStatusSection.tsx
  - app/(authenticated)/dashboard/page.tsx
autonomous: true
requirements: [DASH-01]
must_haves:
  truths:
    - "대시보드에 '정보 입력 완료' 파이프라인 고객이 카드로 표시된다"
    - "각 카드에 주소/고객명/전화번호/문의채널/문의일자가 보인다"
    - "연락완료 버튼 클릭 시 카드가 UI에서 사라진다 (새로고침 후에도)"
    - "파이프라인 드롭다운으로 Notion 파이프라인을 변경할 수 있다"
  artifacts:
    - path: "lib/notion/client.ts"
      provides: "Notion API 클라이언트"
    - path: "app/api/crm/cs-status/route.ts"
      provides: "CS 현황 API"
      exports: ["GET", "PATCH"]
    - path: "components/dashboard/CsStatusSection.tsx"
      provides: "CS 현황 카드 리스트 컴포넌트"
  key_links:
    - from: "components/dashboard/CsStatusSection.tsx"
      to: "/api/crm/cs-status"
      via: "fetch GET on mount"
      pattern: "fetch.*api/crm/cs-status"
    - from: "components/dashboard/CsStatusSection.tsx"
      to: "localStorage"
      via: "dismissed_cs key"
      pattern: "localStorage.*dismissed_cs"
---

<objective>
CS 현황 섹션 구현 — Notion CRM에서 파이프라인="정보 입력 완료" 건을 조회하여 대시보드에 카드 리스트로 표시한다.
각 카드에서 "연락완료" 시 UI 숨김(localStorage), 파이프라인 변경 시 Notion API 호출.

Purpose: 대시보드 첫 섹션. Notion CRM 연동 기반을 이 plan에서 구축하여 이후 dashboard 섹션들이 재사용.
Output: Notion 클라이언트 + CS현황 API + 대시보드 페이지 쉘 + CsStatusSection 컴포넌트
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@lib/supabase/server.ts
@lib/supabase/client.ts
@components/layout/Header.tsx
@app/(authenticated)/estimates/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Notion CRM 클라이언트 + CS현황 API + dismissed 유틸</name>
  <files>lib/notion/client.ts, lib/notion/crm.ts, lib/utils/dismissed.ts, app/api/crm/cs-status/route.ts</files>
  <action>
1. `npm install @notionhq/client` 설치.

2. `lib/notion/client.ts` 생성:
   - `@notionhq/client`의 Client를 사용하여 Notion API 클라이언트 생성
   - CRM용: `process.env.NOTION_CRM_TOKEN` 사용
   - 캘린더용: `process.env.NOTION_CALENDAR_TOKEN` 사용
   - `export function getNotionCrmClient()` — CRM 토큰 클라이언트 반환
   - `export function getNotionCalendarClient()` — 캘린더 토큰 클라이언트 반환

3. `lib/notion/crm.ts` 생성:
   - `export async function queryCrmByPipeline(pipeline: string): Promise<CrmRecord[]>` — Notion DB 쿼리, 해당 파이프라인 필터
   - `export async function updateCrmPipeline(pageId: string, newPipeline: string): Promise<void>` — 페이지 속성 업데이트
   - CrmRecord 타입: `{ id: string; name: string; address: string; phone: string; channel: string; inquiryDate: string | null; pipeline: string }`
   - NOTION_CRM_DB_ID: `process.env.NOTION_CRM_DB_ID`
   - Notion DB 속성 매핑 (Phase 23 CRM과 동일 패턴 예상):
     - "이름" → name (title)
     - "주소" → address (rich_text)
     - "전화번호" → phone (phone_number)
     - "문의채널" → channel (select)
     - "문의일자" → inquiryDate (date)
     - "파이프라인" → pipeline (select)
   - 속성명이 다를 수 있으므로 Notion API 응답에서 실제 속성키를 사용 (한글 속성명 그대로)

4. `lib/utils/dismissed.ts` 생성:
   - `export function getDismissed(key: string): string[]` — localStorage에서 dismissed ID 배열 반환 (JSON.parse, 없으면 [])
   - `export function addDismissed(key: string, id: string): void` — 배열에 추가 후 localStorage 저장
   - `export function removeDismissed(key: string, id: string): void` — 배열에서 제거
   - SSR에서 호출 시 빈 배열 반환 (typeof window === 'undefined' 체크)

5. `app/api/crm/cs-status/route.ts` 생성:
   - GET: `queryCrmByPipeline('정보 입력 완료')` 호출 → JSON 반환
   - PATCH: body에서 `{ pageId, pipeline }` 받아 `updateCrmPipeline` 호출 → 200 반환
   - 에러 처리: try/catch, `{ error: string }` 반환
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Notion CRM 클라이언트, CRM 조회/수정 함수, dismissed 유틸, CS현황 API가 타입 에러 없이 존재</done>
</task>

<task type="auto">
  <name>Task 2: CsStatusSection 컴포넌트 + 대시보드 페이지 쉘</name>
  <files>components/dashboard/CsStatusSection.tsx, app/(authenticated)/dashboard/page.tsx</files>
  <action>
1. `components/dashboard/CsStatusSection.tsx` 생성 ('use client'):
   - useState로 records, loading, error 관리
   - useEffect로 `/api/crm/cs-status` GET 호출 → records 세팅
   - getDismissed('dismissed_cs')로 숨긴 ID 필터링
   - 각 레코드를 카드로 렌더링:
     - 고객명 (font-semibold), 주소 (text-sm text-gray-600)
     - 전화번호 (a href="tel:"), 문의채널 (칩), 문의일자 (text-xs text-gray-400)
   - "연락완료" 버튼: addDismissed('dismissed_cs', id) → records에서 제거 (로컬 state)
   - "파이프라인 변경" 드롭다운 (select):
     - 옵션: '정보 입력 완료', '견적 방문 예정', '견적 방문 완료', '견적서 전송', '계약', '계약 실패', '보류'
     - onChange → PATCH `/api/crm/cs-status` body: { pageId: record.id, pipeline: newValue }
     - 성공 시 해당 카드를 리스트에서 제거 (정보 입력 완료가 아니므로)
   - 빈 상태: "정보 입력 완료 건이 없습니다"
   - 카드 스타일: `rounded-lg border border-gray-200 bg-white p-4`, 호버 시 `shadow-sm`

2. `app/(authenticated)/dashboard/page.tsx` 생성:
   - Header 컴포넌트 import
   - SSR 인증 체크 (estimates/page.tsx 패턴 따름: supabase.auth.getUser, redirect)
   - 레이아웃: `<div className="min-h-screen bg-bg">` + Header + 컨텐츠 영역
   - 컨텐츠: `<div className="mx-auto max-w-4xl px-4 py-6">`
   - 제목: "대시보드"
   - CsStatusSection 렌더링
   - 이후 plan에서 추가될 섹션들의 자리를 주석으로 표시:
     `{/* 미발송 섹션 — Phase 30 */}`
     `{/* 열람 고객 섹션 — Phase 31 */}`
     `{/* 연락해야 할 곳 섹션 — Phase 32 */}`
     `{/* 오늘 일정 + 견적서 불러오기 — Phase 33 */}`
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>대시보드 페이지에 CS현황 카드 리스트 표시, 연락완료 시 숨김, 파이프라인 변경 시 Notion 업데이트. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /dashboard 접속 시 CS 현황 섹션이 표시됨
3. 카드에 고객명/주소/전화번호/문의채널/문의일자 표시
4. "연락완료" 클릭 시 카드 사라짐 (새로고침 후에도 유지)
5. 파이프라인 드롭다운 변경 시 Notion 업데이트
</verification>

<success_criteria>
- Notion CRM 클라이언트가 lib/notion/에 구축됨
- CS 현황 API가 정보 입력 완료 건을 반환
- 대시보드 페이지 쉘이 구축되어 이후 섹션 추가 가능
- dismissed 유틸이 모든 대시보드 카드에서 재사용 가능
</success_criteria>

<output>
After completion, create `.planning/phases/10-dashboard/29-SUMMARY.md`
</output>
