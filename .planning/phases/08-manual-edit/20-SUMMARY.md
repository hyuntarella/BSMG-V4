---
phase: 08-manual-edit
plan: 20
subsystem: estimate-editor
tags: [manual-edit, price-per-pyeong, confirm-dialog, rebuild]
dependency_graph:
  requires: []
  provides: [updateSheetPpp, onPppChange]
  affects: [hooks/useEstimate.ts, components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx]
tech_stack:
  added: []
  patterns: [window.confirm for destructive action gating, prop fallback for backward compat]
key_files:
  created: []
  modified:
    - hooks/useEstimate.ts
    - components/estimate/WorkSheet.tsx
    - components/estimate/EstimateEditor.tsx
decisions:
  - updateSheetPpp is a new function; existing updateSheet left untouched (no regression risk)
  - window.confirm chosen over custom modal — single-line implementation, consistent with existing removeItem confirm pattern in WorkSheet
  - onPppChange is optional; when absent WorkSheet falls back to onSheetChange('price_per_pyeong') for backward compatibility
metrics:
  duration: 4m
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_changed: 3
---

# Phase 08 Plan 20: 평단가 변경 시 공종 재생성 확인 UX Summary

평단가(price_per_pyeong) 변경 시 `window.confirm` 다이얼로그를 통해 공종 재생성(rebuild) 또는 기존 공종 유지(keep) 중 사용자가 선택할 수 있도록 구현.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useEstimate에 updateSheetPpp 추가 | 41fb80c | hooks/useEstimate.ts |
| 2 | WorkSheet confirm 다이얼로그 + EstimateEditor 연결 | a09fd8b | WorkSheet.tsx, EstimateEditor.tsx |

## What Was Built

- `updateSheetPpp(sheetIndex, ppp, rebuild)` — rebuild=true 시 rebuildSheet(buildItems 재실행), rebuild=false 시 price_per_pyeong만 변경하고 기존 items 유지 (grand_total은 calc()로 재계산)
- WorkSheet `onPppChange` prop: 내부단가 InlineCell onSave에서 window.confirm 호출 후 rebuild/keep 분기
- EstimateEditor: updateSheetPpp destructure, WorkSheet에 onPppChange 전달

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- hooks/useEstimate.ts: FOUND (updateSheetPpp added, returned in hook object)
- components/estimate/WorkSheet.tsx: FOUND (onPppChange prop + confirm dialog)
- components/estimate/EstimateEditor.tsx: FOUND (updateSheetPpp destructured, onPppChange passed)
- Commits: 41fb80c FOUND, a09fd8b FOUND
- npm run build: PASSED
