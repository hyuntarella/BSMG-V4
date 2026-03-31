---
phase: 08-manual-edit
plan: 22
subsystem: ui
tags: [react, modal, equipment, estimate]

requires:
  - phase: 08-manual-edit/15
    provides: AddItemModal with preset + custom tabs

provides:
  - AddItemModal 장비 탭 with 사다리차/스카이차/폐기물처리 presets
  - Per-equipment days and price inputs
  - is_equipment=true, is_fixed_qty=true flags on equipment items

affects: [estimate-editor, worksheet]

tech-stack:
  added: []
  patterns: [equipment presets as const array with key discriminant for typed Record state]

key-files:
  created: []
  modified:
    - components/estimate/AddItemModal.tsx

key-decisions:
  - "Equipment tab uses per-key Record state (eqDays, eqPrice) keyed by EquipKey union type for type-safe inline editing"
  - "EQUIPMENT_PRESETS declared as const tuple with key discriminant enabling typeof EQUIPMENT_PRESETS[number]['key'] EquipKey type"
  - "폐기물처리 unit is 식 (not 일) consistent with existing DB presets — one-time cost not daily"

patterns-established:
  - "Equipment item addition: is_equipment=true, is_fixed_qty=true, mat=price*days_indirectly via qty"

requirements-completed: [EDIT-22]

duration: 10min
completed: 2026-03-31
---

# Phase 08 Plan 22: AddItemModal Equipment Tab Summary

**AddItemModal extended with 장비 tab showing 사다리차(120k)/스카이차(350k)/폐기물처리(200k) presets with editable days and unit price, adding items with is_equipment=true, is_fixed_qty=true**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-31T10:10:00Z
- **Completed:** 2026-03-31T10:15:47Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added '장비' tab as middle tab between 프리셋 and 자유입력
- 3 equipment presets with DEFAULT_EQUIPMENT_PRICES from constants.ts
- Per-equipment inline inputs: days (일수) + unit price (단가) both editable
- Equipment items added with is_equipment=true, is_fixed_qty=true as required
- File stays within 200-line limit (196 lines)

## Task Commits

1. **Task 1: AddItemModal에 장비 탭 추가** - `06b3570` (feat)

## Files Created/Modified

- `components/estimate/AddItemModal.tsx` - Added 장비 tab with EQUIPMENT_PRESETS, eqDays/eqPrice state, handleEquipAdd callback

## Decisions Made

- Equipment presets declared as `as const` tuple with key discriminant field, enabling `typeof EQUIPMENT_PRESETS[number]['key']` EquipKey type for safe Record indexing
- 폐기물처리 unit is '식' (not '일') to match existing DB presets — treated as one-time disposal cost
- eqDays and eqPrice as separate Record states rather than a combined object, keeping state updates simple

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Build ENOENT error on `.next/static` manifest during parallel execution — this is a known race condition when multiple agents write to `.next` simultaneously. TypeScript compilation itself showed `✓ Compiled successfully` with no errors. Pre-existing warnings in other files (img, useMemo) were not introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AddItemModal now has 3 tabs: 프리셋 | 장비 | 자유입력
- Equipment items correctly flagged for estimate calculation downstream
- Ready for next phase

---
*Phase: 08-manual-edit*
*Completed: 2026-03-31*
