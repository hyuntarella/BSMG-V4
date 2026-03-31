---
phase: 06-pdf-output
verified: 2026-03-31T00:00:00Z
status: gaps_found
score: 4/4 truths verified (code), 0/2 requirements matched
gaps:
  - truth: "요구사항 ID PDF-01, PDF-02가 REQUIREMENTS.md에 존재한다"
    status: failed
    reason: "PLANs에서 requirements: [PDF-01], [PDF-02]를 선언했으나 REQUIREMENTS.md에 해당 ID가 없음. 실제 해당 기능의 requirement IDs는 OUT-04 (PDF 생성 및 다운로드) 및 OUT-05 (Google Drive 자동 업로드)이며, 둘 다 v2 Requirements (deferred)로 분류되어 있음. 이 phase의 PLANs은 v2 deferred 요구사항을 v1 단계에서 구현했으나 Traceability 테이블에 반영되지 않음."
    artifacts:
      - path: ".planning/phases/06-pdf-output/09-PLAN.md"
        issue: "requirements: [PDF-01] — REQUIREMENTS.md에 없는 ID"
      - path: ".planning/phases/06-pdf-output/10-PLAN.md"
        issue: "requirements: [PDF-02] — REQUIREMENTS.md에 없는 ID"
    missing:
      - "REQUIREMENTS.md의 Traceability 테이블에 OUT-04 → Phase 06 (또는 9-10), Complete 행 추가"
      - "REQUIREMENTS.md의 OUT-05 → Phase 06, Complete 행 추가"
      - "OUT-04, OUT-05를 v2 Requirements에서 v1 Requirements로 이동 (이미 구현 완료)"
      - "PLANs의 requirements 필드를 PDF-01/PDF-02에서 OUT-04/OUT-05로 수정 (또는 REQUIREMENTS.md에 PDF-01/PDF-02 alias 추가)"
human_verification:
  - test: "Vercel 배포 환경에서 POST /api/estimates/[id]/pdf 실제 호출"
    expected: "PDF 바이너리 반환 (application/pdf Content-Type, 견적서 내용 포함)"
    why_human: "puppeteer-core + chromium-min 바이너리 다운로드는 Vercel 환경에서만 동작 확인 가능. 로컬에서는 chromium 원격 URL 접근 불가"
  - test: "PDF 버튼 클릭 후 파일 다운로드 확인"
    expected: "브라우저에 견적서_[관리번호].pdf 파일이 저장됨"
    why_human: "blob download는 브라우저 실행 없이 검증 불가"
---

# Phase 06: PDF 출력 Verification Report

