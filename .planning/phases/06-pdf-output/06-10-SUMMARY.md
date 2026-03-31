---
phase: 06-pdf-output
plan: 10
subsystem: pdf-upload-download
tags: [pdf, storage, google-drive, ui]
dependency_graph:
  requires: [lib/pdf/generatePdf.ts, app/api/estimates/[id]/generate/route.ts, app/api/estimates/[id]/pdf/route.ts]
  provides: [pdf-upload-to-storage, pdf-upload-to-drive, pdf-download-button]
  affects: [estimate save pipeline, EstimateEditor UI]
tech_stack:
  added: []
  patterns: [blob-download, parallel-drive-upload, supabase-storage-upload]
key_files:
  created: []
  modified:
    - app/api/estimates/[id]/generate/route.ts
    - components/estimate/EstimateEditor.tsx
decisions:
  - "PDF uploaded to Supabase Storage alongside Excel on every save — pdf_url now points to real PDF not HTML"
  - "Excel + PDF uploaded to Google Drive in parallel via Promise.all to minimize latency"
  - "maxDuration raised to 60s to accommodate both Excel and PDF generation"
  - "PDF download button uses /api/estimates/[id]/pdf (on-demand) not the saved Storage URL — allows download before save"
metrics:
  duration: 5m
  completed: 2026-03-31
  tasks_completed: 2
  files_changed: 2
---

# Phase 06 Plan 10: PDF Upload + Download Button Summary

저장 시 PDF를 Supabase Storage + Google Drive에 업로드하고, EstimateEditor에 PDF 다운로드 버튼을 추가했다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | generate route에 PDF 생성 + 업로드 추가 | cc22f82 | app/api/estimates/[id]/generate/route.ts |
| 2 | EstimateEditor에 PDF 다운로드 버튼 추가 | 4907eff | components/estimate/EstimateEditor.tsx |

## What Was Built

### generate route PDF integration (app/api/estimates/[id]/generate/route.ts)

- `generatePdfBuffer` import added from `@/lib/pdf/generatePdf`
- After HTML generation, `generatePdfBuffer(html)` creates PDF Buffer
- PDF uploaded to Supabase Storage at `estimates/{mgmtNo}/견적서_{mgmtNo}.pdf`
- `pdf_url` in DB now points to actual PDF (previously pointed to HTML)
- Google Drive block updated: Excel + PDF uploaded in parallel via `Promise.all([excelDrivePromise, pdfDrivePromise])`
- `maxDuration = 60` set (was unset, defaulting to 10s which could timeout)

### PDF download button (components/estimate/EstimateEditor.tsx)

- `pdfDownloading` state for loading indicator
- `handlePdfDownload`: POST `/api/estimates/[id]/pdf` → blob → `URL.createObjectURL` → `<a>` click download
- PDF button placed between 엑셀 and 이메일 buttons with `border-brand` outline style
- Shows "생성 중..." when downloading, disabled when no `estimate.id` or while downloading

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
