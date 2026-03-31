---
phase: 08-manual-edit
plan: 17
subsystem: ui
tags: [inline-edit, worksheet, estimate-items, text-fields]

requires:
  - phase: 08-manual-edit/16
    provides: delete item (x button), AddItemModal wired

provides:
  - name/spec/unit cells in WorkSheet are InlineCell type='text' — click to edit inline
  - updateItemText(sheetIndex, itemIndex, field, value) in useEstimate
  - onItemTextChange prop on WorkSheetProps

affects: [WorkSheet, useEstimate, EstimateEditor]

tech-stack:
  added: []
  patterns:
    - "InlineCell type='text' with className override for text-left alignment on name/spec columns"
    - "updateItemText mirrors updateItem but skips amount recalculation (text-only fields)"

key-files:
  created: []
  modified:
    - hooks/useEstimate.ts
    - components/estimate/WorkSheet.tsx
    - components/estimate/EstimateEditor.tsx

key-decisions:
  - "updateItemText skips amount recalculation — name/spec/unit have no effect on mat/labor/exp amounts"
  - "InlineCell input className appended after text-right — Tailwind last-class-wins makes text-left override work"
  - "readOnly={!onItemTextChange} — WorkSheet stays usable in read-only contexts without callback"

patterns-established:
  - "Text field InlineCell: type='text' formatted={false} className='text-left ...'"

requirements-completed: [EDIT-17]

duration: 5min
completed: 2026-03-31
---

# Phase 08 Plan 17: 공종명/규격/단위 인라인 편집 Summary

**WorkSheet name/spec/unit cells converted to InlineCell type='text' with updateItemText in useEstimate for snapshot-tracked text editing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-31T09:58:00Z
- **Completed:** 2026-03-31T10:00:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `updateItemText(sheetIndex, itemIndex, field, value)` to `useEstimate` — saves snapshot, marks cell, sets dirty
- Replaced static `{item.name}`, `{item.spec}`, `{item.unit}` text in WorkSheet rows with `InlineCell type="text"`
- Wired `onItemTextChange` from `EstimateEditor` to `WorkSheet`, enabling all three columns to be click-edited inline

## Task Commits

1. **Task 1: useEstimate에 텍스트 필드 업데이트 지원 추가** - `f440e32` (feat)
2. **Task 2: WorkSheet의 name/spec/unit에 InlineCell 적용** - `1c6f68c` (feat)

## Files Created/Modified
- `hooks/useEstimate.ts` - added updateItemText function and exposed in return
- `components/estimate/WorkSheet.tsx` - added onItemTextChange prop, replaced 3 static cells with InlineCell
- `components/estimate/EstimateEditor.tsx` - destructured updateItemText, passed onItemTextChange to WorkSheet

## Decisions Made
- `updateItemText` skips amount recalculation — text fields (name/spec/unit) have no effect on monetary totals
- InlineCell already supports text mode; `className="text-left ..."` appended after `text-right` in base class — Tailwind last-class-wins ensures correct alignment
- `readOnly={!onItemTextChange}` — safe fallback when WorkSheet is rendered without edit callback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 text columns (name/spec/unit) are now editable inline alongside existing number columns (qty/mat/labor/exp)
- Plan 18 (수량/단가 정밀 편집 등) can proceed without blockers

---
*Phase: 08-manual-edit*
*Completed: 2026-03-31*
