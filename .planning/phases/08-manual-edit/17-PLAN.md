---
phase: 08-manual-edit
plan: 17
type: execute
wave: 1
depends_on: []
files_modified:
  - components/estimate/WorkSheet.tsx
  - hooks/useEstimate.ts
autonomous: true
requirements: [EDIT-17]

must_haves:
  truths:
    - "WorkSheet에서 품명 셀을 클릭하면 텍스트 편집 가능하다"
    - "규격 셀을 클릭하면 텍스트 편집 가능하다"
    - "단위 셀을 클릭하면 텍스트 편집 가능하다"
    - "편집 후 blur 시 값이 저장된다"
  artifacts:
    - path: "components/estimate/WorkSheet.tsx"
      provides: "name/spec/unit 컬럼에 InlineCell type='text' 적용"
    - path: "hooks/useEstimate.ts"
      provides: "updateItemText 또는 updateItem 확장"
  key_links:
    - from: "components/estimate/WorkSheet.tsx"
      to: "hooks/useEstimate.ts"
      via: "onItemTextChange 콜백"
---

<objective>
공종명/규격/단위 인라인 편집 — 텍스트 필드를 InlineCell로 교체

Purpose: 음성으로 추가된 공종의 이름/규격/단위를 수동으로 미세 수정할 수 있어야 한다.
Output: WorkSheet의 name/spec/unit 컬럼이 클릭 시 편집 가능
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/estimate/WorkSheet.tsx
@components/estimate/InlineCell.tsx
@hooks/useEstimate.ts
@lib/estimate/types.ts
</context>

<interfaces>
<!-- InlineCell 현재 props -->
```typescript
interface InlineCellProps {
  value: number | string
  type?: 'number' | 'text'
  formatted?: boolean
  onSave: (value: number | string) => void
  className?: string
  readOnly?: boolean
}
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: useEstimate에 텍스트 필드 업데이트 지원 추가</name>
  <files>hooks/useEstimate.ts</files>
  <action>
현재 updateItem은 value 타입이 number이다.
텍스트 필드(name, spec, unit)도 수정 가능하도록 updateItemText 함수를 추가한다.

시그니처: `updateItemText(sheetIndex: number, itemIndex: number, field: 'name' | 'spec' | 'unit', value: string)`

구현:
1. saveSnapshot(`${estimate.sheets[sheetIndex]?.items[itemIndex]?.name ?? ''} ${field} 변경`, 'manual')
2. setEstimate에서 해당 아이템의 field를 value로 업데이트
3. 금액 재계산은 불필요 (텍스트 필드만 변경)
4. setIsDirty(true), markCell(`item:${sheetIndex}:${itemIndex}:${field}`)

return 객체에 updateItemText 추가.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>updateItemText 함수가 useEstimate에 존재하고 타입 에러 없음</done>
</task>

<task type="auto">
  <name>Task 2: WorkSheet의 name/spec/unit에 InlineCell 적용</name>
  <files>components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx</files>
  <action>
WorkSheet.tsx를 수정한다.

1. WorkSheetProps에 onItemTextChange 추가:
   `onItemTextChange?: (itemIndex: number, field: 'name' | 'spec' | 'unit', value: string) => void`

2. 현재 품명 td의 `{item.name}` 텍스트를 InlineCell로 교체:
   ```
   <InlineCell
     value={item.name}
     type="text"
     formatted={false}
     onSave={(v) => onItemTextChange?.(idx, 'name', v as string)}
     className="text-left font-medium"
   />
   ```
   onItemTextChange가 없으면 readOnly={true}로 설정.

3. 규격 td도 동일하게 InlineCell type="text"로 교체:
   className="text-left text-gray-500"

4. 단위 td도 동일하게 InlineCell type="text"로 교체:
   className="text-center text-gray-500"

5. InlineCell의 text 모드에서 text-right가 아닌 text-left가 되도록, className으로 오버라이드.

6. EstimateEditor.tsx에서 WorkSheet에 onItemTextChange prop 전달:
   `onItemTextChange={(i, f, v) => updateItemText(activeSheetIndex, i, f, v)}`
   — useEstimate에서 updateItemText를 destructure.
   — EstimateEditor.tsx 200줄 이내 유지.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>품명/규격/단위 셀 클릭 시 편집 가능하고, blur 시 저장됨. 빌드 성공.</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. 품명 셀 클릭 → 텍스트 입력 → blur → 이름 변경 확인
3. 규격 셀 클릭 → 텍스트 입력 → blur → 규격 변경 확인
4. 단위 셀 클릭 → 텍스트 입력 → blur → 단위 변경 확인
</verification>

<success_criteria>
- name/spec/unit 3개 컬럼 모두 InlineCell type="text"로 인라인 편집 가능
- 편집 후 blur 시 saveSnapshot + 값 저장
- npm run build 통과
</success_criteria>

<output>
After completion, create `.planning/phases/08-manual-edit/17-SUMMARY.md`
</output>
