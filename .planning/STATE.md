---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 12-settings/39-PLAN.md
last_updated: "2026-03-31T12:27:46.774Z"
last_activity: 2026-03-31
progress:
  total_phases: 12
  completed_phases: 10
  total_plans: 53
  completed_plans: 48
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** 음성 한마디로 견적서가 완성된다. 터치 0회가 목표.
**Current focus:** Phase 12 — settings

## Current Position

Phase: 12 (settings) — EXECUTING
Plan: 3 of 3
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
| Phase 09-crm P23 | 350 | 2 tasks | 6 files |
| Phase 09-crm P24 | 206 | 2 tasks | 5 files |
| Phase 09-crm P27 | 406 | 2 tasks | 3 files |
| Phase 09-crm P26 | 420 | 2 tasks | 5 files |
| Phase 09-crm P28 | 365 | 2 tasks | 7 files |
| Phase 10-dashboard P29 | 10 | 2 tasks | 5 files |
| Phase 10-dashboard P32 | 8 | 2 tasks | 4 files |
| Phase 10-dashboard P30 | 8 | 2 tasks | 3 files |
| Phase 10-dashboard P31 | 10 | 2 tasks | 4 files |
| Phase 10-dashboard P33 | 12 | 2 tasks | 7 files |
| Phase 11-calendar P34 | 432 | 2 tasks | 6 files |
| Phase 11-calendar P35 | 358 | 2 tasks | 5 files |
| Phase 11-calendar P36 | 480 | 2 tasks | 8 files |
| Phase 12-settings P37 | 4 | 2 tasks | 4 files |
| Phase 12-settings P38 | 8 | 2 tasks | 6 files |
| Phase 12-settings P39 | 5 | 2 tasks | 6 files |

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
- [Phase 09-crm]: Notion REST API 직접 fetch (no SDK): 패키지 설치 없이 환경변수 토큰으로 Bearer auth
- [Phase 09-crm]: getAllRecords() 직접 import (server component에서 API route 우회) — 서버사이드 호출 효율적
- [Phase 09-crm]: CrmPageClient 별도 파일 — CRM page.tsx 순수 서버 컴포넌트 유지
- [Phase 09-crm]: 성공/실패 OR 조건: contractStatus와 pipeline 모두 체크 — Notion 데이터 불일관성 대응
- [Phase 09-crm]: 월 sticky 헤더 top-10 오프셋: 연도 헤더(~40px) 아래 겹치도록 z-[9] 처리
- [Phase 09-crm]: HTML5 DnD API 사용 (외부 라이브러리 없음): draggable + onDragStart/onDragOver/onDrop으로 순수 구현
- [Phase 09-crm]: KanbanBoard에 FAB + Undo 토스트 통합: 칸반 관련 UI 응집도 향상
- [Phase 09-crm]: TEST_MODE 우회는 updateSession에서 getUser() 호출 전에 위치 — 불필요한 Supabase 호출 없이 early return
- [Phase 10-dashboard]: CsStatusSection added to existing app/dashboard/page.tsx to avoid parallel route conflict
- [Phase 10-dashboard]: Notion REST fetch pattern preserved — no @notionhq/client SDK installed
- [Phase 10-dashboard]: FollowUpCard rewritten as no-prop Notion CRM component; pipeline filter uses 견적서전송 (no space)
- [Phase 10-dashboard]: queryCrmByPipeline reused for unsent query — estimateSentDate=null filter applied in API layer
- [Phase 10-dashboard]: ViewTrackingCard SSR replaced by ViewedCard client-fetch — avoids duplication, aligns with established dashboard client-component pattern
- [Phase 10-dashboard]: dashboard/page.tsx converted to client component — LoadEstimateModal requires useState; SSR user name removed
- [Phase 10-dashboard]: getEventsForDate() single-date only in Phase 33 — Phase 34 will extend to range query
- [Phase 11-calendar]: getEventsForDate() preserved as getEvents(date, date) wrapper for dashboard backward compatibility
- [Phase 11-calendar]: TimeGrid 공통 컴포넌트: WeekView/DayView 재사용, HOUR_HEIGHT=64px 기준 absolute positioning
- [Phase 11-calendar]: CalendarHeader에 title/onPrev/onNext/onToday optional props 추가 — 기존 onDateChange fallback으로 하위 호환 유지
- [Phase 11-calendar]: EventModal CRM 검색: /api/crm/search 신규 라우트 생성 — debounce 300ms, 고객명/주소 contains 필터
- [Phase 11-calendar]: EventDetail 우측 고정 패널: fixed right-0 w-80 — 모달보다 비침습적으로 이벤트 상세 표시
- [Phase 11-calendar]: getMembers() 실패 시 빈 배열 반환 — NOTION_CALENDAR_MEMBER_DB 미설정 환경에서도 앱 동작
- [Phase 12-settings]: Service role client at module level in price-matrix API route (not per-request) — safe for server-side only
- [Phase 12-settings]: BaseItemsEditor stores edits in cost_config JSONB (base_items key) — no new table needed
- [Phase 12-settings]: cost-config PUT supports section/value partial update so BaseItemsEditor and CostEditor can save independently
- [Phase 12-settings]: CalcRulesEditor preview uses example 1,000,000원 base — shows real-time effect of rate changes
- [Phase 12-settings]: SettingsSummary uses Promise.all for concurrent cost-config + presets fetch

### Pending Todos

None yet.

### Blockers/Concerns

- Voice flow state machine (voiceFlow.ts) has stateRef/useState desync risk — must stabilize in Phase 1.
- P매트릭스 RLS fallback to zeros still needs verification — create new estimate and check unit costs non-zero.
- EstimateEditor.tsx is 389 lines (violates 200-line rule) — split during Phase 3 refactor.

## Session Continuity

Last session: 2026-03-31T12:27:46.759Z
Stopped at: Completed 12-settings/39-PLAN.md
Resume file: None