**Phase Goal:** 견적서 PDF 출력 — PDF 생성 API + Storage/Drive 업로드 + 다운로드 버튼
**Verified:** 2026-03-31
**Status:** gaps_found — 코드 구현은 완전하나 요구사항 ID 추적 불일치
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | POST /api/estimates/[id]/pdf 호출 시 PDF 바이너리가 반환된다 | ✓ VERIFIED | `app/api/estimates/[id]/pdf/route.ts` L106: `new NextResponse(new Uint8Array(pdfBuffer), { headers: { 'Content-Type': 'application/pdf' } })` |
| 2 | PDF에 견적서 표지 + 시트별 공종 테이블이 포함된다 | ✓ VERIFIED | `lib/pdf/generatePdf.ts`: `generateEstimateHtml`이 표지(cover div) + 시트별 테이블을 렌더링하며, `generatePdfBuffer`가 Puppeteer로 변환 |
| 3 | 저장 시 PDF가 Supabase Storage + Google Drive에 업로드된다 | ✓ VERIFIED | `app/api/estimates/[id]/generate/route.ts` L148-159: Supabase Storage 업로드. L177-196: Drive에 Excel + PDF 병렬 업로드 (`Promise.all`) |
| 4 | 견적서 편집 화면에서 PDF 다운로드 버튼을 누르면 PDF가 다운로드된다 | ✓ VERIFIED | `components/estimate/EstimateEditor.tsx` L86-102: `handlePdfDownload` fetch → blob → `URL.createObjectURL` → `<a>.click()`. L169-174: 버튼 JSX |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/estimates/[id]/pdf/route.ts` | 견적서 PDF 생성 API | ✓ VERIFIED | 117줄. 데이터 로드 → HTML → PDF → NextResponse(application/pdf). maxDuration=30 |
| `lib/pdf/generatePdf.ts` | HTML 생성 + PDF 생성 함수 | ✓ VERIFIED | 147줄. `generateEstimateHtml` + `generatePdfBuffer` 모두 export |
| `app/api/estimates/[id]/generate/route.ts` | 기존 generate route에 PDF 생성+업로드 추가 | ✓ VERIFIED | 226줄. `generatePdfBuffer` import, Storage 업로드, Drive 병렬 업로드, `pdf_url` DB 저장 |
| `components/estimate/EstimateEditor.tsx` | PDF 다운로드 버튼 | ✓ VERIFIED | `pdfDownloading` state, `handlePdfDownload` callback, PDF 버튼 JSX |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/estimates/[id]/pdf/route.ts` | `lib/pdf/generatePdf.ts` | `generatePdfBuffer` import | ✓ WIRED | L3: `import { generateEstimateHtml, generatePdfBuffer } from '@/lib/pdf/generatePdf'` |
| `app/api/estimates/[id]/generate/route.ts` | `lib/pdf/generatePdf.ts` | `generatePdfBuffer` import | ✓ WIRED | L4: `import { generateEstimateHtml, generatePdfBuffer } from '@/lib/pdf/generatePdf'` |
| `components/estimate/EstimateEditor.tsx` | `/api/estimates/[id]/pdf` | fetch call on button click | ✓ WIRED | L90: `fetch('/api/estimates/${estimate.id}/pdf', { method: 'POST' })` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `pdf/route.ts` | `estimateRow`, `sheetRows`, `itemRows` | Supabase DB query (service role) | Yes — `.from('estimates').select('*')` + sheets + items | ✓ FLOWING |
| `generate/route.ts` | `pdfBuffer` | `generatePdfBuffer(html)` where `html` comes from real estimate data | Yes — real DB rows → HTML → PDF | ✓ FLOWING |
| `EstimateEditor.tsx` | `blob` | POST response from `/api/estimates/[id]/pdf` | Yes — live API call | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build passes without errors | `npm run build` | Clean build, `/api/estimates/[id]/pdf` route present in output | ✓ PASS |
| `generatePdfBuffer` export exists | `grep -n "export async function generatePdfBuffer" lib/pdf/generatePdf.ts` | L17: found | ✓ PASS |
| PDF route exports POST handler | `grep -n "export async function POST" app/api/estimates/[id]/pdf/route.ts` | L18: found | ✓ PASS |
| PDF route has maxDuration | `grep -n "maxDuration" app/api/estimates/[id]/pdf/route.ts` | L7: `export const maxDuration = 30` | ✓ PASS |
| generate route maxDuration=60 | `grep -n "maxDuration" app/api/estimates/[id]/generate/route.ts` | L9: `export const maxDuration = 60` | ✓ PASS |
| puppeteer-core in package.json | `grep puppeteer-core package.json` | `"puppeteer-core": "^24.40.0"` | ✓ PASS |
| @sparticuz/chromium-min in package.json | `grep chromium-min package.json` | `"@sparticuz/chromium-min": "^143.0.4"` | ✓ PASS |
| Actual PDF call in generate route (Vercel serverless) | Runtime-only | Cannot verify without deployed environment | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PDF-01 | 09-PLAN.md | REQUIREMENTS.md에 없음 | ✗ ORPHANED | `PDF-01`이라는 ID가 REQUIREMENTS.md 어디에도 정의되지 않음 |
| PDF-02 | 10-PLAN.md | REQUIREMENTS.md에 없음 | ✗ ORPHANED | `PDF-02`이라는 ID가 REQUIREMENTS.md 어디에도 정의되지 않음 |
| OUT-04 | (unmapped) | PDF 생성 및 다운로드 | ✓ SATISFIED | 코드 구현 완료. REQUIREMENTS.md L56에 정의됨 (v2 deferred). Traceability 테이블에 미반영 |
| OUT-05 | (unmapped) | Google Drive 자동 업로드 | ✓ SATISFIED | `generate/route.ts`에서 Drive 업로드 구현. REQUIREMENTS.md L57에 정의됨 (v2 deferred). Traceability 미반영 |

