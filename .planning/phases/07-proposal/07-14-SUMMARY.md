---
phase: 07-proposal
plan: 14
subsystem: proposal-pdf-storage
tags: [pdf, storage, google-drive, api-route, gas-removal]
dependency_graph:
  requires: [07-12]
  provides: [제안서 PDF Storage+Drive 저장, GAS 의존 완전 제거]
  affects: [app/api/proposal/pdf/route.ts, components/proposal/ProposalEditor.tsx]
tech_stack:
  added: []
  patterns: [base64-to-buffer, Supabase Storage upsert, Google Drive upload, fetch POST]
key_files:
  created:
    - app/api/proposal/pdf/route.ts
  modified:
    - components/proposal/ProposalEditor.tsx
decisions:
  - "PDF 저장 실패 시 로컬 다운로드는 계속 진행 (try/catch + console.error, alert 없음) — 저장 실패가 사용자 워크플로우를 막지 않도록"
  - "Drive 업로드 타임아웃 10초 (generate/route.ts의 20초 대비 절반) — 제안서는 단일 파일이므로 더 짧게"
metrics:
  duration_seconds: 65
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
requirements: [PROP-04]
---

# Phase 07 Plan 14: 제안서 PDF Storage+Drive 저장 Summary

제안서 PDF를 Supabase Storage와 Google Drive에 저장하는 API route를 생성하고, ProposalEditor의 TODO를 실제 API 호출로 교체하여 GAS 의존을 완전히 제거했다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | POST /api/proposal/pdf — base64 PDF를 Storage + Drive에 저장 | 4168453 | app/api/proposal/pdf/route.ts |
| 2 | ProposalEditor에서 proposal_savePdf를 API 호출로 교체 | 5ab2ccd | components/proposal/ProposalEditor.tsx |

## Changes Made

### Task 1 — app/api/proposal/pdf/route.ts (신규)

- `ProposalPdfRequest` 인터페이스: `pdfBase64`, `fileName`
- base64 → Buffer 변환 (`data:application/pdf;base64,` prefix 제거)
- Supabase Storage `proposals` 버킷에 `pdfs/{fileName}` 경로로 업로드 (upsert: true)
- Google Drive `getProposalFolderId()` 폴더에 선택적 업로드 (10초 타임아웃, 실패 시 무시)
- 응답: `{ success: true, storage_url, drive_url? }`
- `maxDuration = 30` (서버리스 타임아웃)

### Task 2 — components/proposal/ProposalEditor.tsx

- TODO 주석 제거
- `pdf.output('datauristring')`으로 base64 추출
- `POST /api/proposal/pdf` 호출 (try/catch — 저장 실패 시 다운로드는 계속 진행)
- `google.script.run` 문자열 0개 확인

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- app/api/proposal/pdf/route.ts: FOUND
- components/proposal/ProposalEditor.tsx: FOUND
- Commit 4168453: FOUND
- Commit 5ab2ccd: FOUND
- google.script.run in ProposalEditor.tsx: 0 occurrences
- Build: PASSED
