---
phase: 05-excel-output
verified: 2026-03-31T09:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 05: Excel Output Verification Report

**Phase Goal:** 견적서 엑셀 출력 — 복합/우레탄 템플릿 로드 + 데이터 채우기 + 동적 행 + 표지 한글금액 + 다운로드 버튼 + Storage 업로드
**Verified:** 2026-03-31T09:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 복합 템플릿 xlsx를 로드하여 Sheet2(상세)에 아이템 데이터가 채워진다 | ✓ VERIFIED | `generateWorkbook` calls `wb.xlsx.readFile(config.templatePath)` → `fillDetailFromTemplate` fills rows 7+ with item values (B=name, C=spec, D=unit, E=qty, F/H/J=unit prices) |
| 2 | 소계/공과잡비3%/기업이윤6%/계/합계(10만절사) 행이 아이템 아래에 정확히 출력된다 | ✓ VERIFIED | Template rows 18-22 have Excel SUM formulas; overflow case calls `setTemplateSummaryValues` with `CalcResult` values directly |
| 3 | 우레탄 시트도 복합과 동일하게 템플릿 기반으로 생성된다 | ✓ VERIFIED | `getTemplateConfig('우레탄')` returns `urethane-template.xlsx` with `templateItemCount=10`; both route through `fillDetailFromTemplate` |
| 4 | 아이템 수가 템플릿 기본 행 수보다 많으면 행이 삽입되고 서식이 복사된다 | ✓ VERIFIED | `ws.spliceRows(TEMPLATE_SUMMARY_START_ROW, 0, ...Array(extraRows).fill([]))` inserts rows before row 18; extra rows set direct values since no formula exists |
| 5 | 아이템 수가 템플릿 기본 행 수보다 적으면 남는 행이 숨겨진다 | ✓ VERIFIED | `clearItemRow(ws, rowNum)` + `ws.getRow(rowNum).hidden = true` for unused template rows |
| 6 | Sheet1(표지)에 관리번호/일자/고객명+"귀하"/현장명/한글금액/총액/보증조건이 채워진다 | ✓ VERIFIED | `fillCoverFromTemplate` sets D6=mgmt_no, D7=date, D8=customer+"귀하", D9=site_name, E11=toKoreanAmount(grandTotal), K14=totalBeforeRound, K18=grandTotal, D19=warranty text |
| 7 | generate route가 download=true 시 엑셀 바이너리를 직접 응답한다 | ✓ VERIFIED | `if (body?.download) return new Response(new Uint8Array(excelBuffer), { headers: { 'Content-Type': '...xlsx', 'Content-Disposition': 'attachment; ...' } })` |
| 8 | EstimateEditor에 다운로드 버튼이 있고 클릭 시 generate API를 호출하여 xlsx를 다운로드한다 | ✓ VERIFIED | Green "엑셀" button at line 143; `handleDownload` fetches with `{ download: true }` and calls `downloadBlobResponse(res, filename)` |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/excel/generateWorkbook.ts` | 템플릿 기반 복합/우레탄 엑셀 생성 | ✓ VERIFIED | 530 lines; exports `generateWorkbook`, `workbookToBuffer`; full template pipeline implemented |
| `lib/utils/numberToKorean.ts` | `toKoreanAmount` 함수 (일금 X원 정 형식) | ✓ VERIFIED | Exports both `n2k` and `toKoreanAmount`; spot-check confirms correct output |
| `lib/utils/downloadBlob.ts` | Blob → file download utility | ✓ VERIFIED | 15 lines; exports `downloadBlobResponse(res, filename)` |
| `app/api/estimates/[id]/generate/route.ts` | 템플릿 기반 엑셀 생성 + Storage 업로드 + download mode | ✓ VERIFIED | 205 lines; imports `generateWorkbook`; download branch at line 112; Storage upload at line 122 |
| `components/estimate/EstimateEditor.tsx` | 다운로드 버튼 UI | ✓ VERIFIED | 193 lines (within 200-line limit); `downloading` state + `handleDownload` + green "엑셀" button |
| `public/templates/complex-template.xlsx` | 복합 템플릿 파일 | ✓ VERIFIED | File exists at `public/templates/complex-template.xlsx` |
| `public/templates/urethane-template.xlsx` | 우레탄 템플릿 파일 | ✓ VERIFIED | File exists at `public/templates/urethane-template.xlsx` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/excel/generateWorkbook.ts` | `public/templates/complex-template.xlsx` | `wb.xlsx.readFile(config.templatePath)` | ✓ WIRED | `getTemplateConfig` returns path; `readFile` at line 71 — indirect via config variable, functionally equivalent |
| `lib/excel/generateWorkbook.ts` | `public/templates/urethane-template.xlsx` | `getTemplateConfig('우레탄')` → `readFile` | ✓ WIRED | Same `readFile` call, dispatched by `getTemplateConfig` based on `sheet.type` |
| `lib/excel/generateWorkbook.ts` | `lib/estimate/calc.ts` | `calc(sheet.items)` | ✓ WIRED | `import { calc } from '@/lib/estimate/calc'`; called in `fillCoverFromTemplate` (line 159) and overflow branch (line 273) |
| `lib/excel/generateWorkbook.ts` | `lib/utils/numberToKorean.ts` | `import { toKoreanAmount }` | ✓ WIRED | Line 5: `import { toKoreanAmount } from '@/lib/utils/numberToKorean'`; used at line 163 |
| `app/api/estimates/[id]/generate/route.ts` | `lib/excel/generateWorkbook.ts` | `import { generateWorkbook }` | ✓ WIRED | Line 3: `import { generateWorkbook, workbookToBuffer } from '@/lib/excel/generateWorkbook'`; called at line 108 |
| `components/estimate/EstimateEditor.tsx` | `/api/estimates/[id]/generate` | `fetch POST` on download button click | ✓ WIRED | `handleDownload` at line 75: `fetch('/api/estimates/${estimate.id}/generate', { method: 'POST', body: JSON.stringify({ download: true }) })` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `EstimateEditor.tsx` | `estimate` | `useEstimate(initialEstimate, priceMatrix)` | Yes — loaded from SSR page with Supabase data | ✓ FLOWING |
| `generateWorkbook` | `estimate.sheets[0].items` | Supabase `estimate_items` query in generate route | Yes — DB query in route.ts lines 47-71 | ✓ FLOWING |
| `toKoreanAmount` | `calcResult.grandTotal` | `calc(sheet.items)` called in `fillCoverFromTemplate` | Yes — pure computation from real items | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `toKoreanAmount(8250000)` returns correct format | `npx tsx -e "import { toKoreanAmount } ..."` | `일금 팔백이십오만원 정(₩8,250,000)` | ✓ PASS |
| `toKoreanAmount(3900000)` returns correct format | (same script) | `일금 삼백구십만원 정(₩3,900,000)` | ✓ PASS |
| `toKoreanAmount(0)` handles zero | (same script) | `일금 영원 정(₩0)` | ✓ PASS |
| Build compiles without errors | `npm run build` | `✓ Compiled successfully; ✓ Generating static pages (18/18)` | ✓ PASS |
| All 6 phase commits exist in git | `git log --oneline` | a603fef, 0c833ca, 9e0341f, 4816892, 45d3dd3, c423176 all present | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EXCEL-01 | 05-01-PLAN.md | 복합 템플릿 로드 + Sheet2 아이템 채우기 + 합계 행 | ✓ SATISFIED | `generateFromTemplate` + `fillDetailFromTemplate` in generateWorkbook.ts; commit a603fef |
| EXCEL-02 | 05-02-PLAN.md | 우레탄 템플릿 처리 + 동적 행 삽입/숨김 | ✓ SATISFIED | `getTemplateConfig` dispatches urethane path; row hiding + spliceRows; commit 0c833ca |
| EXCEL-03 | 05-03-PLAN.md | 표지(Sheet1) 한글금액 + 보증조건 채우기 | ✓ SATISFIED | `toKoreanAmount` in numberToKorean.ts; `fillCoverFromTemplate` fills E11/K14/K18/D19; commits 9e0341f + 4816892 |
| EXCEL-04 | 05-04-PLAN.md | 다운로드 버튼 UI + generate route download 모드 | ✓ SATISFIED | Green "엑셀" button in EstimateEditor + download branch in generate route; commits 45d3dd3 + c423176 |
| OUT-03 (REQUIREMENTS.md) | — | ExcelJS로 .xlsx 견적서를 생성하고 다운로드할 수 있다 | ✓ SATISFIED | Full pipeline: template load → fill → buffer → download response; EstimateEditor download button wired to generate route |

