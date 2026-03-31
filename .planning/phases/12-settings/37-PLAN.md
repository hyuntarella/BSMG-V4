---
phase: 12-settings
plan: 37
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(authenticated)/settings/page.tsx
  - components/settings/SettingsTabs.tsx
  - components/settings/PriceMatrixEditor.tsx
  - app/api/settings/price-matrix/route.ts
autonomous: true
requirements: [SET-01, SET-02]
must_haves:
  truths:
    - "설정 페이지에 탭 기반 네비게이션이 있다"
    - "P매트릭스 탭에서 면적대/공법 선택 시 평단가별 단가 테이블이 표시된다"
    - "단가 셀을 클릭하여 인라인 편집 가능하다"
    - "편집 후 저장 시 Supabase price_matrix에 반영된다"
  artifacts:
    - path: "app/(authenticated)/settings/page.tsx"
      provides: "설정 페이지 쉘 + 탭 라우팅"
    - path: "components/settings/PriceMatrixEditor.tsx"
      provides: "P매트릭스 뷰어/편집 컴포넌트"
    - path: "app/api/settings/price-matrix/route.ts"
      provides: "P매트릭스 CRUD API"
      exports: ["GET", "PUT"]
  key_links:
    - from: "components/settings/PriceMatrixEditor.tsx"
      to: "/api/settings/price-matrix"
      via: "fetch GET + PUT"
      pattern: "fetch.*api/settings/price-matrix"
    - from: "app/api/settings/price-matrix/route.ts"
      to: "Supabase price_matrix"
      via: "service role client (RLS bypass)"
      pattern: "SUPABASE_SERVICE_ROLE_KEY"
---

<objective>
P매트릭스 뷰어 + 인라인 편집 — 설정 페이지 기반 구축 + P매트릭스 탭 구현.

Purpose: P매트릭스(면적대 x 공법 x 평단가 → 공종별 단가)를 시각적으로 조회/편집 가능하게.
Output: 설정 페이지 탭 쉘 + P매트릭스 편집기 + API
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@lib/estimate/types.ts
@lib/estimate/constants.ts
@lib/estimate/priceData.ts
@app/(authenticated)/settings/page.tsx
</context>

<interfaces>
From lib/estimate/types.ts:
```typescript
export type AreaRange = '20평이하' | '50평미만' | '50~100평' | '100~200평' | '200평이상'
export type Method = '복합' | '우레탄'
export type UnitCost = [mat: number, labor: number, exp: number]
export interface PriceMatrixRow {
  id?: string; company_id: string; area_range: string; method: string;
  price_per_pyeong: number; item_index: number; mat: number; labor: number; exp: number;
}
```

From lib/estimate/constants.ts:
```typescript
export const COMPLEX_BASE: BaseItem[]   // 11 items
export const URETHANE_BASE: BaseItem[]  // 10 items
export const AREA_BOUNDARIES: { max: number; label: AreaRange }[]
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: 설정 페이지 탭 쉘 + P매트릭스 API</name>
  <files>app/(authenticated)/settings/page.tsx, components/settings/SettingsTabs.tsx, app/api/settings/price-matrix/route.ts</files>
  <action>
1. `components/settings/SettingsTabs.tsx` 생성 ('use client'):
   - Props: `{ activeTab: string; onTabChange: (tab: string) => void }`
   - 탭 목록: ['단가표', '기본공종', '프리셋', '원가', '계산규칙', '장비단가', '보증']
   - 가로 스크롤 탭 바 (overflow-x-auto whitespace-nowrap)
   - 각 탭: 선택 시 bg-brand text-white, 미선택 시 bg-gray-100 text-gray-600
   - 탭 버튼: rounded-full px-4 py-1.5 text-sm font-medium

2. `app/(authenticated)/settings/page.tsx` 재작성:
   - 'use client' (탭 상태 관리)
   - Header import
   - useState: activeTab (기본 '단가표')
   - SettingsTabs + 탭별 조건부 렌더링:
     - '단가표': PriceMatrixEditor (이 task에서 구현)
     - '기본공종': placeholder "Phase 38에서 구현"
     - '프리셋': placeholder
     - '원가': placeholder
     - '계산규칙': placeholder "Phase 39에서 구현"
     - '장비단가': placeholder
     - '보증': placeholder

3. `app/api/settings/price-matrix/route.ts` 생성:
   - 서비스 역할 클라이언트 사용 (RLS bypass):
     ```typescript
     import { createClient } from '@supabase/supabase-js'
     const supabase = createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE_KEY!
     )
     ```
   - GET: query params에서 area_range, method 받아 price_matrix 조회
     - `supabase.from('price_matrix').select('*').eq('area_range', area_range).eq('method', method).order('price_per_pyeong').order('item_index')`
     - 반환: `{ rows: PriceMatrixRow[] }`
   - PUT: body에서 `{ rows: PriceMatrixRow[] }` 받아 upsert
     - `supabase.from('price_matrix').upsert(rows, { onConflict: 'company_id,area_range,method,price_per_pyeong,item_index' })`
     - 반환: 200
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>설정 페이지 탭 쉘 + P매트릭스 API (서비스 역할 RLS bypass) 완성</done>
</task>

<task type="auto">
  <name>Task 2: PriceMatrixEditor 컴포넌트</name>
  <files>components/settings/PriceMatrixEditor.tsx</files>
  <action>
1. `components/settings/PriceMatrixEditor.tsx` 생성 ('use client'):
   - useState:
     - areaRange: AreaRange (기본 '50~100평')
     - method: Method (기본 '복합')
     - rows: PriceMatrixRow[] (API에서 로드)
     - loading, saving, editingCell (row+col 식별)
   - 면적대 드롭다운: AREA_BOUNDARIES에서 label 목록
   - 공법 드롭다운: ['복합', '우레탄']
   - useEffect: areaRange 또는 method 변경 시 `/api/settings/price-matrix?area_range=${areaRange}&method=${method}` GET → rows 세팅

   - 테이블 렌더링:
     - 헤더: 평단가 값들을 열 그룹으로, 각 평단가 아래에 재료/노무/경비 3열
     - 행: 공종명 (COMPLEX_BASE 또는 URETHANE_BASE의 item_index 순서)
       - method === '복합'이면 COMPLEX_BASE[item_index].name
       - method === '우레탄'이면 URETHANE_BASE[item_index].name
     - 셀: mat/labor/exp 값 표시 (fm() 포맷)

   - 인라인 편집:
     - 셀 클릭 → editingCell 세팅 → input으로 변환 (type="number")
     - blur 또는 Enter → editingCell null → rows 배열 업데이트
     - 편집된 셀은 bg-yellow-50으로 하이라이트

   - 저장 버튼: PUT `/api/settings/price-matrix` body: { rows } → 성공 시 "저장됨" 토스트
   - 레이아웃: overflow-x-auto로 넓은 테이블 가로 스크롤
   - 빈 데이터: "해당 면적대/공법의 단가 데이터가 없습니다"
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>P매트릭스 편집기가 면적대/공법별 단가 테이블 표시, 인라인 편집, 저장 동작. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /settings 접속 시 탭 바 표시, 기본 "단가표" 탭 활성
3. 면적대/공법 드롭다운 변경 시 테이블 갱신
4. 셀 클릭 → 인라인 편집 → 저장 → DB 반영
</verification>

<success_criteria>
- 설정 페이지 탭 기반 구조 구축
- P매트릭스를 시각적으로 조회/편집 가능
- 서비스 역할 키로 RLS 우회하여 price_matrix 접근
</success_criteria>

<output>
After completion, create `.planning/phases/12-settings/37-SUMMARY.md`
</output>
