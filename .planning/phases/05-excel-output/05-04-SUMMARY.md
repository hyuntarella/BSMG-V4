---
phase: 05-excel-output
plan: 04
subsystem: excel
tags: [exceljs, download, generate-route, estimate-editor]

# Dependency graph
requires:
  - phase: 05-excel-output
    plan: 01
    provides: generateWorkbook + workbookToBuffer functions
  - phase: 05-excel-output
    plan: 02
    provides: urethane template routing
  - phase: 05-excel-output
    plan: 03
    provides: cover sheet population
provides:
  - download mode: "POST /api/estimates/[id]/generate with { download: true } returns xlsx binary"
  - excel button: "EstimateEditor header has 엑셀 download button"
  - downloadBlobResponse: "lib/utils/downloadBlob.ts utility for blob-to-file download"
affects:
  - components/estimate/EstimateEditor.tsx
  - app/api/estimates/[id]/generate/route.ts

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "download mode: parse body { download?: boolean } — true returns Uint8Array directly, false does Storage upload"
    - "Buffer → Uint8Array conversion for Web Response compatibility in Next.js API route"
    - "downloadBlobResponse utility extracted to keep EstimateEditor under 200 lines"
    - "Merged duplicate WorkSheet conditionals (complex-detail + urethane-detail) into single conditional"

key-files:
  created:
    - lib/utils/downloadBlob.ts
  modified:
    - app/api/estimates/[id]/generate/route.ts
    - components/estimate/EstimateEditor.tsx

key-decisions:
  - "Buffer<ArrayBufferLike> not assignable to BodyInit — convert to new Uint8Array(excelBuffer) for Web Response"
  - "downloadBlobResponse extracted to lib/utils/downloadBlob.ts to keep EstimateEditor under 200-line limit"
  - "Merged duplicate WorkSheet JSX blocks (complex-detail and urethane-detail used identical markup) into one conditional"

patterns-established:
  - "Direct download pattern: fetch POST → res.blob() → URL.createObjectURL → anchor click → URL.revokeObjectURL"
  - "Dual-mode generate route: download=true for client download, download=false (default) for Storage+DB persistence"

requirements-completed: [EXCEL-04]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 05 Plan 04: Excel Download + UI Connection Summary

**엑셀 다운로드 연결 완성: generate route에 download 모드 추가 + EstimateEditor에 엑셀 다운로드 버튼 구현**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-31T08:26:00Z
- **Completed:** 2026-03-31T08:34:00Z
- **Tasks:** 2
- **Files modified:** 2
- **Files created:** 1

## Accomplishments

- Added `download` mode to `POST /api/estimates/[id]/generate`:
  - Parses request body for `{ download?: boolean }`
  - `download: true` returns xlsx binary directly via `new Response(new Uint8Array(excelBuffer), ...)`
  - `download: false` (default) retains existing behavior (Storage upload + JSON response)
- Added `downloadBlobResponse` utility to `lib/utils/downloadBlob.ts` for reusable blob-to-file download
- Added `downloading` state + `handleDownload` callback to `EstimateEditor`
- Added green "엑셀" button in header between 저장 and 이메일 buttons
- Kept `EstimateEditor.tsx` at 193 lines (within 200-line limit) by extracting utility + merging duplicate WorkSheet conditionals

## Task Commits

1. **Task 1: generate route download mode** - `45d3dd3` (feat)
2. **Task 2: EstimateEditor download button** - `c423176` (feat)

## Files Created/Modified

- `lib/utils/downloadBlob.ts` - Created: `downloadBlobResponse(res, filename)` utility
- `app/api/estimates/[id]/generate/route.ts` - Added body parsing + download mode branch
- `components/estimate/EstimateEditor.tsx` - Added `downloading` state, `handleDownload`, 엑셀 button; merged duplicate JSX; imported downloadBlobResponse

## Decisions Made

- `Buffer<ArrayBufferLike>` is not assignable to `BodyInit` (Web `Response` constructor) — must convert via `new Uint8Array(excelBuffer)`.
- `downloadBlobResponse` extracted to a separate utility file to keep `EstimateEditor` within the 200-line CLAUDE.md rule.
- Two identical `WorkSheet` JSX blocks for `complex-detail` and `urethane-detail` were merged into a single conditional — behavior is identical since `activeSheetIndex` already resolves to the correct sheet.

## Deviations from Plan

**1. [Rule 1 - Bug] Buffer not assignable to BodyInit**

- **Found during:** Task 1 — npm run build type error
- **Issue:** `new Response(excelBuffer, ...)` fails because `Buffer<ArrayBufferLike>` is missing URLSearchParams properties required by `BodyInit`
- **Fix:** Wrapped with `new Uint8Array(excelBuffer)` which satisfies the `BodyInit` constraint
- **Files modified:** `app/api/estimates/[id]/generate/route.ts`
- **Commit:** `45d3dd3`

**2. [Rule 2 - Missing functionality] downloadBlobResponse utility extraction**

- **Found during:** Task 2 — file would exceed 200-line CLAUDE.md constraint
- **Issue:** Adding `handleDownload` inline would push EstimateEditor to 221 lines
- **Fix:** Extracted blob download logic to `lib/utils/downloadBlob.ts` + merged duplicate WorkSheet conditionals
- **Files modified:** `components/estimate/EstimateEditor.tsx`, created `lib/utils/downloadBlob.ts`
- **Commit:** `c423176`

## Known Stubs

None — the download pipeline is fully wired: button click → fetch POST with download:true → xlsx binary → browser file save.

## Self-Check

- [ ] Files exist check
- [ ] Commits exist check
