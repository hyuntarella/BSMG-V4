---
phase: 08-manual-edit
plan: 22
type: execute
wave: 2
depends_on: [15]
files_modified:
  - components/estimate/AddItemModal.tsx
autonomous: true
requirements: [EDIT-22]

must_haves:
  truths:
    - "AddItemModal에 '장비' 탭이 존재한다"
    - "사다리차, 스카이차, 폐기물 3개 장비 프리셋이 표시된다"
    - "장비 선택 시 is_equipment=true, is_fixed_qty=true로 추가된다"
    - "장비의 qty는 일수 입력이고, 기본 단가는 DEFAULT_EQUIPMENT_PRICES에서 적용된다"
  artifacts:
    - path: "components/estimate/AddItemModal.tsx"
      provides: "장비 탭 + 사다리차/스카이차/폐기물 프리셋"
  key_links:
    - from: "components/estimate/AddItemModal.tsx"
      to: "lib/estimate/constants.ts"
      via: "import DEFAULT_EQUIPMENT_PRICES"
---

<objective>
장비 아이템 추가 — AddItemModal에 장비 탭 추가

Purpose: 사다리차, 스카이차, 폐기물 등 장비 아이템을 수동으로 추가할 수 있어야 한다. 장비는 is_equipment=true, is_fixed_qty=true이고 qty는 일수.
Output: AddItemModal에 장비 탭, DEFAULT_EQUIPMENT_PRICES 기반 기본 단가
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/estimate/AddItemModal.tsx
@lib/estimate/constants.ts
@lib/estimate/types.ts
</context>

<interfaces>
<!-- DEFAULT_EQUIPMENT_PRICES -->
```typescript
export const DEFAULT_EQUIPMENT_PRICES = {
  ladder: 120000,   // 사다리차 1일
  sky: 350000,      // 스카이차 1일
  waste: 200000,    // 폐기물 1일
}
```

<!-- EstimateItem 장비 관련 필드 -->
```typescript
is_equipment: boolean  // 장비류
is_fixed_qty: boolean  // 수량 고정
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: AddItemModal에 장비 탭 추가</name>
  <files>components/estimate/AddItemModal.tsx</files>
  <action>
AddItemModal.tsx를 수정한다 (Plan 15에서 생성됨). 200줄 이내 유지.

1. 탭 구조를 "프리셋" | "자유입력" → "프리셋" | "장비" | "자유입력" 3탭으로 변경

2. 장비 탭 콘텐츠:
   - 3개 장비 프리셋을 하드코딩 (DB 불필요):
     ```
     const EQUIPMENT_PRESETS = [
       { name: '사다리차', spec: '', unit: '일', mat: DEFAULT_EQUIPMENT_PRICES.ladder, labor: 0, exp: 0 },
       { name: '스카이차', spec: '', unit: '일', mat: DEFAULT_EQUIPMENT_PRICES.sky, labor: 0, exp: 0 },
       { name: '폐기물처리', spec: '', unit: '식', mat: DEFAULT_EQUIPMENT_PRICES.waste, labor: 0, exp: 0 },
     ]
     ```
   - 각 장비 행: name 표시 + 일수 입력 (기본 1) + "추가" 버튼
   - 일수 입력은 `<input type="number" min="1" defaultValue="1">`
   - 추가 클릭 시:
     ```
     onAdd({
       name: preset.name,
       spec: preset.spec,
       unit: preset.unit,
       qty: days,
       mat: preset.mat,
       labor: 0,
       exp: 0,
       is_equipment: true,
       is_fixed_qty: true,
     })
     ```

3. import DEFAULT_EQUIPMENT_PRICES from '@/lib/estimate/constants'

4. 장비 단가를 사용자가 수정 가능하도록 mat 필드에도 input을 제공:
   기본값은 DEFAULT_EQUIPMENT_PRICES에서 가져오되, 사용자가 변경 가능.
   `<input type="number" defaultValue={preset.mat} onChange={...} />`
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>AddItemModal에 장비 탭이 있고, 사다리차/스카이차/폐기물 추가 가능. 빌드 성공.</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. AddItemModal 장비 탭에 3개 프리셋 표시 확인
3. 사다리차 2일 추가 → is_equipment=true, is_fixed_qty=true, qty=2, mat=120000 확인
4. 스카이차 단가 수정 후 추가 가능 확인
</verification>

<success_criteria>
- 장비 탭에 사다리차/스카이차/폐기물 3개 프리셋 표시
- 일수 입력 + 단가 수정 가능
- is_equipment=true, is_fixed_qty=true로 추가
- npm run build 통과
</success_criteria>

<output>
After completion, create `.planning/phases/08-manual-edit/22-SUMMARY.md`
</output>
