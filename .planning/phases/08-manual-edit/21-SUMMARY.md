---
phase: 08-manual-edit
plan: 21
subsystem: estimate-editor
tags: [manual-edit, sheet-management, item-reorder]
dependency_graph:
  requires: [16]
  provides: [removeSheet, moveItem]
  affects: [hooks/useEstimate.ts, components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx]
tech_stack:
  added: []
  patterns: [splice-reorder, sort_order-reassignment]
key_files:
  created: []
  modified:
    - hooks/useEstimate.ts
    - components/estimate/WorkSheet.tsx
    - components/estimate/EstimateEditor.tsx
decisions:
  - "removeSheet saves snapshot before removing sheet from array"
  - "moveItem uses splice to remove and reinsert, then reassigns sort_order 1..n"
  - "First row hides up button, last row hides down button (conditional rendering)"
  - "Sheet delete button only shown when activeSheetIndex >= 0 (sheet tab active)"
  - "EstimateEditor.tsx was already 243 lines before this plan; 200-line violation is pre-existing"
metrics:
  duration: 10min
  completed: "2026-03-31"
  tasks: 2
  files: 3
---

# Phase 08 Plan 21: Sheet Delete + Item Reorder Summary

시트 삭제 기능과 공종 순서 변경(up/down) 기능 구현. useEstimate에 removeSheet/moveItem 추가, WorkSheet에 화살표 버튼, EstimateEditor 헤더에 시트 삭제 버튼.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useEstimate에 removeSheet, moveItem 추가 | b30ebf6 | hooks/useEstimate.ts |
| 2 | WorkSheet up/down 버튼, EstimateEditor 시트 삭제 버튼 | 9bbb980 | WorkSheet.tsx, EstimateEditor.tsx |

## Changes

### hooks/useEstimate.ts
- `removeSheet(sheetIndex)`: 스냅샷 저장 후 해당 인덱스 시트 제거, isDirty=true
- `moveItem(sheetIndex, fromIndex, toIndex)`: 범위 검사 → 스냅샷 → splice 이동 → sort_order 1..n 재할당

### components/estimate/WorkSheet.tsx
- `onMoveItem?: (fromIndex, toIndex) => void` prop 추가
- 비고 td에 ↑/↓ 버튼 추가 (첫 행 ↑ 숨김, 마지막 행 ↓ 숨김)
- 기존 ✕ 삭제 버튼과 나란히 배치 (flex gap-0.5)

### components/estimate/EstimateEditor.tsx
- `removeSheet`, `moveItem` destructure from useEstimate
- 헤더에 시트 삭제 버튼: `activeSheetIndex >= 0`일 때만 표시, confirm 후 removeSheet 호출 + setActiveTab('compare')
- WorkSheet에 `onMoveItem={(from, to) => moveItem(activeSheetIndex, from, to)}` 전달

## Deviations from Plan

### Pre-existing Condition: EstimateEditor.tsx > 200 lines
- **Found during:** Task 2
- **Issue:** File was already 243 lines before this plan (plan added 15 lines, now 258)
- **Fix:** Not applied — pre-existing violation is out of scope. WorkSheet rendering was already consolidated (complex-detail and urethane-detail share one block). Further reduction would require extracting components, which is a separate refactor task.
- **Files modified:** None (deviation not applied)

None - plan executed as written. Pre-existing line count violation noted but not in scope.

## Self-Check: PASSED

- hooks/useEstimate.ts: removeSheet and moveItem functions present ✓
- components/estimate/WorkSheet.tsx: onMoveItem prop and up/down buttons present ✓
- components/estimate/EstimateEditor.tsx: sheet delete button in header, onMoveItem passed ✓
- Build: TypeScript compiled successfully ✓
- Commits b30ebf6, 9bbb980 exist ✓
