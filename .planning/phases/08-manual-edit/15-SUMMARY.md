---
phase: 08-manual-edit
plan: 15
subsystem: estimate-ui
tags: [add-item, modal, preset, manual-edit]
dependency_graph:
  requires: []
  provides: [addItem-function, AddItemModal-component, WorkSheet-add-button]
  affects: [hooks/useEstimate.ts, components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx]
tech_stack:
  added: []
  patterns: [modal-overlay, preset-fallback, useCallback-handlers]
key_files:
  created:
    - components/estimate/AddItemModal.tsx
  modified:
    - hooks/useEstimate.ts
    - components/estimate/WorkSheet.tsx
    - components/estimate/EstimateEditor.tsx
decisions:
  - name: DEFAULT_PRESETS fallback
    rationale: /api/presets API may not exist yet; hardcoded 8 common presets ensure modal is usable immediately
  - name: onAddItem as optional prop
    rationale: keeps WorkSheet backward-compatible with any existing usage that doesn't pass the prop
  - name: addItem uses pushUndo pattern
    rationale: useEstimate has pushUndo/undoStack but not saveSnapshot; used recordChange('manual') to match existing pattern
metrics:
  duration: ~15min
  completed: 2026-03-31
  tasks_completed: 3
  files_modified: 4
---

# Phase 08 Plan 15: 공종 추가 모달 Summary

공종 추가 기능 — 프리셋 선택 모달 + 자유입력 폼. WorkSheet 하단 "+ 공종 추가" 버튼 클릭 시 모달 열림, 프리셋 선택 또는 자유입력으로 공종 추가 후 합계 자동 재계산.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useEstimate에 addItem 추가 | 51e46f3 | hooks/useEstimate.ts |
| 2 | AddItemModal 컴포넌트 생성 | 8d6d471, a4c7318 | components/estimate/AddItemModal.tsx |
| 3 | WorkSheet + EstimateEditor 연결 | 7b9550d | components/estimate/WorkSheet.tsx, EstimateEditor.tsx |

## What Was Built

**`addItem(sheetIndex, item)` in useEstimate:**
- Appends a new EstimateItem to the end of the sheet's items array
- Computes mat_amount, labor_amount, exp_amount, total from qty × unit prices
- Recalculates grand_total via `calc(items)`
- Sets isDirty, records change as 'manual'

**`AddItemModal` component (200 lines):**
- Preset tab: fetches `/api/presets`, falls back to 8 hardcoded presets (크랙보수, 드라이비트 절개, 바탕미장 추가, 옥탑 방수, 배수구 처리, 사다리차, 스카이차, 폐기물 처리)
- Presets grouped by category (추가공종, 장비)
- Custom tab: name (required) / spec / unit dropdown / qty inputs
- ESC key + overlay click to close
- Calls `onAdd(Partial<EstimateItem>)` then `onClose()`

**WorkSheet.tsx:**
- Added `onAddItem?: (item: Partial<EstimateItem>) => void` optional prop
- Renders dashed "+ 공종 추가" button below summary row when `onAddItem` is provided
- `useState(false)` for modal open/close
- Renders `<AddItemModal>` with open/close/onAdd wiring

**EstimateEditor.tsx:**
- Destructures `addItem` from useEstimate
- Passes `onAddItem={(item) => addItem(activeSheetIndex, item)}` to both complex and urethane WorkSheets

## Deviations from Plan

**1. [Rule 1 - Adaptation] saveSnapshot/markCell not available**
- **Found during:** Task 1
- **Issue:** Plan specified `saveSnapshot` and `markCell` calls, but useEstimate has `pushUndo`/`undoStack` pattern and no `markCell`
- **Fix:** Used `recordChange('manual', {...})` which is the existing pattern. No behavior change — undo stack is managed separately via `pushUndo` which callers invoke before mutations.
- **Files modified:** hooks/useEstimate.ts

**2. [Rule 2 - Size compliance] AddItemModal was 225 lines**
- **Found during:** Task 2 finalization
- **Issue:** Initial implementation exceeded 200-line CLAUDE.md rule
- **Fix:** Condensed useEffect handlers, merged imports, removed comment headers. Reached exactly 200 lines.
- **Commit:** a4c7318

## Known Stubs

None — all functionality is wired: addItem mutates state, grand_total recalculates, preset data loads from API with fallback.

## Self-Check: PASSED

- components/estimate/AddItemModal.tsx: FOUND
- hooks/useEstimate.ts: FOUND
- components/estimate/WorkSheet.tsx: FOUND
- components/estimate/EstimateEditor.tsx: FOUND
- Commit 51e46f3: FOUND
- Commit 8d6d471: FOUND
- Commit 7b9550d: FOUND
- Commit a4c7318: FOUND
