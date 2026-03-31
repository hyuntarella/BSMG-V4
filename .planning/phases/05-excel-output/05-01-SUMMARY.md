---
phase: 05-excel-output
plan: 01
subsystem: excel
tags: [exceljs, template, xlsx, excel-generation]

# Dependency graph
requires:
  - phase: 02-voice-edit-loop
    provides: EstimateItem/EstimateSheet types and calc() function
provides:
  - generateFromTemplate: ExcelJS template-based workbook generation preserving complex-template.xlsx formatting
  - generateWorkbook: Updated entry point with template fallback
affects:
  - 05-02 (urethane sheet)
  - 05-03 (cover/compare sheets)
  - api/estimates/[id]/generate (caller of generateWorkbook)

# Tech tracking
tech-stack:
  added: [path (Node.js built-in, newly imported)]
  patterns:
    - Template-based Excel generation via ExcelJS readFile preserving all cell formatting
    - Fallback pattern: try template load, catch -> scratch generation
    - Dynamic row insertion (spliceRows) when item count exceeds template capacity

key-files:
  created: []
  modified:
    - lib/excel/generateWorkbook.ts

key-decisions:
  - "Template cells B,C,D,E,F,H,J filled with values only; G,I,K,M formulas left intact to auto-calculate amounts"
  - "Items >11: spliceRows inserts extra rows before subtotal row 18, pushes summary rows down, then sets direct values since no formula exists in new rows"
  - "generateFromTemplate is sync (not async) since wb is already loaded — only generateWorkbook is async for readFile"
  - "0 values replaced with empty string '' so cells appear blank matching template aesthetic"

patterns-established:
  - "Template fill: set input cells only (unit prices, qty), leave formula cells untouched"
  - "Fallback chain: template path -> scratch generation, never throws to caller"

requirements-completed: [EXCEL-01]

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 05 Plan 01: Excel Template Generation Summary

**ExcelJS template-based complex sheet generation: loads complex-template.xlsx, fills Sheet2 rows 7-17 with item data, preserves all cell formatting/formulas/merged regions**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-31T08:00:00Z
- **Completed:** 2026-03-31T08:12:48Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Template inspection revealed exact row/column structure: items rows 7-17, summary rows 18-22
- generateFromTemplate loads complex-template.xlsx and fills only input cells (unit prices, qty, name, spec, unit) — template Excel formulas auto-calculate amounts
- Cover Sheet1 updated with mgmt_no, date, customer_name, site_name
- Dynamic item count handled: <=11 items fills template rows directly; >11 inserts rows via spliceRows before summary area
- Fallback to scratch generation if template file not found

## Task Commits

1. **Task 1: 템플릿 로드 + 복합 Sheet2 아이템 채우기** - `a603fef` (feat)

## Files Created/Modified

- `lib/excel/generateWorkbook.ts` - Refactored to template-based generation; added generateFromTemplate, fillCoverFromTemplate, fillDetailFromTemplate, setItemRowValues, clearItemRow, setTemplateSummaryValues; generateWorkbook now tries template first with fallback

## Decisions Made

- Template input cells: only B(name), C(spec), D(unit), E(qty), F(mat unit price), H(labor unit price), J(exp unit price) are set. G/I/K/M columns have Excel formulas (E*F etc.) that calculate automatically — no need to set amount cells for standard 11-item case.
- Items exceeding 11 (template capacity): spliceRows inserts extra rows before row 18 (subtotal), displacing summary rows downward. The inserted rows have no formulas, so mat/labor/exp amounts must be set directly.
- The function `generateFromTemplate` is synchronous (wb already loaded by caller) — only the outer `generateWorkbook` is async for the readFile call.
- Zero numeric values written as empty string `''` to match template aesthetic (blank cells for unused items).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Template structure confirmed via ExcelJS inspection before implementation. Column mapping matched plan description exactly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 05-02 can now implement urethane sheet by loading urethane-template.xlsx using the same pattern
- generateWorkbook entry point and workbookToBuffer signatures unchanged — generate route.ts requires no modification
- The fallback generation path preserved for environments without template files

---
*Phase: 05-excel-output*
*Completed: 2026-03-31*
