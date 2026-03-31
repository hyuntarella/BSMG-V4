---
phase: 08-manual-edit
plan: 20
type: execute
wave: 1
depends_on: []
files_modified:
  - components/estimate/WorkSheet.tsx
  - hooks/useEstimate.ts
autonomous: true
requirements: [EDIT-20]

must_haves:
  truths:
    - "평단가 변경 시 '공종을 재생성하시겠습니까?' 확인 다이얼로그가 뜬다"
    - "확인 시 buildItems 재실행으로 공종이 재생성된다"
    - "취소 시 평단가만 변경되고 기존 공종은 유지된다"
  artifacts:
    - path: "hooks/useEstimate.ts"
      provides: "updateSheetPpp 함수 (재생성 여부 분기)"
    - path: "components/estimate/WorkSheet.tsx"
      provides: "평단가 변경 시 confirm 다이얼로그 호출"
  key_links:
    - from: "components/estimate/WorkSheet.tsx"
      to: "hooks/useEstimate.ts"
      via: "onSheetChange → updateSheetPpp(sheetIndex, ppp, rebuild: boolean)"
---

<objective>
평단가 변경 시 공종 재생성 확인 UX

Purpose: 평단가 변경 시 기존 수정된 단가를 유지할지, 전체 재생성할지 선택할 수 있어야 한다. 현재 updateSheet('price_per_pyeong', value)는 무조건 rebuildSheet를 호출하여 수동 수정 내용이 덮어씌워진다.
Output: 평단가 변경 시 confirm → 재생성/유지 분기
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
<!-- 현재 updateSheet 동작 -->
```typescript
// updateSheet에서 field === 'price_per_pyeong'이면 rebuildSheet 호출
// rebuildSheet → buildItems 재실행 → 기존 items 전체 교체
```

<!-- rebuildSheet 함수 -->
```typescript
function rebuildSheet(
  sheet: EstimateSheet, m2: number, wallM2: number, priceMatrix: PriceMatrixRaw
): EstimateSheet
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: useEstimate에 평단가 변경 분기 로직 추가</name>
  <files>hooks/useEstimate.ts</files>
  <action>
updateSheet 함수의 기존 동작을 수정하지 않는다. 대신 새 함수를 추가한다.

새 함수: `updateSheetPpp(sheetIndex: number, ppp: number, rebuild: boolean)`

구현:
1. saveSnapshot(`시트${sheetIndex} 평단가 변경`, 'manual')
2. if rebuild:
   - 기존 rebuildSheet 로직 실행 (price_per_pyeong을 새 값으로 설정 후 buildItems 재실행)
3. if !rebuild:
   - price_per_pyeong만 변경하고 기존 items 유지
   - grand_total은 기존 items로 calc 재실행하여 갱신 (items 자체는 변경 없음)
4. setIsDirty(true), markCell(`sheet:${sheetIndex}:price_per_pyeong`)

return 객체에 updateSheetPpp 추가.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>updateSheetPpp 함수가 rebuild 여부에 따라 분기 동작</done>
</task>

<task type="auto">
  <name>Task 2: WorkSheet 평단가 변경 시 confirm 다이얼로그</name>
  <files>components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx</files>
  <action>
WorkSheet.tsx를 수정한다.

1. WorkSheetProps에 추가:
   `onPppChange?: (ppp: number, rebuild: boolean) => void`

2. 현재 내부단가 InlineCell의 onSave를 수정:
   현재: `onSave={(v) => onSheetChange('price_per_pyeong', v as number)}`
   변경: onPppChange가 있으면 confirm 분기 로직 사용
   ```
   onSave={(v) => {
     if (onPppChange) {
       const rebuild = window.confirm(
         '공종을 재생성하시겠습니까?\n\n확인: 새 평단가로 공종 재생성 (수동 수정 초기화)\n취소: 평단가만 변경 (기존 공종 유지)'
       )
       onPppChange(v as number, rebuild)
     } else {
       onSheetChange('price_per_pyeong', v as number)
     }
   }}
   ```

3. EstimateEditor.tsx에서 WorkSheet에 onPppChange prop 전달:
   `onPppChange={(ppp, rebuild) => updateSheetPpp(activeSheetIndex, ppp, rebuild)}`
   — useEstimate에서 updateSheetPpp를 destructure.
   — EstimateEditor.tsx 200줄 이내 유지.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>평단가 변경 시 confirm 다이얼로그 표시, 확인=재생성, 취소=유지. 빌드 성공.</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. 평단가 InlineCell 편집 → blur → confirm 다이얼로그 표시
3. 확인 클릭 → buildItems 재실행 → 공종 재생성 확인
4. 취소 클릭 → 평단가만 변경 → 기존 공종 유지 확인
</verification>

<success_criteria>
- 평단가 변경 시 confirm 다이얼로그 표시
- "확인" → 공종 재생성 (rebuildSheet)
- "취소" → 평단가만 변경, 기존 items 유지
- npm run build 통과
</success_criteria>

<output>
After completion, create `.planning/phases/08-manual-edit/20-SUMMARY.md`
</output>
