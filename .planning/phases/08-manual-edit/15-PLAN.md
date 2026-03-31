---
phase: 08-manual-edit
plan: 15
type: execute
wave: 1
depends_on: []
files_modified:
  - components/estimate/AddItemModal.tsx
  - hooks/useEstimate.ts
  - components/estimate/WorkSheet.tsx
autonomous: true
requirements: [EDIT-15]

must_haves:
  truths:
    - "WorkSheet 하단 '+ 공종 추가' 버튼 클릭 시 모달이 열린다"
    - "모달에서 프리셋 목록이 표시되고 선택 시 기본 단가가 자동 채워진다"
    - "자유입력 폼으로 name/spec/unit/qty를 직접 입력하여 공종을 추가할 수 있다"
    - "추가된 공종이 시트 아이템 목록 끝에 나타나고 합계가 재계산된다"
  artifacts:
    - path: "components/estimate/AddItemModal.tsx"
      provides: "프리셋 선택 + 자유입력 모달"
    - path: "hooks/useEstimate.ts"
      provides: "addItem 함수"
    - path: "components/estimate/WorkSheet.tsx"
      provides: "+ 공종 추가 버튼"
  key_links:
    - from: "components/estimate/WorkSheet.tsx"
      to: "components/estimate/AddItemModal.tsx"
      via: "useState로 모달 open/close"
    - from: "components/estimate/AddItemModal.tsx"
      to: "hooks/useEstimate.ts"
      via: "onAdd 콜백 → addItem"
---

<objective>
공종 추가 기능 구현 — 프리셋 선택 모달 + 자유입력 폼

Purpose: 음성 외에 수동으로 공종을 추가할 수 있어야 한다. 프리셋에서 선택하면 기본 단가가 자동 채워지고, 자유입력으로 임의 공종도 추가 가능.
Output: AddItemModal.tsx 컴포넌트, useEstimate에 addItem 함수, WorkSheet에 추가 버튼
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@hooks/useEstimate.ts
@components/estimate/WorkSheet.tsx
@components/estimate/InlineCell.tsx
@lib/estimate/types.ts
@lib/estimate/constants.ts
</context>

<interfaces>
<!-- useEstimate.ts 현재 exports -->
```typescript
export function useEstimate(initialEstimate: Estimate, priceMatrix: PriceMatrixRaw): {
  estimate: Estimate
  setEstimate: React.Dispatch<React.SetStateAction<Estimate>>
  isDirty: boolean
  markClean: () => void
  updateMeta: (field: keyof Estimate, value: string | number) => void
  updateSheet: (sheetIndex: number, field: string, value: number) => void
  updateItem: (sheetIndex: number, itemIndex: number, field: string, value: number) => void
  applyVoiceCommands: (commands: VoiceCommand[], sheetIndex?: number) => { executed: boolean; routing: unknown }
  addSheet: (type: '복합' | '우레탄') => void
  initFromVoiceFlow: (data: { area: number; wallM2: number; complexPpp: number | null; urethanePpp: number | null }) => void
  getSheetMargin: (sheetIndex: number) => number
  undo: () => void
  snapshots: Snapshot[]
  restoreTo: (index: number) => void
  modifiedCells: ModifiedCells
  saveSnapshot: (description: string, type?: Snapshot['type']) => void
}
```

<!-- EstimateItem 타입 -->
```typescript
export interface EstimateItem {
  id?: string; sheet_id?: string; sort_order: number;
  name: string; spec: string; unit: string; qty: number;
  mat: number; labor: number; exp: number;
  mat_amount: number; labor_amount: number; exp_amount: number;
  total: number; is_base: boolean; is_equipment: boolean; is_fixed_qty: boolean;
}
```

<!-- PresetRow 타입 -->
```typescript
export interface PresetRow {
  id?: string; company_id: string;
  name: string; spec: string; unit: string;
  mat: number; labor: number; exp: number;
  category: string; used_count?: number; last_used?: string;
}
```

