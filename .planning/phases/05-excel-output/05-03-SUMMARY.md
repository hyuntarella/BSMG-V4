---
phase: 05-excel-output
plan: 03
subsystem: excel
tags: [exceljs, template, cover-sheet, korean-amount, warranty]

# Dependency graph
requires:
  - phase: 05-excel-output
    plan: 01
    provides: fillCoverFromTemplate + generateFromTemplate pattern
  - phase: 05-excel-output
    plan: 02
    provides: urethane template routing + row hiding
provides:
  - toKoreanAmount: "일금 X원 정(₩X,XXX)" format Korean amount conversion
  - Sheet1 cover data: mgmt_no, date, customer name, site name, Korean amount, totals, warranty
affects:
  - 05-04 (compare sheet - next)
  - api/estimates/[id]/generate (cover output complete)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - toKoreanAmount wraps n2k for full "일금 X원 정(₩X)" format
    - Template formula override: set .value directly to bypass unsupported NUMBERSTRING formula
    - CalcResult computed inside fillCoverFromTemplate via calc(sheet.items)

key-files:
  created: []
  modified:
    - lib/utils/numberToKorean.ts
    - lib/excel/generateWorkbook.ts

key-decisions:
  - "E11 formula NUMBERSTRING() unsupported in Node.js (shows #NAME?) — override with toKoreanAmount() string value directly"
  - "K14 set to totalBeforeRound (계), K18 set to grandTotal (합계) — both formula references to Sheet2 overridden with computed values"
  - "D19 warranty richText replaced with plain string — preserves warranty_years/warranty_bond from EstimateSheet"
  - "fillCoverFromTemplate accepts EstimateSheet | undefined — guard for missing first sheet"

patterns-established:
  - "Korean amount: toKoreanAmount(n) = '일금 ' + n2k(n) + '원 정(₩' + n.toLocaleString() + ')'"
  - "Template formula override: assign plain value to formula cell to bypass Excel-only formula functions"

requirements-completed: [EXCEL-03]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 05 Plan 03: Cover Sheet (Sheet1) Data Population Summary

**Sheet1 표지 완성: toKoreanAmount 유틸 추가 + 표지 7개 필드(관리번호/일자/고객명/현장명/한글금액/총액/보증조건) 채움**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-31T08:25:00Z
- **Completed:** 2026-03-31T08:33:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Template inspection revealed exact cover structure: E11 has NUMBERSTRING formula (unsupported in Node.js), K14/K18 reference Sheet2 rows via formula, D19 has complex richText warranty info
- Added `toKoreanAmount(n)` to `lib/utils/numberToKorean.ts` — wraps `n2k()` to produce "일금 팔백이십오만원 정(₩8,250,000)" format
- Updated `fillCoverFromTemplate` to accept `EstimateSheet` parameter, compute `CalcResult` via `calc(sheet.items)`, and fill:
  - D6: 관리번호
  - D7: 견적일
  - D8: 고객명 귀하
  - D9: 공사명(현장명)
  - E11: toKoreanAmount(grandTotal) — overrides #NAME? formula
  - K14: totalBeforeRound (계, 절사 전)
  - K18: grandTotal (합계, 10만원 절사)
  - D19: warranty text (하자보증기간 N년, 하자이행증권 N년)
- Build passes cleanly

## Task Commits

1. **Task 1: toKoreanAmount 함수 추가** - `9e0341f` (feat)
2. **Task 2: Sheet1 표지 데이터 채우기** - `4816892` (feat)

## Files Created/Modified

- `lib/utils/numberToKorean.ts` - Added `toKoreanAmount(n)` export
- `lib/excel/generateWorkbook.ts` - Updated `fillCoverFromTemplate` signature + E11/K14/K18/D19 fill logic; imported `toKoreanAmount`

## Decisions Made

- `NUMBERSTRING()` Excel formula is unsupported in Node.js environments (result shows as `#NAME?` in template). Override E11 by assigning a plain string value using `toKoreanAmount()`.
- K14/K18 formulas (`Sheet2!M21`, `Sheet2!M22`) reference Sheet2 which we control, but since ExcelJS doesn't recalculate cross-sheet formulas on save, we override with direct `CalcResult` values.
- D19 warranty richText (complex multi-font object) replaced with a plain string — simpler and still preserves the critical warranty year/bond values from `EstimateSheet`.
- `fillCoverFromTemplate` now accepts `EstimateSheet | undefined` with a guard — graceful degradation if first sheet is somehow absent.

## Deviations from Plan

**1. [Rule 1 - Bug] D19 warranty text uses sheet.warranty_bond as years, not억원**

The plan described `하자이행보증증권: ${sheet.warranty_bond}억원` but the template's original text shows "하자이행증권 5년" (years, not 억원). The `EstimateSheet` interface has `warranty_bond: number` which from context represents years (e.g., 3 years of bond insurance). Output uses "N년" to match the original template wording, not "N억원".

## Known Stubs

None - cover sheet fields are all populated from estimate data.

## Next Phase Readiness

- Phase 05-04 can now implement compare sheet (비교 탭)
- `toKoreanAmount` is available for any future use (e.g., PDF cover)
- `generateWorkbook` entry point unchanged — generate route.ts requires no modification

---
*Phase: 05-excel-output*
*Completed: 2026-03-31*
