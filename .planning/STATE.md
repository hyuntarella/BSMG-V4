---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 08-manual-edit/21-PLAN.md
last_updated: "2026-03-31T10:28:03.469Z"
last_activity: 2026-03-31
progress:
  total_phases: 12
  completed_phases: 6
  total_plans: 53
  completed_plans: 31
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** 음성 한마디로 견적서가 완성된다. 터치 0회가 목표.
**Current focus:** Phase 08 — manual-edit

## Current Position

Phase: 09
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-03-31

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-voice-pipeline P01 | 8 | 1 tasks | 2 files |
| Phase 01-voice-pipeline P02 | 15 | 2 tasks | 1 files |
| Phase 02-voice-edit-loop P01 | 45 | 2 tasks | 6 files |
| Phase 02-voice-edit-loop P02 | 25 | 2 tasks | 4 files |
| Phase 02-voice-edit-loop P04a | 4 | 4 tasks | 4 files |
| Phase 02 P05b | 2 | 2 tasks | 3 files |
| Phase 02-voice-edit-loop P06b | 5 | 2 tasks | 2 files |
| Phase 02-voice-edit-loop P07b | 8 | 3 tasks | 4 files |
| Phase 05-excel-output P01 | 15 | 1 tasks | 1 files |
| Phase 05-excel-output P02 | 8 | 2 tasks | 1 files |
| Phase 05-excel-output P03 | 8 | 2 tasks | 2 files |
| Phase 05-excel-output P04 | 8 | 2 tasks | 3 files |
| Phase 06-pdf-output P09 | 6 | 2 tasks | 4 files |
| Phase 06-pdf-output P10 | 5 | 2 tasks | 2 files |
| Phase 07-proposal P11 | 35 | 2 tasks | 4 files |
| Phase 07-proposal P12 | 5 | 2 tasks | 4 files |
| Phase 07-proposal P13 | 152 | 2 tasks | 2 files |
| Phase 07-proposal P14 | 65 | 2 tasks | 2 files |
| Phase 08-manual-edit P19 | 3 | 1 tasks | 0 files |
| Phase 08-manual-edit P15 | 15 | 3 tasks | 4 files |
| Phase 08-manual-edit P16 | 5 | 2 tasks | 3 files |
| Phase 08-manual-edit P17 | 5 | 2 tasks | 3 files |
| Phase 08-manual-edit P18 | 3 | 1 tasks | 2 files |
| Phase 08-manual-edit P20 | 4 | 2 tasks | 3 files |
| Phase 08-manual-edit P22 | 10 | 1 tasks | 1 files |
| Phase 08-manual-edit P21 | 10 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Brownfield: System has ~3,400 lines of existing code. Phases fix broken connections, not add new features.
- Fix order mandatory: Phase 1 (pipeline) → Phase 2 (modify) → Phase 3 (save). Cannot reorder.
- AutoSave concern: Current delete-all + re-insert strategy is O(n²). Address in Phase 3 with upsert-by-id.
- Google Drive upload silently fails — surfaced in Phase 5 when Excel output is implemented.
- [Phase 01-voice-pipeline]: Use flowActive useState mirror (not voiceFlowRef.current.isActive) so skipLlm prop triggers React re-render updating skipLlmRef inside useVoice
- [Phase 01-voice-pipeline]: Compute grand_total inside onComplete via buildItems() instead of reading estimate.sheets — setState is async so sheets[].grand_total would be stale at callback time
- [Phase 02-voice-edit-loop]: useEstimateVoice uses voicePlayTtsRef pattern to avoid circular dependency between handleVoiceCommands and voice.playTts
- [Phase 02-voice-edit-loop]: onSttText returns boolean to short-circuit LLM pipeline for 그만/종료 detection in edit mode
- [Phase 02-voice-edit-loop]: pendingConfirm uses both useState (reactive skipLlm) + Ref (always-fresh callback) — dual mechanism defends against render timing race in medium confidence confirm loop
- [Phase 02-voice-edit-loop]: exitEditMode is useCallback in useVoiceEditMode so VAD useEffect dependency array works without stale closure
- [Phase 02-voice-edit-loop]: vitest over jest for native TypeScript/ESM support and faster startup
- [Phase 02]: audio.onerror added to playTts for status recovery on TTS failure
- [Phase 02-voice-edit-loop]: summaryKeyword check placed before voiceFlow/LLM in onSttText — immediate TTS bypass for status queries
- [Phase 02-voice-edit-loop]: setInterval(100ms) over requestAnimationFrame for VAD: works when tab is inactive
- [Phase 02-voice-edit-loop]: VAD reuses recording stream via streamRef: eliminates dual getUserMedia and Galaxy Tab permission conflicts
- [Phase 05-excel-output]: Template cells B,C,D,E,F,H,J filled; G,I,K,M formulas left intact to auto-calculate amounts in complex-template.xlsx
- [Phase 05-excel-output]: getTemplateConfig() dispatches to urethane-template.xlsx (10 items) vs complex-template.xlsx (11 items) based on sheet.type
- [Phase 05-excel-output]: Unused template rows hidden (ws.getRow.hidden=true) rather than just cleared — makes rows invisible in Excel
- [Phase 05-excel-output]: E11 NUMBERSTRING() formula unsupported in Node.js — override with toKoreanAmount() string value
- [Phase 05-excel-output]: K14/K18 cross-sheet formula references overridden with direct CalcResult values (ExcelJS cannot recalculate cross-sheet)
- [Phase 05-excel-output]: Buffer to Uint8Array for Web Response: Buffer<ArrayBufferLike> not assignable to BodyInit
- [Phase 05-excel-output]: downloadBlobResponse utility extracted to lib/utils/downloadBlob.ts to keep EstimateEditor under 200 lines
- [Phase 06-pdf-output]: chromium-min has no defaultViewport — use hardcoded A4 dimensions for serverless PDF
- [Phase 06-pdf-output]: Buffer wrapped in Uint8Array for BodyInit compatibility in NextResponse (PDF route)
- [Phase 06-pdf-output]: PDF uploaded to Storage+Drive on save; pdf_url now points to real PDF not HTML
- [Phase 07-proposal]: html2canvas and jspdf installed as npm packages; dynamic import used for browser-only PDF generation
- [Phase 07-proposal]: Proposal config stored as JSON in Supabase Storage rather than new DB table (no migration needed)
- [Phase 07-proposal]: 견적서→제안서 URL params 방식으로 데이터 전달 (localStorage보다 명시적)
- [Phase 07-proposal]: PDF 저장 실패 시 로컬 다운로드는 계속 진행 (try/catch + console.error, alert 없음)
- [Phase 07-proposal]: Drive 업로드 타임아웃 10초 — 제안서는 단일 파일이므로 generate/route.ts 20초보다 짧게
- [Phase 08-manual-edit]: CoverSheet already contained all 4 required fields — plan 19 requirements were pre-satisfied, no code changes needed
- [Phase 08-manual-edit]: AddItemModal uses DEFAULT_PRESETS fallback when /api/presets not available
- [Phase 08-manual-edit]: x button reuses existing 비고 td for delete — no new column, keeps table width unchanged
- [Phase 08-manual-edit]: updateItemText skips amount recalculation — name/spec/unit have no effect on monetary totals
- [Phase 08-manual-edit]: WorkSheet m2 display replaced with InlineCell; readOnly when onMetaChange not provided (backward compatible)
- [Phase 08-manual-edit]: updateSheetPpp is new function; updateSheet left untouched. window.confirm chosen for ppp rebuild gate (consistent with existing removeItem pattern). onPppChange prop is optional for backward compat.
- [Phase 08-manual-edit]: AddItemModal 장비 탭: EQUIPMENT_PRESETS as const tuple + EquipKey Record state for type-safe per-equipment day/price editing
- [Phase 08-manual-edit]: removeSheet saves snapshot before sheet removal; moveItem uses splice with sort_order reassignment

### Pending Todos

None yet.

### Blockers/Concerns

- Voice flow state machine (voiceFlow.ts) has stateRef/useState desync risk — must stabilize in Phase 1.
- P매트릭스 RLS fallback to zeros still needs verification — create new estimate and check unit costs non-zero.
- EstimateEditor.tsx is 389 lines (violates 200-line rule) — split during Phase 3 refactor.

## Session Continuity

Last session: 2026-03-31T10:19:28.001Z
Stopped at: Completed 08-manual-edit/21-PLAN.md
Resume file: None