**Cross-reference 결과:**
- PLANs에서 선언한 `PDF-01`, `PDF-02`는 REQUIREMENTS.md에 존재하지 않는 ID
- 실제 해당 기능에 대응하는 ID는 `OUT-04` (PDF 다운로드), `OUT-05` (Drive 업로드)
- 두 요구사항 모두 v2 Requirements(deferred)로 분류되어 있으나 이미 구현 완료됨
- Traceability 테이블에 Phase 06 매핑이 누락됨
- 프롬프트에서 언급한 `EXCEL-05`, `EXCEL-06`은 REQUIREMENTS.md에 존재하지 않는 ID (관련 기능은 OUT-03, OUT-04, OUT-05로 정의됨)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `lib/pdf/generatePdf.ts` | 46 | JSDoc 주석이 구현과 불일치 (함수 주석에 "HTML 생성만 담당"이라고 쓰여 있으나 `generatePdfBuffer` 추가 후 정확하지 않음) | ℹ️ Info | JSDoc 업데이트 필요 (기능에는 영향 없음) |

### Human Verification Required

#### 1. Vercel 배포 환경 PDF 생성 테스트

**Test:** Vercel에 배포된 환경에서 실제 견적서 ID로 `POST /api/estimates/[id]/pdf` 호출
**Expected:** `application/pdf` Content-Type의 응답, 견적서 내용이 포함된 PDF 반환
**Why human:** `@sparticuz/chromium-min`의 원격 바이너리 URL(`CHROMIUM_REMOTE_URL`)은 Vercel 서버리스에서만 실행됨. 로컬에서는 chromium 바이너리 다운로드가 동작하지 않을 수 있어 실제 PDF 생성 여부를 자동으로 검증할 수 없음

#### 2. 브라우저에서 PDF 다운로드 버튼 동작 확인

**Test:** 견적서 편집 화면에서 "PDF" 버튼 클릭
**Expected:** `견적서_[관리번호].pdf` 파일이 브라우저를 통해 다운로드됨
**Why human:** `URL.createObjectURL` + `<a>.click()` 패턴은 DOM 실행 환경 필요. 정적 코드 분석으로 동작 확인 불가

#### 3. 저장(generate) 시 PDF Storage/Drive 업로드 확인

**Test:** 저장 버튼 클릭 후 Supabase Storage의 `estimates/{mgmtNo}/견적서_{mgmtNo}.pdf` 파일 존재 확인 + Google Drive 폴더 확인
**Expected:** Storage와 Drive 모두에 PDF 파일이 업로드됨
**Why human:** Supabase Storage와 Google Drive는 외부 서비스 — 실제 업로드 결과는 런타임에서만 확인 가능

### Gaps Summary

코드 구현은 4/4 truths 모두 완전하게 달성되었다. `lib/pdf/generatePdf.ts`의 `generatePdfBuffer`는 실제 Puppeteer + chromium-min으로 PDF를 생성하고, PDF route는 실제 데이터를 로드하여 반환하며, generate route는 저장 시 PDF를 Supabase와 Drive에 업로드하고, EstimateEditor에는 실제 fetch를 수행하는 다운로드 버튼이 있다.

유일한 갭은 **요구사항 추적 불일치**다. PLANs에서 선언한 `PDF-01`, `PDF-02`라는 requirement ID가 REQUIREMENTS.md에 존재하지 않는다. 실제 이 기능에 해당하는 요구사항은 `OUT-04` (PDF 생성 및 다운로드)와 `OUT-05` (Google Drive 자동 업로드)인데, 이 두 항목은 REQUIREMENTS.md에서 v2 Requirements (deferred)로 분류되어 있고 Traceability 테이블에도 반영되어 있지 않다. 코드가 먼저 구현되었으나 요구사항 문서가 업데이트되지 않은 상태다.

이 갭은 기능 동작에는 영향을 주지 않으며, REQUIREMENTS.md의 Traceability 업데이트와 OUT-04/OUT-05를 완료 상태로 기록하는 문서 작업으로 해결된다.

---

_Verified: 2026-03-31_
_Verifier: Claude (gsd-verifier)_
