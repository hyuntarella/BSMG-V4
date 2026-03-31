---
phase: 08-manual-edit
plan: 16
subsystem: estimate-editor
tags: [manual-edit, remove-item, undo, worksheet]
dependency_graph:
  requires: [08-15]
  provides: [removeItem, delete-button-ui]
  affects: [hooks/useEstimate.ts, components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx]
tech_stack:
  added: []
  patterns: [confirm-before-delete, snapshot-undo]
key_files:
  modified:
    - hooks/useEstimate.ts
    - components/estimate/WorkSheet.tsx
    - components/estimate/EstimateEditor.tsx
decisions:
  - "x button reuses existing 비고 td — no new column needed, keeps table width unchanged"
  - "window.confirm used for delete confirmation — simplest approach, no custom modal"
metrics:
  duration: 5m
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 3
---

# Phase 08 Plan 16: 공종 삭제 기능 Summary

**One-liner:** 각 공종 행 비고 컬럼에 x 버튼 추가, confirm 후 삭제, undo로 복원 가능.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useEstimate에 removeItem 함수 추가 | 84ae2fd | hooks/useEstimate.ts |
| 2 | WorkSheet에 삭제 버튼 추가 + EstimateEditor 연결 | a8917c4 | WorkSheet.tsx, EstimateEditor.tsx |

## What Was Built

### removeItem (hooks/useEstimate.ts)
- `removeItem(sheetIndex, itemIndex)` — saves snapshot before deletion
- Filters out item by index, reassigns sort_order 1..n
- Recalculates grand_total via `calc(items)`
- Marks estimate dirty

### x Delete Button (WorkSheet.tsx)
- `onRemoveItem?: (itemIndex: number) => void` prop added
- Each row's 비고 td shows `✕` button when prop provided
- `text-gray-300 hover:text-red-500 text-xs cursor-pointer` styling
- `window.confirm('${item.name} 항목을 삭제하시겠습니까?')` before calling callback

### EstimateEditor.tsx
- Destructures `removeItem` from `useEstimate`
- Passes `onRemoveItem={(idx) => removeItem(activeSheetIndex, idx)}` to WorkSheet

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- hooks/useEstimate.ts modified: FOUND
- WorkSheet.tsx modified: FOUND
- EstimateEditor.tsx modified: FOUND
- Commit 84ae2fd: FOUND
- Commit a8917c4: FOUND
- npm run build: PASSED
