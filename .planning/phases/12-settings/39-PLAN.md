---
phase: 12-settings
plan: 39
type: execute
wave: 3
depends_on: [37, 38]
files_modified:
  - components/settings/CalcRulesEditor.tsx
  - components/settings/EquipmentEditor.tsx
  - components/settings/WarrantyEditor.tsx
  - components/settings/SettingsSummary.tsx
  - app/(authenticated)/settings/page.tsx
  - e2e/settings.spec.ts
autonomous: true
requirements: [SET-06, SET-07, SET-08, SET-09]
must_haves:
  truths:
    - "계산규칙 탭에서 공과잡비/기업이윤/절사 단위를 편집할 수 있다"
    - "장비단가 탭에서 사다리차/스카이차/폐기물 기본 단가를 편집할 수 있다"
    - "보증 탭에서 기본 하자보수년수/이행증권년수를 편집할 수 있다"
    - "현재 적용 요약 섹션에서 모든 규칙이 한눈에 표시된다"
  artifacts:
    - path: "components/settings/CalcRulesEditor.tsx"
      provides: "계산규칙 편집 컴포넌트"
    - path: "components/settings/EquipmentEditor.tsx"
      provides: "장비단가 편집 컴포넌트"
    - path: "components/settings/WarrantyEditor.tsx"
      provides: "보증 편집 컴포넌트"
    - path: "components/settings/SettingsSummary.tsx"
      provides: "현재 적용 요약 컴포넌트"
    - path: "e2e/settings.spec.ts"
      provides: "설정 E2E 테스트"
  key_links:
    - from: "components/settings/CalcRulesEditor.tsx"
      to: "/api/settings/cost-config"
      via: "fetch GET/PUT (config.calc_rules)"
      pattern: "fetch.*api/settings/cost-config"
    - from: "components/settings/EquipmentEditor.tsx"
      to: "/api/settings/cost-config"
      via: "fetch GET/PUT (config.equipment_prices)"
      pattern: "fetch.*api/settings/cost-config"
---

<objective>
계산규칙 + 장비단가 + 보증 편집 + 현재 적용 요약 + E2E 테스트.

Purpose: 설정 페이지의 나머지 3개 탭 완성 + 전체 규칙 요약 뷰 + 테스트.
Output: CalcRulesEditor + EquipmentEditor + WarrantyEditor + SettingsSummary + E2E
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@lib/estimate/constants.ts
@components/settings/SettingsTabs.tsx
@app/api/settings/cost-config/route.ts
</context>

<interfaces>
From lib/estimate/constants.ts:
```typescript
export const OVERHEAD_RATE = 0.03       // 공과잡비 3%
export const PROFIT_RATE = 0.06         // 기업이윤 6%
export const ROUND_UNIT = 100000        // 절사 10만원
export const DEFAULT_EQUIPMENT_PRICES = {
  ladder: 120000,   // 사다리차 1일
  sky: 350000,      // 스카이차 1일
  waste: 200000,    // 폐기물 1일
}
```