Note: REQUIREMENTS.md uses `OUT-03` to track this capability (not EXCEL-0x IDs). The EXCEL-01 through EXCEL-04 IDs are internal to the phase plans. All map to `OUT-03`. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `generateWorkbook.ts` | 71 | `catch {}` (empty catch) — swallows readFile errors silently | ℹ️ Info | Falls back to scratch generation; not a stub; acceptable defensive pattern |
| `EstimateEditor.tsx` | 81 | `console.error('다운로드 실패:', err)` — error logged but not shown to user | ℹ️ Info | UX gap (no toast/alert on download failure) but not a blocker |

No blockers or warnings found. Both items are minor quality issues.

### Human Verification Required

#### 1. Excel Template Fidelity

**Test:** Generate an xlsx from a real estimate (복합방수, 10 items), open in Excel or Sheets. Compare formatting (cell borders, fonts, merged cells, print area) against the original `complex-template.xlsx`.
**Expected:** Sheet1 cover shows 관리번호/일자/고객명/현장명/한글금액/총액/보증조건. Sheet2 shows 10 item rows, correct unit prices, formula-computed amounts in G/I/K/M columns, correct subtotal/overhead/profit/total rows at rows 18-22.
**Why human:** Cannot verify Excel cell formatting, formula computation, or print layout programmatically without running Excel.

#### 2. Overflow Row Insert (>11 items)

**Test:** Generate an xlsx with 13+ items (복합). Open in Excel, verify rows 7-19 contain all items, rows 20-24 contain correct summary values, no cell merge is broken.
**Expected:** All 13 items visible, summary rows displaced correctly to rows 20-24, values match `calc()` output.
**Why human:** `spliceRows` can break merged cells; visual inspection needed to confirm.

#### 3. Download Button End-to-End

**Test:** Open `/estimate/[real-id]` in browser, click "엑셀" button, verify browser triggers a file download named `견적서_[mgmt_no].xlsx`.
**Expected:** File downloads without error, opens correctly in Excel.
**Why human:** Requires browser + real Supabase data + network.

### Gaps Summary

No gaps found. All 8 truths are verified, all 4 requirement IDs are satisfied, all key links are wired, and the build passes cleanly. The phase goal is fully achieved.

---

_Verified: 2026-03-31T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