<!-- WorkSheetProps 현재 인터페이스 -->
```typescript
interface WorkSheetProps {
  sheet: EstimateSheet; m2: number; margin: number;
  modifiedCells?: ModifiedCells;
  onItemChange: (itemIndex: number, field: string, value: number) => void;
  onSheetChange: (field: string, value: number) => void;
}
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: useEstimate에 addItem 함수 추가</name>
  <files>hooks/useEstimate.ts</files>
  <action>
useEstimate 훅에 addItem 함수를 추가한다.

시그니처: `addItem(sheetIndex: number, item: Partial<EstimateItem>)`

구현:
1. saveSnapshot 호출 (`${item.name} 추가`, 'manual')
2. setEstimate에서 해당 sheetIndex의 items 배열 끝에 새 아이템 추가
3. 새 아이템의 sort_order는 기존 items.length + 1
4. mat_amount = qty * mat, labor_amount = qty * labor, exp_amount = qty * exp, total = 합산
5. is_base = false (수동 추가이므로), is_equipment와 is_fixed_qty는 item에서 전달받은 값 사용 (기본 false)
6. calc(items) 호출하여 grand_total 재계산
7. setIsDirty(true), markCell(`item:${sheetIndex}:${newIndex}:added`)

return 객체에 addItem 추가.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>addItem 함수가 useEstimate에 존재하고 타입 에러 없음</done>
</task>

<task type="auto">
  <name>Task 2: AddItemModal 컴포넌트 생성</name>
  <files>components/estimate/AddItemModal.tsx</files>
  <action>
AddItemModal.tsx를 생성한다. 200줄 이내.

Props:
```typescript
interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onAdd: (item: Partial<EstimateItem>) => void
}
```

구현:
1. open이 false면 null 반환
2. 모달 오버레이 (fixed inset-0 bg-black/50 z-50) + 중앙 패널 (bg-white rounded-lg max-w-md w-full max-h-[80vh])
3. 상단 탭 2개: "프리셋" | "자유입력"
4. **프리셋 탭:**
   - fetch('/api/presets')로 프리셋 목록 로드 (useEffect, 모달 open 시)
   - 카테고리별 그룹핑 (category 필드)
   - 각 프리셋 행: name, spec, unit 표시 + 클릭 시 onAdd 호출
   - onAdd 시 { name, spec, unit, qty: 1, mat: preset.mat, labor: preset.labor, exp: preset.exp }
5. **자유입력 탭:**
   - 입력 필드: name (필수), spec, unit (기본 'm²'), qty (기본 1)
   - "추가" 버튼 클릭 시 onAdd({ name, spec, unit, qty, mat: 0, labor: 0, exp: 0 })
   - name이 비어있으면 추가 불가
6. onAdd 호출 후 onClose() 실행
7. ESC 키로 닫기, 오버레이 클릭으로 닫기

API /api/presets가 없을 경우를 대비하여 fetch 실패 시 빈 배열로 폴백.
프리셋 API가 아직 없다면 COMPLEX_BASE + URETHANE_BASE에서 하드코딩된 프리셋을 대신 표시한다.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>AddItemModal이 프리셋 목록 + 자유입력 폼을 제공하고 onAdd 콜백을 호출</done>
</task>

<task type="auto">
  <name>Task 3: WorkSheet에 공종 추가 버튼 + 모달 연결</name>
  <files>components/estimate/WorkSheet.tsx</files>
  <action>
WorkSheet.tsx를 수정한다.

1. WorkSheetProps에 onAddItem 추가:
   `onAddItem?: (item: Partial<EstimateItem>) => void`
   optional로 하여 기존 사용처 호환 유지.

2. WorkSheet 컴포넌트 내부에 useState로 addModalOpen 관리

3. 테이블 하단 (합계 영역 아래)에 "+ 공종 추가" 버튼 추가:
   - onAddItem이 존재할 때만 표시
   - 클릭 시 setAddModalOpen(true)
   - 스타일: border-dashed border-gray-300, text-gray-500, hover:bg-gray-50, w-full, py-2

4. AddItemModal import + 렌더링:
   - open={addModalOpen}
   - onClose={() => setAddModalOpen(false)}
   - onAdd={(item) => { onAddItem?.(item); setAddModalOpen(false) }}

5. EstimateEditor.tsx에서 WorkSheet에 onAddItem prop 전달:
   `onAddItem={(item) => addItem(activeSheetIndex, item)}`
   — EstimateEditor.tsx는 이미 197줄이므로, useEstimate 반환에서 addItem을 destructure하고 prop 한 줄만 추가. 200줄 이내 유지.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>WorkSheet 하단에 "+ 공종 추가" 버튼이 표시되고, 클릭 시 모달이 열리며, 프리셋 선택 또는 자유입력으로 공종이 추가됨. 빌드 성공.</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. 견적서 페이지에서 WorkSheet 하단 "+ 공종 추가" 버튼 표시 확인
3. 모달에서 프리셋 선택 시 아이템 추가 + 합계 재계산 확인
4. 자유입력으로 공종 추가 시 아이템 추가 + 합계 재계산 확인
</verification>

<success_criteria>
- 프리셋 선택으로 공종 추가 시 기본 단가 자동 채움
- 자유입력으로 공종 추가 가능
- 추가 후 합계 자동 재계산
- EstimateEditor.tsx 200줄 이내 유지
- npm run build 통과
</success_criteria>

<output>
After completion, create `.planning/phases/08-manual-edit/15-SUMMARY.md`
</output>
