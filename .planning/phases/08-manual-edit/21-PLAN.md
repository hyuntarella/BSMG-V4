---
phase: 08-manual-edit
plan: 21
type: execute
wave: 2
depends_on: [16]
files_modified:
  - hooks/useEstimate.ts
  - components/estimate/WorkSheet.tsx
  - components/estimate/EstimateEditor.tsx
autonomous: true
requirements: [EDIT-21]

must_haves:
  truths:
    - "EstimateEditor 헤더에 현재 시트 삭제 버튼이 있다"
    - "시트 삭제 클릭 시 confirm 후 해당 시트가 제거된다"
    - "WorkSheet 각 행에 up/down 버튼이 있다"
    - "up/down 클릭 시 공종 순서가 변경된다"
  artifacts:
    - path: "hooks/useEstimate.ts"
      provides: "removeSheet, moveItem 함수"
    - path: "components/estimate/WorkSheet.tsx"
      provides: "각 행 up/down 버튼"
    - path: "components/estimate/EstimateEditor.tsx"
      provides: "시트 삭제 버튼"
  key_links:
    - from: "components/estimate/EstimateEditor.tsx"
      to: "hooks/useEstimate.ts"
      via: "removeSheet(activeSheetIndex)"
    - from: "components/estimate/WorkSheet.tsx"
      to: "hooks/useEstimate.ts"
      via: "onMoveItem(fromIndex, toIndex)"
---

<objective>
시트 삭제 + 공종 순서 변경 기능 구현

Purpose: 불필요한 시트(복합/우레탄)를 삭제하고, 공종의 표시 순서를 수동으로 변경할 수 있어야 한다.
Output: removeSheet 함수, moveItem 함수, 시트 삭제 버튼, 행 up/down 버튼
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@hooks/useEstimate.ts
@components/estimate/WorkSheet.tsx
@components/estimate/EstimateEditor.tsx
@lib/estimate/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: useEstimate에 removeSheet, moveItem 함수 추가</name>
  <files>hooks/useEstimate.ts</files>
  <action>
useEstimate 훅에 2개 함수를 추가한다.

**removeSheet(sheetIndex: number):**
1. saveSnapshot(`시트 삭제: ${estimate.sheets[sheetIndex]?.type ?? ''}`, 'manual')
2. setEstimate에서 sheets 배열에서 해당 인덱스 제거
3. setIsDirty(true)

**moveItem(sheetIndex: number, fromIndex: number, toIndex: number):**
1. toIndex가 0 미만이거나 items.length 이상이면 return (범위 밖)
2. saveSnapshot(`${estimate.sheets[sheetIndex]?.items[fromIndex]?.name ?? ''} 순서 변경`, 'manual')
3. setEstimate에서 해당 시트의 items 배열에서 fromIndex 아이템을 toIndex로 이동
   - splice로 제거 후 삽입
4. 이동 후 모든 items의 sort_order를 1부터 재할당
5. setIsDirty(true)

return 객체에 removeSheet, moveItem 추가.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>removeSheet, moveItem 함수 존재하고 타입 에러 없음</done>
</task>

<task type="auto">
  <name>Task 2: WorkSheet에 up/down 버튼, EstimateEditor에 시트 삭제 버튼</name>
  <files>components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx</files>
  <action>
**WorkSheet.tsx 수정:**

1. WorkSheetProps에 추가:
   `onMoveItem?: (fromIndex: number, toIndex: number) => void`

2. 기존 비고 컬럼(또는 삭제 버튼 옆)에 up/down 버튼 추가. Plan 16에서 비고 컬럼에 x 버튼이 있으므로, 같은 td 안에 up/down + x를 배치:
   ```
   <td className="px-1 py-1">
     <div className="flex items-center gap-0.5">
       {onMoveItem && idx > 0 && (
         <button onClick={() => onMoveItem(idx, idx - 1)} className="text-gray-300 hover:text-gray-600 text-[10px]">↑</button>
       )}
       {onMoveItem && idx < sheet.items.length - 1 && (
         <button onClick={() => onMoveItem(idx, idx + 1)} className="text-gray-300 hover:text-gray-600 text-[10px]">↓</button>
       )}
       {onRemoveItem && (
         <button onClick={...} className="text-gray-300 hover:text-red-500 text-xs ml-0.5">×</button>
       )}
     </div>
   </td>
   ```
   첫 번째 행은 up 숨기고, 마지막 행은 down 숨긴다.

**EstimateEditor.tsx 수정:**

1. useEstimate에서 removeSheet, moveItem을 destructure

2. 헤더에 시트 삭제 버튼 추가 (activeSheetIndex >= 0일 때만 표시):
   ```
   {activeSheetIndex >= 0 && (
     <button
       onClick={() => {
         const type = estimate.sheets[activeSheetIndex]?.type
         if (window.confirm(`${type} 시트를 삭제하시겠습니까?`)) {
           removeSheet(activeSheetIndex)
           setActiveTab('compare')
         }
       }}
       className="rounded border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
     >시트 삭제</button>
   )}
   ```
   위치: 기존 "+복합" "+우레탄" 버튼 옆.

3. WorkSheet에 onMoveItem prop 전달:
   `onMoveItem={(from, to) => moveItem(activeSheetIndex, from, to)}`

4. EstimateEditor.tsx 200줄 이내 유지. 기존 중복 코드(complex-detail과 urethane-detail의 WorkSheet 렌더링이 거의 동일)를 하나로 합칠 수 있다면 합친다:
   ```
   {(activeTab === 'complex-detail' || activeTab === 'urethane-detail') && activeSheetIndex >= 0 && (
     <WorkSheet ... />
   )}
   ```
   이렇게 하면 ~5줄 절약.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>시트 삭제 버튼 동작, up/down 순서 변경 동작. 빌드 성공.</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. 헤더 시트 삭제 버튼 → confirm → 시트 제거 확인
3. 공종 행 up 클릭 → 위로 이동 확인
4. 공종 행 down 클릭 → 아래로 이동 확인
5. EstimateEditor.tsx 200줄 이내 확인
</verification>

<success_criteria>
- 시트 삭제: confirm 후 제거, 다른 탭으로 이동
- 공종 순서 변경: up/down 클릭으로 이동, sort_order 재할당
- EstimateEditor.tsx 200줄 이내
- npm run build 통과
</success_criteria>

<output>
After completion, create `.planning/phases/08-manual-edit/21-SUMMARY.md`
</output>
