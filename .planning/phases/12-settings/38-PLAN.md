---
phase: 12-settings
plan: 38
type: execute
wave: 2
depends_on: [37]
files_modified:
  - components/settings/BaseItemsEditor.tsx
  - components/settings/PresetsEditor.tsx
  - components/settings/CostEditor.tsx
  - app/api/settings/presets/route.ts
  - app/api/settings/cost-config/route.ts
  - app/(authenticated)/settings/page.tsx
autonomous: true
requirements: [SET-03, SET-04, SET-05]
must_haves:
  truths:
    - "기본공종 탭에서 복합/우레탄 BASE 배열을 조회/편집할 수 있다"
    - "프리셋 탭에서 프리셋 공종을 추가/수정/삭제할 수 있다"
    - "원가 탭에서 면적대별 원가 데이터를 편집할 수 있다"
  artifacts:
    - path: "components/settings/BaseItemsEditor.tsx"
      provides: "기본공종 편집 컴포넌트"
    - path: "components/settings/PresetsEditor.tsx"
      provides: "프리셋 편집 컴포넌트"
    - path: "components/settings/CostEditor.tsx"
      provides: "원가 편집 컴포넌트"
    - path: "app/api/settings/presets/route.ts"
      provides: "프리셋 CRUD API"
    - path: "app/api/settings/cost-config/route.ts"
      provides: "원가 설정 API"
  key_links:
    - from: "components/settings/PresetsEditor.tsx"
      to: "/api/settings/presets"
      via: "fetch GET/POST/PATCH/DELETE"
      pattern: "fetch.*api/settings/presets"
    - from: "components/settings/CostEditor.tsx"
      to: "/api/settings/cost-config"
      via: "fetch GET/PUT"
      pattern: "fetch.*api/settings/cost-config"
---

<objective>
기본공종/프리셋/원가 편집 UI — 설정 페이지의 3개 탭 구현.

Purpose: 견적서 생성에 사용되는 기본 데이터(기본공종, 프리셋, 원가)를 관리자가 직접 편집.
Output: BaseItemsEditor + PresetsEditor + CostEditor + API 라우트
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
@components/settings/SettingsTabs.tsx
@components/settings/PriceMatrixEditor.tsx
</context>

<interfaces>
From lib/estimate/types.ts:
```typescript
export interface BaseItem {
  name: string; spec: string; unit: string;
  isArea?: boolean; isWall?: boolean; isBase?: boolean;
  isEquipment?: boolean; isFixedQty?: boolean;
}
```