cost_config JSONB 구조 (Phase 38에서 구축):
```json
{
  "cost_breakpoints": [...],
  "labor_cost_per_pum": 220000,
  "material_increase_rate": 0.20,
  "base_items": { "complex": [...], "urethane": [...] },
  "calc_rules": { "overhead_rate": 0.03, "profit_rate": 0.06, "round_unit": 100000 },
  "equipment_prices": { "ladder": 120000, "sky": 350000, "waste": 200000 },
  "warranty": { "years": 5, "bond_years": 3 }
}
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: CalcRulesEditor + EquipmentEditor + WarrantyEditor</name>
  <files>components/settings/CalcRulesEditor.tsx, components/settings/EquipmentEditor.tsx, components/settings/WarrantyEditor.tsx</files>
  <action>
1. `components/settings/CalcRulesEditor.tsx` 생성 ('use client'):
   - useState: overheadRate, profitRate, roundUnit, loading, saving
   - useEffect: GET `/api/settings/cost-config` → config.calc_rules에서 값 추출 (없으면 기본값 사용)
   - 필드:
     - 공과잡비 (%): number input, step 0.01, min 0, max 0.5
       - 현재값 표시: "3%" + 설명 "소계의 N%를 공과잡비로 추가"
     - 기업이윤 (%): number input, step 0.01, min 0, max 0.5
       - 현재값 표시: "6%" + 설명 "(소계+공과잡비)의 N%를 기업이윤으로 추가"
     - 절사 단위: select [10000, 50000, 100000, 500000, 1000000]
       - 현재값 표시: "10만원 단위" + 설명 "합계를 N원 단위로 내림 절사"
   - 저장 버튼: PUT `/api/settings/cost-config` body: config 업데이트
   - 미리보기: 예시 소계 1,000,000원 기준 → 공과잡비 30,000 + 이윤 61,800 = 1,091,800 → 절사 1,000,000
   - 각 input은 label + 현재값 + 설명이 함께 표시되는 카드 스타일

2. `components/settings/EquipmentEditor.tsx` 생성 ('use client'):
   - useState: prices (ladder, sky, waste), loading, saving
   - useEffect: GET → config.equipment_prices에서 추출
   - 3개 카드:
     - 사다리차: 이름 + 단위("일당") + 단가 input (fm 포맷)
     - 스카이차: 이름 + 단위("일당") + 단가 input
     - 폐기물처리: 이름 + 단위("식") + 단가 input
   - 저장 버튼: config.equipment_prices 업데이트
   - 각 카드: rounded-lg border p-4, 아이콘(트럭/크레인/쓰레기통) 또는 이모지 없이 텍스트만

3. `components/settings/WarrantyEditor.tsx` 생성 ('use client'):
   - useState: years, bondYears, loading, saving
   - useEffect: GET → config.warranty에서 추출
   - 필드:
     - 하자보수년수: number input (기본 5년)
       - 설명: "견적서 하단에 표시되는 기본 하자보수 기간"
     - 이행증권년수: number input (기본 3년)
       - 설명: "이행보증보험 증권 기간"
   - 저장 버튼
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>계산규칙/장비단가/보증 3개 편집기 컴포넌트 완성</done>
</task>

<task type="auto">
  <name>Task 2: SettingsSummary + 설정 페이지 통합 + E2E</name>
  <files>components/settings/SettingsSummary.tsx, app/(authenticated)/settings/page.tsx, e2e/settings.spec.ts</files>
  <action>
1. `components/settings/SettingsSummary.tsx` 생성 ('use client'):
   - useEffect: GET `/api/settings/cost-config` → 전체 config 로드
   - 요약 카드 레이아웃 (grid cols-2 md:cols-3 gap-4):
     - 계산규칙: 공과잡비 N%, 기업이윤 N%, 절사 N만원
     - 장비단가: 사다리차 N원/일, 스카이차 N원/일, 폐기물 N원/식
     - 보증: 하자보수 N년, 이행증권 N년
     - 원가: 1품 N원, 재료비 인상 N%
     - 기본공종: 복합 N개, 우레탄 N개
     - 프리셋: N개 등록
   - 각 카드: bg-gray-50 rounded-lg p-3, 제목(font-medium) + 값 리스트(text-sm text-gray-600)
   - 이 컴포넌트는 모든 탭 상단에 표시하거나 별도 "요약" 탭으로 — 간단하게 각 탭 편집기 상단에 해당 카테고리 요약만 표시하는 방식 채택
   - 또는: 설정 페이지 상단에 항상 표시되는 축약 요약 바

2. `app/(authenticated)/settings/page.tsx` 최종 통합:
   - 나머지 placeholder를 실제 컴포넌트로 교체:
     - '계산규칙': CalcRulesEditor
     - '장비단가': EquipmentEditor
     - '보증': WarrantyEditor
   - 상단에 SettingsSummary 바 (축약): "공과잡비 3% | 기업이윤 6% | 절사 10만원 | 사다리차 12만원/일" 한 줄
   - 모든 탭이 연결된 완성 설정 페이지

3. `e2e/settings.spec.ts` 생성:
   - "설정 페이지 로드": /settings 접속 → 탭 바 표시, 기본 "단가표" 탭
   - "탭 전환": 각 탭 클릭 → 해당 편집기 표시 (7개 탭 순회)
   - "요약 바 표시": 상단 요약 바에 공과잡비/기업이윤/절사 값 존재
   - "계산규칙 편집": 계산규칙 탭 → 공과잡비 input 존재, 저장 버튼 존재
   - TEST_MODE=true 필요
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>설정 페이지 7개 탭 완성 + 요약 바 + E2E 테스트. npm run build 통과.</done>
</task>

</tasks>

<verification>
1. npm run build 통과
2. /settings → 7개 탭 모두 동작
3. 계산규칙: 공과잡비/기업이윤/절사 편집 + 미리보기
4. 장비단가: 3종 단가 편집
5. 보증: 년수 편집
6. 상단 요약 바에 현재 값 표시
</verification>

<success_criteria>
- 설정 페이지 7개 탭이 모두 완성
- 모든 견적서 계산 관련 변수를 UI에서 조정 가능
- 현재 적용 규칙이 요약으로 한눈에 파악 가능
- GAS 규칙서 편집 기능 재현 완료
</success_criteria>

<output>
After completion, create `.planning/phases/12-settings/39-SUMMARY.md`
</output>
