---
phase: 08-manual-edit
plan: 18
type: execute
wave: 1
depends_on: []
files_modified:
  - components/estimate/WorkSheet.tsx
autonomous: true
requirements: [EDIT-18]

must_haves:
  truths:
    - "WorkSheet 상단 정보 바에서 면적 값을 클릭하면 편집 가능하다"
    - "면적(m2) 변경 시 isArea=true인 공종들의 qty가 자동 재계산된다"
    - "벽체면적(wall_m2) 입력 필드가 표시되고 변경 시 isWall=true인 공종들의 qty가 업데이트된다"
  artifacts:
    - path: "components/estimate/WorkSheet.tsx"
      provides: "m2, wall_m2 인라인 편집 필드"
  key_links:
    - from: "components/estimate/WorkSheet.tsx"
      to: "hooks/useEstimate.ts"
      via: "onMetaChange 콜백 → updateMeta('m2' | 'wall_m2', value)"
---

<objective>
면적/벽체면적 수동 입력 — WorkSheet 상단에서 인라인 편집

Purpose: 음성 외에 면적과 벽체면적을 수동으로 입력/수정할 수 있어야 한다. 면적 변경 시 useEstimate의 기존 rebuildSheet 로직이 트리거되어 qty가 자동 재계산된다.
Output: WorkSheet 상단 정보 바에 m2, wall_m2 편집 필드
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
<!-- updateMeta 시그니처 (이미 존재) -->
```typescript
updateMeta(field: keyof Estimate, value: string | number): void
// field가 'm2' 또는 'wall_m2'이면 rebuildSheet가 자동 트리거됨
```

<!-- WorkSheet 현재 상단 정보 바 -->
```
면적 {fm(m2)}m² ({pyeong}평) | 내부단가 ... | 고객 평단가 ... | 마진 ...
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: WorkSheet 상단에 m2, wall_m2 편집 필드 추가</name>
  <files>components/estimate/WorkSheet.tsx</files>
  <action>
WorkSheet.tsx를 수정한다.

1. WorkSheetProps에 추가:
   - `wallM2?: number` — 벽체면적 표시용
   - `onMetaChange?: (field: 'm2' | 'wall_m2', value: number) => void`

2. 상단 정보 바의 "면적" 부분을 InlineCell로 교체:
   현재: `<span className="font-semibold">{fm(m2)}m²</span>`
   변경:
   ```
   <InlineCell
     value={m2}
     onSave={(v) => onMetaChange?.('m2', v as number)}
     className="inline-block w-16 text-right"
     readOnly={!onMetaChange}
   />
   <span className="text-gray-400">m²</span>
   ```
   onMetaChange가 없으면 readOnly로 기존 동작 유지.

3. 면적 옆에 벽체면적 필드 추가:
   ```
   <div>
     <span className="text-gray-500">벽체</span>{' '}
     <InlineCell
       value={wallM2 ?? 0}
       onSave={(v) => onMetaChange?.('wall_m2', v as number)}
       className="inline-block w-14 text-right"
       readOnly={!onMetaChange}
     />
     <span className="text-gray-400">m²</span>
   </div>
   ```

4. EstimateEditor.tsx에서 WorkSheet에 새 props 전달:
   - `wallM2={estimate.wall_m2}`
   - `onMetaChange={(field, value) => updateMeta(field, value)}`
   — EstimateEditor.tsx 200줄 이내 유지. 이미 updateMeta를 destructure하고 있으므로 prop 추가만 필요.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>면적 클릭 시 편집 가능, 변경 시 qty 재계산. 벽체면적도 편집 가능. 빌드 성공.</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. 면적 값 클릭 → 숫자 입력 → blur → m2 변경 + isArea 공종 qty 재계산 확인
3. 벽체면적 클릭 → 숫자 입력 → blur → wall_m2 변경 + isWall 공종 qty 재계산 확인
</verification>

<success_criteria>
- 면적(m2) InlineCell 편집 가능, 변경 시 rebuildSheet 트리거
- 벽체면적(wall_m2) InlineCell 편집 가능, 변경 시 벽체 공종 qty 업데이트
- npm run build 통과
</success_criteria>

<output>
After completion, create `.planning/phases/08-manual-edit/18-SUMMARY.md`
</output>