From lib/estimate/constants.ts:
```typescript
export const COMPLEX_BASE: BaseItem[]    // 11 items
export const URETHANE_BASE: BaseItem[]   // 10 items
export const COST_BREAKPOINTS: CostBreakpoint[]
export const LABOR_COST_PER_PUM: number  // 220000
export const MATERIAL_INCREASE_RATE: number  // 0.20
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: BaseItemsEditor + PresetsEditor + API</name>
  <files>components/settings/BaseItemsEditor.tsx, components/settings/PresetsEditor.tsx, app/api/settings/presets/route.ts</files>
  <action>
1. `components/settings/BaseItemsEditor.tsx` 생성 ('use client'):
   - 복합/우레탄 토글로 BASE 배열 선택
   - 테이블: #, 공종명, 규격, 단위, 면적연동, 벽체연동, 장비, 고정수량
   - 각 행의 공종명/규격/단위: 인라인 편집 (클릭 → input)
   - boolean 필드: 체크박스
   - 행 추가 버튼: 하단에 빈 행 추가 → 공종명 입력
   - 행 삭제: x 버튼 (confirm 후)
   - 순서 변경: 위/아래 화살표 버튼 (sort_order swap)
   - 저장: 현재 배열을 API로 전송 (PUT `/api/settings/base-items`)
   - **주의**: COMPLEX_BASE/URETHANE_BASE는 현재 constants.ts에 하드코딩.
     이 편집기는 DB에 저장하거나 별도 설정 파일로 관리 필요.
     간단한 접근: cost_config 테이블의 config JSONB에 base_items 키로 저장.
     API: GET/PUT `/api/settings/cost-config?section=base_items`

2. `app/api/settings/presets/route.ts` 생성:
   - 서비스 역할 클라이언트 사용 (RLS bypass, P매트릭스와 동일 패턴)
   - GET: presets 테이블 전체 조회 (company_id 필터)
     - `supabase.from('presets').select('*').order('category').order('name')`
   - POST: body에서 `{ name, spec, unit, mat, labor, exp, category }` → insert
   - PATCH: `presets/[id]` 대신 body에 id 포함 → update
   - DELETE: body에서 `{ id }` → delete

3. `components/settings/PresetsEditor.tsx` 생성 ('use client'):
   - useState: presets, loading, editingId
   - useEffect: GET `/api/settings/presets` → presets 세팅
   - 테이블: 이름, 규격, 단위, 재료비, 노무비, 경비, 카테고리, 사용횟수, 액션
   - 각 셀: 인라인 편집 (editingId === preset.id 시)
   - 행 편집 모드: 행 클릭 → editingId → 셀들 input으로 전환 → "저장"/"취소" 버튼
   - 추가 버튼: 상단 또는 하단에 "프리셋 추가" → 빈 행 추가 → 입력 → POST
   - 삭제: 행 우측 x 버튼 → confirm → DELETE
   - 카테고리 필터: 상단 칩 (전체, custom, 등)
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>기본공종 편집기(순서변경/추가/삭제), 프리셋 CRUD API + 편집기 완성</done>
</task>

<task type="auto">
  <name>Task 2: CostEditor + 설정 페이지 탭 연결</name>
  <files>components/settings/CostEditor.tsx, app/api/settings/cost-config/route.ts, app/(authenticated)/settings/page.tsx</files>
  <action>
1. `app/api/settings/cost-config/route.ts` 생성:
   - 서비스 역할 클라이언트 (RLS bypass)
   - GET: cost_config 테이블에서 company_id 기준 조회 → config JSONB 반환
   - PUT: body에서 config 받아 upsert (company_id unique)
   - config JSONB 구조:
     ```json
     {
       "cost_breakpoints": [...],
       "labor_cost_per_pum": 220000,
       "material_increase_rate": 0.20,
       "base_items": { "complex": [...], "urethane": [...] }
     }
     ```

2. `components/settings/CostEditor.tsx` 생성 ('use client'):
   - 원가 데이터 표시/편집:
     - 1품 단가 (LABOR_COST_PER_PUM): 숫자 input (현재 220,000원)
     - 재료비 인상률 (MATERIAL_INCREASE_RATE): 숫자 input (현재 20%)
     - 면적대별 원가 테이블 (COST_BREAKPOINTS):
       - 열: 면적(평), 하도, 중도1.5mm, 상도, 시트, 경비잡비, 품수
       - 각 셀 인라인 편집
       - 행 추가/삭제 가능
   - 저장 버튼: PUT `/api/settings/cost-config` → 성공 시 "저장됨" 피드백

3. `app/(authenticated)/settings/page.tsx` 수정:
   - 기존 placeholder들을 실제 컴포넌트로 교체:
     - '기본공종': BaseItemsEditor
     - '프리셋': PresetsEditor
     - '원가': CostEditor
   - import 추가
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>원가 편집기 + 설정 페이지 4개 탭(단가표/기본공종/프리셋/원가) 동작. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /settings → "기본공종" 탭: 공종 테이블 표시, 순서 변경, 추가/삭제
3. /settings → "프리셋" 탭: 프리셋 목록, 추가/편집/삭제
4. /settings → "원가" 탭: 원가 데이터 표시, 인라인 편집, 저장
</verification>

<success_criteria>
- 기본공종 편집으로 BASE 배열 커스터마이즈 가능
- 프리셋 CRUD 완전 동작
- 원가 데이터 편집으로 마진 계산 기초 조정 가능
</success_criteria>

<output>
After completion, create `.planning/phases/12-settings/38-SUMMARY.md`
</output>
