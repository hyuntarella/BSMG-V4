---
phase: 06-pdf-output
plan: 09
subsystem: pdf-generation
tags: [pdf, puppeteer, serverless, api]
dependency_graph:
  requires: [lib/pdf/generatePdf.ts, app/api/estimates/[id]/generate/route.ts]
  provides: [app/api/estimates/[id]/pdf/route.ts, generatePdfBuffer]
  affects: [estimate output pipeline]
tech_stack:
  added: [puppeteer-core@24.40.0, "@sparticuz/chromium-min@143.0.4"]
  patterns: [serverless-pdf-generation, buffer-to-uint8array]
key_files:
  created:
    - app/api/estimates/[id]/pdf/route.ts
  modified:
    - lib/pdf/generatePdf.ts
    - package.json
    - package-lock.json
decisions:
  - "chromium-min does not expose defaultViewport — use hardcoded A4 dimensions (1240x1754)"
  - "Buffer must be wrapped in Uint8Array for BodyInit compatibility in NextResponse"
  - "CHROMIUM_REMOTE_URL pinned to v131.0.0 stable release for reproducible builds"
metrics:
  duration: 6m
  completed: 2026-03-31
  tasks_completed: 2
  files_changed: 4
---

# Phase 06 Plan 09: PDF Generation API Summary

puppeteer-core + @sparticuz/chromium-min으로 Vercel 서버리스 PDF 생성 구현. POST /api/estimates/[id]/pdf 엔드포인트가 견적서 데이터를 로드하고 A4 PDF binary를 반환한다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | puppeteer-core + chromium-min 설치 및 generatePdfBuffer 함수 | e8f435b | lib/pdf/generatePdf.ts, package.json |
| 2 | POST /api/estimates/[id]/pdf 엔드포인트 | cfa25b2 | app/api/estimates/[id]/pdf/route.ts |

## What Was Built

### generatePdfBuffer (lib/pdf/generatePdf.ts)

HTML 문자열을 받아 Puppeteer + 서버리스 Chromium으로 PDF Buffer를 생성하는 함수. `@sparticuz/chromium-min`의 원격 바이너리 URL을 사용하여 Vercel 서버리스 환경에서 동작.

### POST /api/estimates/[id]/pdf (app/api/estimates/[id]/pdf/route.ts)

generate/route.ts와 동일한 데이터 로드 패턴으로 견적서 + 시트 + 아이템을 조립한 후:
1. `generateEstimateHtml(estimate)` → HTML 문자열
2. `generatePdfBuffer(html)` → PDF Buffer
3. `application/pdf` Content-Type으로 반환

`maxDuration = 30`으로 Vercel 서버리스 타임아웃 30초 확보.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] chromium-min has no defaultViewport property**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** `@sparticuz/chromium-min` exposes only `args` and `executablePath()` — no `defaultViewport` unlike the full `@sparticuz/chromium` package
- **Fix:** Replaced `chromium.default.defaultViewport` with hardcoded `{ width: 1240, height: 1754 }` (A4 at 150dpi)
- **Files modified:** lib/pdf/generatePdf.ts
- **Commit:** e8f435b

**2. [Rule 1 - Bug] Buffer not assignable to BodyInit in NextResponse**
- **Found during:** Task 2 build
- **Issue:** `Buffer<ArrayBufferLike>` is not directly assignable to `BodyInit` in Next.js — same issue previously fixed in Excel route
- **Fix:** Wrapped pdfBuffer in `new Uint8Array(pdfBuffer)` before passing to NextResponse
- **Files modified:** app/api/estimates/[id]/pdf/route.ts
- **Commit:** cfa25b2

## Known Stubs

None — the endpoint returns actual PDF binary from live Chromium rendering.

## Self-Check: PASSED
