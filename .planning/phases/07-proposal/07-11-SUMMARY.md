---
phase: 07-proposal
plan: 11
subsystem: proposal
tags: [proposal, porting, react, typescript, css, pdf]
dependency_graph:
  requires: []
  provides: [proposal-page, proposal-editor, proposal-css]
  affects: [navigation]
tech_stack:
  added: [html2canvas, jspdf]
  patterns: [dynamic-import-ssr-false, createPortal, useDraggable]
key_files:
  created:
    - app/(authenticated)/proposal/page.tsx
    - components/proposal/ProposalEditor.tsx
    - app/(authenticated)/proposal/proposal.css
    - components/proposal/proposal.css
  modified:
    - package.json
    - package-lock.json
decisions:
  - html2canvas and jspdf installed as npm packages with dynamic import (browser-only)
  - CSS extracted from style block but base64 fonts preserved inline (649KB + 665KB each)
  - proposal.css placed in both app/proposal/ and components/proposal/ for import resolution
  - google.script.run calls replaced with TODO comments targeting Plan 12
  - createPortal imported from react-dom (not React namespace) for TypeScript compatibility
metrics:
  duration: 35min
  completed: 2026-03-31
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 07 Plan 11: Proposal HTML Port Summary

One-liner: Ported 제안서.html (1.4MB React+Babel) to TypeScript Next.js with SSR-disabled dynamic import, preserving all 5 pages and TODO-marking 6 google.script.run calls for Plan 12 replacement.

## What Was Built

Converted the existing `제안서.html` (Google Apps Script HTML Service) into a Next.js TypeScript component.

**Files created:**
- `app/(authenticated)/proposal/page.tsx` — Server component with SSR-disabled dynamic import
- `components/proposal/ProposalEditor.tsx` — Full 'use client' component (1175 lines, all 5 pages)
- `app/(authenticated)/proposal/proposal.css` — Extracted CSS from HTML style block (220 lines)
- `components/proposal/proposal.css` — CSS copy for relative import from component

**Dependencies installed:**
- `html2canvas` — Used for PDF generation canvas capture
- `jspdf` — Used for PDF assembly and save

## Architecture

```
page.tsx (server, SSR:false)
  └── ProposalEditor.tsx (client)
       ├── EF (EditField overlay)
       ├── CC (CatCombo dropdown)
       ├── MultiCC (multi-select combo)
       ├── ExpertEditor (template editor)
       ├── PhotoSlot (draggable photo)
       ├── Logo (brand mark)
       ├── Settings (config panel)
       └── CatListEditor (settings sub-component)
```

**5 pages rendered:**
- P1: Cover (address, title, company info, seal)
- P2: Diagnosis (photo slots A/B/C, problem/reason multi-select)
- P3: Solution (method detail table, cases, effects)
- P4: Pricing (3-plan grid + expert opinion)
- P5: Principles (4 commitments + brand logos)

## Google Script Calls (TODO for Plan 12)

All 6 `google.script.run` calls replaced with TODO comments:

| Original GAS call | Location | Plan 12 replacement |
|---|---|---|
| `proposal_getConfig()` | useEffect on mount | GET /api/proposals/config |
| `proposal_saveConfig(n)` (×2) | acc(), updateCfg() | POST /api/proposals/config |
| `proposal_savePhoto(key, res)` | handlePhoto() | POST /api/proposals/photo |
| `proposal_proxyImages(urls)` | generate() | Next.js proxies (CORS) |
| `proposal_savePdf(b64, fn)` | generate() | POST /api/proposals/[id]/pdf |

## Deviations from Plan

**[Rule 3 - Blocking Issue] Install html2canvas and jspdf**
- Found during: Task 2
- Issue: `import('html2canvas')` and `import('jspdf')` dynamic imports resolved but packages not installed
- Fix: `npm install html2canvas jspdf`
- Files modified: package.json, package-lock.json
- Commit: b35bca4

**[Rule 1 - Bug] React.createPortal → createPortal from react-dom**
- Found during: Task 2
- Issue: `React.createPortal` does not exist in `@types/react` (TypeScript strict)
- Fix: `import { createPortal } from 'react-dom'`
- Files modified: ProposalEditor.tsx
- Commit: b35bca4

**[Scope] img warnings not converted to next/image**
- This is a proposal printing component — html2canvas captures DOM as-is
- next/image inserts wrapper divs that would break PDF pixel layout
- All <img> elements are intentionally kept as native HTML img tags

## Known Stubs

None — all data is wired from constants (MDB, P5P, BRANDS). The google.script.run stubs are intentional and documented for Plan 12.

## Self-Check: PASSED

All files verified present. All commits verified in git log.

| Item | Status |
|---|---|
| app/(authenticated)/proposal/page.tsx | FOUND |
| components/proposal/ProposalEditor.tsx | FOUND |
| app/(authenticated)/proposal/proposal.css | FOUND |
| Commit 905d3e6 (CSS) | FOUND |
| Commit b35bca4 (TypeScript) | FOUND |
| npm run build | PASSED |
