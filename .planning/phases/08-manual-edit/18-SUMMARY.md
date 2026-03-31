---
phase: 08-manual-edit
plan: 18
subsystem: estimate-ui
tags: [inline-edit, worksheet, area, wall-area, meta]
dependency_graph:
  requires: []
  provides: [m2-inline-edit, wall_m2-inline-edit]
  affects: [components/estimate/WorkSheet.tsx, components/estimate/EstimateEditor.tsx]
tech_stack:
  added: []
  patterns: [InlineCell reuse, prop extension]
key_files:
  created: []
  modified:
    - components/estimate/WorkSheet.tsx
    - components/estimate/EstimateEditor.tsx
decisions:
  - WorkSheet m2 display replaced with InlineCell; readOnly when onMetaChange not provided (backward compatible)
  - wallM2 shown as separate InlineCell adjacent to area display in info bar
  - onMetaChange typed as (field: 'm2' | 'wall_m2', value: number) => void matching updateMeta signature
metrics:
  duration: 3m
  completed_date: "2026-03-31"
  tasks_completed: 1
  files_changed: 2
requirements: [EDIT-18]
---

# Phase 08 Plan 18: Area / Wall-Area Inline Edit Summary

WorkSheet 상단 정보 바에서 면적(m2)과 벽체면적(wall_m2)을 InlineCell로 직접 편집할 수 있도록 추가. 변경 시 useEstimate의 rebuildSheet가 자동 트리거되어 isArea/isWall 공종의 qty가 재계산된다.

## What Was Built

- `WorkSheet.tsx`: `wallM2?: number` and `onMetaChange?: (field: 'm2' | 'wall_m2', value: number) => void` props added
- Area display replaced: static `{fm(m2)}m²` → `InlineCell` (editable when onMetaChange provided, readOnly otherwise)
- Wall area field added: new `InlineCell` for `wall_m2` displayed adjacent to area in info bar
- `EstimateEditor.tsx`: passes `wallM2={estimate.wall_m2}` and `onMetaChange={(field, value) => updateMeta(field, value)}`

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 — m2/wall_m2 inline edit | 5c5bbac | WorkSheet.tsx, EstimateEditor.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `components/estimate/WorkSheet.tsx` — modified, exists
- `components/estimate/EstimateEditor.tsx` — modified, exists
- Build: passed (no errors)
- Commit 5c5bbac — confirmed
