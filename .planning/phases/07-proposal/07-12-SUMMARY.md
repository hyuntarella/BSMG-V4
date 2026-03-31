---
phase: 07-proposal
plan: 12
subsystem: proposal
tags: [proposal, api-routes, supabase-storage, gas-removal]
dependency_graph:
  requires: [07-11]
  provides: [proposal-config-api, proposal-photo-api, proxy-images-api]
  affects: [components/proposal/ProposalEditor.tsx]
tech_stack:
  added: []
  patterns: [supabase-storage-json, multipart-upload, server-side-image-proxy]
key_files:
  created:
    - app/api/proposal/config/route.ts
    - app/api/proposal/photo/route.ts
    - app/api/proxy-images/route.ts
  modified:
    - components/proposal/ProposalEditor.tsx
decisions:
  - Proposal config stored as JSON file in Supabase Storage (proposals bucket) rather than a new DB table (no migration needed)
  - handlePhoto uploads to Storage in addition to base64 local state (dual: local preview + server persistence)
  - proxy-images uses AbortController with 5s timeout per URL; failed URLs return empty base64 (skip pattern)
metrics:
  duration: 5min
  completed: 2026-03-31
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 07 Plan 12: Proposal GAS Replacement Summary

One-liner: Replaced 4 google.script.run calls with Next.js API routes — Supabase Storage config CRUD, photo upload, and server-side image proxy for CORS bypass.

## What Was Built

**3 new API routes:**
- `app/api/proposal/config/route.ts` — GET/POST for proposal config persisted as JSON in Supabase Storage (`proposals/config/proposal-config.json`)
- `app/api/proposal/photo/route.ts` — multipart/form-data upload to Supabase Storage `proposals/photos/` bucket, returns public URL
- `app/api/proxy-images/route.ts` — server-side image fetch with base64 encoding, 5s AbortController timeout per URL, CORS bypass

**ProposalEditor.tsx updates:**
- `proposal_getConfig` → `fetch('/api/proposal/config')` on mount
- `proposal_saveConfig` (×2 in `acc()` and `updateCfg()`) → `fetch POST /api/proposal/config`
- `proposal_savePhoto` → `fetch POST /api/proposal/photo` (fire-and-forget)
- `proposal_savePdf` TODO retained (Plan 14 implements PDF save route)

## GAS Removal Status

| GAS Call | Status |
|---|---|
| `proposal_getConfig()` | Replaced — GET /api/proposal/config |
| `proposal_saveConfig(n)` in acc() | Replaced — POST /api/proposal/config |
| `proposal_saveConfig(n)` in updateCfg() | Replaced — POST /api/proposal/config |
| `proposal_savePhoto(key, res)` | Replaced — POST /api/proposal/photo |
| `proposal_savePdf(b64, fn)` | TODO retained for Plan 14 |

`google.script.run` occurrences in ProposalEditor.tsx: **0** (verified with grep)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `proposal_savePdf` TODO in `generate()` function (line 892): PDF save to Drive not yet wired. Plan 14 will implement `/api/proposal/[id]/pdf` route and replace this.

## Self-Check: PASSED

| Item | Status |
|---|---|
| app/api/proposal/config/route.ts | FOUND |
| app/api/proposal/photo/route.ts | FOUND |
| app/api/proxy-images/route.ts | FOUND |
| google.script.run in ProposalEditor | 0 occurrences |
| Commit 85e63f2 (API routes) | FOUND |
| Commit 5f32c6c (ProposalEditor fetch) | FOUND |
| npm run build | PASSED |
