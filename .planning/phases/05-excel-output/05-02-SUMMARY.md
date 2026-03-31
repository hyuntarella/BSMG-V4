---
phase: 05-excel-output
plan: 02
subsystem: excel
tags: [exceljs, template, xlsx, urethane, dynamic-rows]

# Dependency graph
requires:
  - phase: 05-excel-output
    plan: 01
    provides: generateFromTemplate + fillDetailFromTemplate pattern for complex sheet
provides:
  - urethane-template.xlsx based generation (10-item rows 7-16)
  - dynamic row hiding for unused template rows
  - per-sheet template routing via getTemplateConfig()
affects:
  - 05-03 (cover/compare sheets)
  - api/estimates/[id]/generate (caller of generateWorkbook)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TemplateConfig interface for per-sheet-type template routing
    - ws.getRow(r).hidden = true to hide unused template rows (vs just clearing values)
    - Shared fillDetailFromTemplate function accepting templateItemCount parameter

key-files:
  created: []
  modified:
    - lib/excel/generateWorkbook.ts

key-decisions:
  - "getTemplateConfig() dispatches to urethane-template.xlsx (10 items) vs complex-template.xlsx (11 items) based on sheet.type"
  - "Unused rows hidden (ws.getRow.hidden=true) not just cleared — hides from Excel row visibility"
  - "Urethane row 17 (empty buffer row in template) always set hidden=true"
  - "Combined 복합+우레탄 estimates: first sheet uses template, second sheet falls back to addWorkSheet scratch"
  - "TEMPLATE_SUMMARY_START_ROW=18 is same for both complex and urethane templates"

patterns-established:
  - "Template routing: getTemplateConfig(sheet.type) returns {templatePath, templateItemCount}"
  - "Row hiding pattern: clearItemRow + ws.getRow(r).hidden=true for unused template rows"

requirements-completed: [EXCEL-02]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 05 Plan 02: Urethane Template + Dynamic Row Insert/Hide Summary

**Urethane template processing and dynamic row hiding: routes urethane sheets to urethane-template.xlsx (10 items), hides unused rows, shares fillDetailFromTemplate logic between both sheet types**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-31T08:15:00Z
- **Completed:** 2026-03-31T08:19:30Z
- **Tasks:** 2 (committed together as single logical change)
- **Files modified:** 1

## Accomplishments

- Inspected urethane-template.xlsx: confirmed 10-item rows (7-16), summary at rows 18-22, same column structure (B-M) as complex template, row 17 is empty buffer row
- Added `TemplateConfig` interface and `getTemplateConfig()` to dispatch to the correct template based on `sheet.type`
- Updated `generateWorkbook` to route first sheet to its appropriate template; falls back to scratch if template not found
- Refactored `fillDetailFromTemplate` to accept `templateItemCount` parameter (11 for complex, 10 for urethane)
- Added row hiding (`ws.getRow(r).hidden = true`) for unused template rows — previously only values were cleared
- Urethane row 17 (empty buffer row) always hidden when urethane template is used
- Combined estimates (복합+우레탄): first sheet uses template path, second sheet uses existing `addWorkSheet` scratch fallback
- Build passes cleanly

## Task Commits

1. **Task 1+2: 우레탄 템플릿 처리 + 동적 행 삽입/숨김** - `0c833ca` (feat)

## Files Created/Modified

- `lib/excel/generateWorkbook.ts` - Added TemplateConfig, getTemplateConfig(); refactored generateWorkbook/generateFromTemplate/fillDetailFromTemplate for urethane support + row hiding

## Decisions Made

- `getTemplateConfig(sheetType)` returns `{ templatePath, templateItemCount }` — clean dispatch for any future sheet types
- Row hiding uses `ws.getRow(r).hidden = true` alongside value clearing — this makes unused rows invisible in Excel (not just blank)
- Urethane template row 17 is a buffer row (empty in template) and is always hidden when urethane template is active
- Both complex and urethane templates share `TEMPLATE_SUMMARY_START_ROW = 18` — the summary area starts at the same row in both templates
- Combined estimate (복합+우레탄): second sheet uses `addWorkSheet` scratch mode since ExcelJS cannot copy worksheets between workbooks; this is acceptable for now (05-03/05-04 can improve)

## Deviations from Plan

None - plan executed exactly as written. The "실용적 접근" described in Task 1 (첫 번째 시트 템플릿, 두 번째 시트 폴백) was implemented as-is.

## Issues Encountered

None. Template inspection confirmed column structure identical between complex and urethane templates (B=name, C=spec, D=unit, E=qty, F=mat, H=labor, J=exp). The `fillDetailFromTemplate` function required only a `templateItemCount` parameter change to handle both.

## Known Stubs

None - both template paths produce complete Excel output.

## Next Phase Readiness

- Phase 05-03 can now implement cover/compare sheet population using the same template infrastructure
- `generateWorkbook` entry point unchanged — generate route.ts requires no modification
- Row hiding + insertion behavior is now correct for both sheet types

---
*Phase: 05-excel-output*
*Completed: 2026-03-31*
