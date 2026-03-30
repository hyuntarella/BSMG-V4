# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Hybrid Next.js 14 App Router + State Management + Voice-Driven Command Pattern

**Key Characteristics:**
- Voice-first input: all estimate modifications flow through speech recognition → LLM parsing → command execution
- Server-side data fetching + client-side state management for responsive editing
- Layered estimate computation: buildItems (P-matrix interpolation) → overrides → calc (overhead/profit/rounding)
- Multi-mode voice processing: extract (new estimate) → supplement (missing fields) → modify (command editing)
- Real-time Supabase sync with debounce (useAutoSave)

## Layers

**Presentation Layer (React):**
- Purpose: UI rendering + user interaction (voice/touch)
- Location: `components/`
- Contains: Page shells (EstimateEditor, CoverSheet, WorkSheet), inline editing (InlineCell), voice feedback (VoiceBar)
- Depends on: Hooks (useEstimate, useVoice, useVoiceFlow), voice commands
- Used by: Next.js App Router pages

**State Management Layer (Client Hooks):**
- Purpose: Centralized estimate state, undo snapshots, dirty tracking, cell modification tracking
- Location: `hooks/useEstimate.ts`
- Contains: estimate state, snapshots[], modifiedCells Map, rebuild logic on m2/wall_m2 changes
- Depends on: lib/estimate/* (buildItems, calc, margin)
- Used by: EstimateEditor + all subcomponents

**Voice Processing Layer:**
- Purpose: STT → LLM parsing → command routing → execution
- Location: `hooks/useVoice.ts`, `hooks/useVoiceFlow.ts`, `lib/voice/*`
- Contains: MediaRecorder wrapper, API proxying (STT/LLM/TTS), 3-level confidence routing, flow state machine
- Depends on: /api/stt, /api/llm, /api/tts + external (OpenAI, Anthropic)
- Used by: EstimateEditor (modify mode) + VoiceBar (UI feedback)

**Business Logic Layer:**
- Purpose: Estimate calculation engine (P-matrix → items → costs → totals)
- Location: `lib/estimate/`
- Contains: buildItems, calc, margin, cost breakdown, area ranges, constants (BASE arrays)
- Depends on: types.ts, constants.ts
- Used by: hooks/useEstimate, voice command executor

**API Layer (Serverless Routes):**
- Purpose: Backend proxies + database operations
- Location: `app/api/`
- Contains: STT/LLM/TTS proxies, estimate CRUD, file generation (Excel/PDF), email sending
- Depends on: Supabase client, external services (OpenAI, Anthropic, Resend)
- Used by: Client hooks + form submissions

**Data Access Layer:**
- Purpose: Database + authentication abstraction
- Location: `lib/supabase/`, `app/api/`
- Contains: Supabase client creation (browser + server), middleware auth, RLS policies
- Depends on: Supabase JS SDK
- Used by: API routes + initial page SSR

**Utility Layer:**
- Purpose: Shared helpers
- Location: `lib/utils/`
- Contains: format (Korean numerals), lerp (interpolation), number conversion

## Data Flow

**Voice Estimate Creation (extract mode):**

1. User triggers "견적" wake word → voiceFlow.startFlow()
2. VoiceBar shows "면적을 말씀해주세요" (TTS)
3. User speaks → MediaRecorder captures → base64 encode
4. POST /api/stt with audio → OpenAI Whisper → Korean text
5. useVoiceFlow.processText(text) → parseAllFields() attempts to extract all 4 fields at once (area, wall, complexPpp, urethanePpp)
6. Feedback: "면적 150제곱미터, 벽체 30제곱미터..." (TTS)
7. Loop: goToNextEmpty() → ask only missing fields
8. After all 4 collected → voiceFlow.onComplete() → EstimateEditor.initFromVoiceFlow()
9. initFromVoiceFlow() builds sheets: buildItems(method, m2, wall_m2, ppp) → creates estimate_sheets + estimate_items
10. Supabase upsert saves state

**Voice Estimate Modification (modify mode):**

1. User speaks → MediaRecorder → OpenAI Whisper → text
2. useVoice sends to POST /api/llm with:
   - system: getModifySystem() (command parsing prompt)
   - user: STT text
   - context: { m2, sheets: [{type, items: [{name, qty, mat, labor, exp, total}]}] }
3. Claude Sonnet parses → JSON: { commands: [{action, target, field, value/delta, confidence}], tts_response }
4. routeCommands() branches on confidence:
   - >= 0.95: Execute immediately → applyCommands() → state update → "바탕정리 재료비 300원에서 400원으로" (TTS)
   - 0.70-0.95: Execute + confirm → "맞습니까?" (TTS) → User "응" = done, "아니 X" = retry
   - < 0.70: Skip + clarify → "어떤 항목 말씀이세요?" (TTS)
5. applyCommands() executes on sheet.items:
   - update_item: find target item by name, update field (qty/mat/labor/exp)
   - add_item: append new EstimateItem to items
   - remove_item: filter out by name
   - bulk_adjust: multiply all items in category by (1 + percent/100)
   - set_grand_total: reverse-calc price_per_pyeong via findPriceForMargin()
6. After each command: calc() recalculates subtotal → overhead (3%) → profit (6%) → grand_total (100k rounddown)
7. useAutoSave debounces 1000ms → POST Supabase estimate_items upsert

**Manual Cell Editing:**

1. User taps cell → InlineCell shows number input
2. onChange → updateItem(sheetIndex, itemIndex, field, value)
3. useEstimate: recalc sheet via rebuildSheet() → calc()
4. setIsDirty(true) → useAutoSave triggers
5. Supabase upsert saves

**State Management:**

- `estimate` (useState): root state tree { id, sheets: [{type, items: []}] }
- `snapshots` (useState): array of past states, saveSnapshot() before each change (voice/manual)
- `isDirty` (useState): tracks unsaved changes, markClean() after Supabase sync
- `modifiedCells` (Map): tracks which cells changed for UI highlighting
- `recentCommandsRef` (useVoice): keeps last 3 voice commands for context carryover

**Undo/Snapshot:**

1. saveSnapshot(description, type) called before state mutation
2. restoreTo(snapshotIndex) restores past estimate state
3. Undo command triggers: const idx = snapshots.length - 1 → restoreTo(idx)

## Key Abstractions

**EstimateSheet (compute unit):**
- Purpose: Represents one method variant (복합 OR 우레탄) with calculated items
- Example: `{ type: '복합', items: [{name: '바탕정리', qty: 150, mat: 1000, mat_amount: 150000, total: 225000}], grand_total: 3900000 }`
- Pattern: Immutable updates via spread operator, calc() applied after mutations

**P-Matrix (price lookup):**
- Purpose: Interpolate unit costs [mat, labor, exp] by area_range × method × price_per_pyeong
- File: `lib/estimate/priceData.ts` (getPD), `lib/estimate/areaRange.ts` (getAR)
- Usage: buildItems input → getAR(m2) → getPD(matrix, areaRange, method, ppp) → UnitCost[]
- Pattern: 3-level nested object, store in DB (price_matrix), loaded server-side with service role (RLS bypass)

**Command (voice execution unit):**
- Purpose: Parsed LLM output representing one atomic edit
- Example: `{ action: 'update_item', target: '바탕정리', field: 'mat', delta: +100, confidence: 0.96 }`
- Pattern: applyCommand() pure function, returns CommandResult, chained via applyCommands()

**VoiceFlow (guided collection):**
- Purpose: State machine for structured data collection (4 required fields for new estimate)
- Location: `lib/voice/voiceFlow.ts`
- Pattern: FlowStep enum (collecting_area → collecting_wall → ...) + FLOW_STEPS map, transitions on parseFlowInput()

## Entry Points

**Main Estimate Editor:**
- Location: `app/(authenticated)/estimate/[id]/page.tsx` (SSR)
- Triggers: User navigates to /estimate/:id
- Responsibilities:
  1. Fetch estimate metadata + sheets + items from Supabase (SSR)
  2. Fetch price_matrix with service role (RLS bypass)
  3. Pass initial data to EstimateEditor component
  4. EstimateEditor manages all client-side state + voice interaction

**API Routes:**
- POST /api/stt: OpenAI Whisper proxy
- POST /api/llm: Claude Sonnet proxy
- POST /api/tts: OpenAI TTS proxy
- POST /api/estimates/[id]/generate: Excel + PDF creation
- POST /api/estimates/[id]/email: Send via Resend
- GET /api/estimates/search: CRM lookup

**New Estimate Flow:**
- Location: `app/(authenticated)/estimate/new/page.tsx`
- Responsibilities: Create empty estimate in DB, redirect to [id]

## Error Handling

**Strategy:** Client-side try-catch + TTS fallback + user feedback via voice log

**Patterns:**

- API failures (STT/LLM/TTS): catch in useVoice, set error state, play TTS "오류 발생", addLog
- Voice clarification loop: 2-attempt limit, after which "알겠습니다" + abort
- Invalid estimates: redirect from SSR page if estimate not found
- RLS violations: Supabase returns error, caught in useAutoSave, logged

## Cross-Cutting Concerns

**Logging:** VoiceBar maintains voiceLogs array (last 20 messages), displays in ChangeLogPanel

**Validation:**
- M2/wall_m2: parseAllFields() regex validation, fallback to null
- Price per pyeong: validate > 0 in updateSheet()
- Quantities: enforce qty >= 0

**Authentication:** Middleware wraps all (authenticated) routes, redirects to /login if no session

**Authorization:** Page-level RLS: fetch user.company_id → filter estimates to company_id via Supabase RLS policies

**Concurrency:** useAutoSave debounces 1000ms (ignores rapid updates), last write wins

---

*Architecture analysis: 2026-03-30*
