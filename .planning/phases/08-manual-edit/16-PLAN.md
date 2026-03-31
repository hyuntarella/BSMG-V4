---
phase: 08-manual-edit
plan: 16
type: execute
wave: 1
depends_on: []
files_modified:
  - hooks/useEstimate.ts
  - components/estimate/WorkSheet.tsx
autonomous: true
requirements: [EDIT-16]

must_haves:
  truths:
    - "WorkSheet 각 행 끝에 x 버튼이 표시된다"
    - "x 버튼 클릭 시 confirm 대화상자가 뜬다"
    - "확인 시 해당 공종이 삭제되고 합계가 재계산된다"
    - "삭제 후 undo로 복원 가능하다"
  artifacts:
    - path: "hooks/useEstimate.ts"
      provides: "removeItem 함수"
    - path: "components/estimate/WorkSheet.tsx"
      provides: "각 행 x 삭제 버튼"
  key_links:
    - from: "components/estimate/WorkSheet.tsx"
      to: "hooks/useEstimate.ts"
      via: "onRemoveItem 콜백 → removeItem"
---

<objective>
공종 삭제 기능 구현 — 각 행 x 버튼 + confirm + undo 지원

Purpose: 수동으로 불필요한 공종을 삭제할 수 있어야 한다. 삭제 전 확인을 거치고, 실수 시 undo로 복원 가능.
Output: useEstimate에 removeItem 함수, WorkSheet에 삭제 버튼
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@hooks/useEstimate.ts
@components/estimate/WorkSheet.tsx
@lib/estimate/types.ts
</context>

<interfaces>
<!-- calc 함수 -->
```typescript
export function calc(items: EstimateItem[]): CalcResult
// CalcResult: { subtotal, overhead, profit, totalBeforeRound, grandTotal }
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: useEstimate에 removeItem 함수 추가</name>
  <files>hooks/useEstimate.ts</files>
  <action>
useEstimate 훅에 removeItem 함수를 추가한다.

시그니처: `removeItem(sheetIndex: number, itemIndex: number)`

구현:
1. saveSnapshot(`${estimate.sheets[sheetIndex]?.items[itemIndex]?.name ?? ''} 삭제`, 'manual')
2. setEstimate에서 해당 sheetIndex의 items 배열에서 itemIndex 제거 (filter 또는 splice)
3. 남은 items의 sort_order를 1부터 재할당
4. calc(items) 호출하여 grand_total 재계산
5. setIsDirty(true)

return 객체에 removeItem 추가.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>removeItem 함수가 useEstimate에 존재하고 타입 에러 없음</done>
</task>

<task type="auto">
  <name>Task 2: WorkSheet에 삭제 버튼 추가</name>
  <files>components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx</files>
  <action>
WorkSheet.tsx를 수정한다.

1. WorkSheetProps에 onRemoveItem 추가:
   `onRemoveItem?: (itemIndex: number) => void`

2. 테이블 헤더 "비 고" 컬럼 옆에는 추가 컬럼을 넣지 않는다. 기존 "비 고" 컬럼 자체를 삭제 버튼 영역으로 활용한다.

3. 각 행의 마지막 td (현재 비어있는 비고 컬럼)에 x 버튼 추가:
   - onRemoveItem이 존재할 때만 표시
   - 스타일: text-gray-300 hover:text-red-500, text-xs, cursor-pointer
   - 클릭 시 `window.confirm('${item.name} 항목을 삭제하시겠습니까?')` 확인 후 onRemoveItem(idx) 호출

4. EstimateEditor.tsx에서 WorkSheet에 onRemoveItem prop 전달:
   `onRemoveItem={(idx) => removeItem(activeSheetIndex, idx)}`
   — useEstimate에서 removeItem을 destructure (Plan 15에서 addItem과 같은 줄에 추가 가능).
   — EstimateEditor.tsx 200줄 이내 유지.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>각 행 비고 컬럼에 x 버튼이 표시되고, 클릭 시 confirm 후 삭제되며, undo로 복원 가능. 빌드 성공.</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. 각 행 비고 컬럼에 x 버튼 표시 확인
3. 삭제 클릭 → confirm → 삭제 → 합계 재계산 확인
4. undo 호출 시 삭제된 공종 복원 확인
</verification>

<success_criteria>
- 모든 공종 행에 x 삭제 버튼 표시
- confirm 후 삭제 실행, 취소 시 유지
- 삭제 전 saveSnapshot으로 undo 가능
- npm run build 통과
</success_criteria>

<output>
After completion, create `.planning/phases/08-manual-edit/16-SUMMARY.md`
</output>
