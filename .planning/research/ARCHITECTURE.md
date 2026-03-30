# Architecture Patterns

**Domain:** Voice-driven estimate editor (Next.js 14 + Supabase)
**Researched:** 2026-03-30
**Confidence:** HIGH — based on direct codebase analysis, not speculation

---

## Recommended Architecture

The existing code already implements the right layered architecture. The problem is not the layer design — it is specific wiring bugs within layers. This document maps the correct component boundaries, identifies exactly where each pipeline breaks, and defines the build order for fixing them.

### Layer Map

```
Browser
  │
  ├── Page (SSR): app/(authenticated)/estimate/[id]/page.tsx
  │     Fetches: estimate rows + sheets + items + priceMatrix (service role)
  │     Passes: initialEstimate, priceMatrix as props → EstimateEditor
  │
  └── Client boundary ──────────────────────────────────────────────────
        │
        ├── EstimateEditor (orchestrator, ~390 lines — over budget)
        │     Owns: activeTab, saving, emailOpen, showChangeLog, voiceLogs
        │     Coordinates: useEstimate + useVoice + useVoiceFlow + useWakeWord
        │     Problem: voice callback closure captures stale `voice` ref
        │
        ├── useEstimate (state management)
        │     Owns: estimate tree, snapshots[], modifiedCells Map, isDirty
        │     Exposes: updateMeta, updateItem, updateSheet, applyVoiceCommands, initFromVoiceFlow
        │     Sound. No bugs in isolation.
        │
        ├── useVoice (audio pipeline)
        │     Owns: MediaRecorder lifecycle, STT/LLM/TTS API calls
        │     Problem: skipLlm is captured at init via closure, not reactive
        │     Problem: processAudio closes over sttPrompt but not estimateContext
        │
        ├── useVoiceFlow (state machine for new estimate collection)
        │     Owns: FlowState (step + 4 fields), recording resume timers
        │     Problem: stateRef and flowState can diverge (async setState vs sync ref)
        │     Problem: isActive is derived from flowState (React state) but
        │               voiceFlowRef.current.isActive in EstimateEditor reads the ref
        │               which may be one render behind
        │
        ├── useAutoSave (persistence)
        │     Owns: debounce timer, Supabase upsert
        │     Problem: delete-all + re-insert (not upsert-by-id) causes data loss risk
        │
        └── useWakeWord (wake word + hardware button detection)
              Owns: Web Speech API continuous recognition
              Sound in isolation.
```

---

## Component Boundaries

| Component | Owns | Receives From | Sends To |
|-----------|------|--------------|---------|
| `page.tsx` (SSR) | DB fetch, auth check | Supabase, URL params | `EstimateEditor` via props |
| `EstimateEditor` | Tab state, modal state, voiceLogs | `initialEstimate`, `priceMatrix` | All child components via props |
| `useEstimate` | Estimate tree, snapshot stack, dirty flag | `initialEstimate`, `priceMatrix` | `EstimateEditor`, WorkSheet, CoverSheet |
| `useVoice` | MediaRecorder, STT/LLM/TTS calls | Mode, estimateContext, callbacks | `onSttText`, `onCommands`, `onParsed` callbacks |
| `useVoiceFlow` | FlowState machine, field collection | Recording/TTS functions from `useVoice` | `onComplete` callback → `initFromVoiceFlow` |
| `useAutoSave` | Debounced Supabase writes | estimate, isDirty | `markClean` callback |
| `lib/voice/commands.ts` | Pure command application | EstimateSheet, VoiceCommand[] | Returns new EstimateSheet |
| `lib/estimate/buildItems.ts` | P-matrix → item array computation | m2, wallM2, ppp, priceMatrix | EstimateItem[] + CalcResult |
| `lib/estimate/calc.ts` | Subtotal → overhead → profit → rounding | EstimateItem[] | grandTotal |

**Invariant:** `lib/estimate/*` and `lib/voice/commands.ts` are pure functions. They receive data, return data. No React, no side effects.

---

## Data Flow

### Flow 1: New Estimate via Voice (extract mode)

```
VoiceBar tap / wake word "견적"
  → EstimateEditor: estimate.sheets.length === 0 → voiceFlow.startFlow()
  → useVoiceFlow: step = 'collecting_area', startRecording()

User speaks (e.g., "187헤베 벽체 37 복합 35000 우레탄 31000")
  → MediaRecorder.stop() → processAudio() [in useVoice]
  → POST /api/stt → Whisper → text

  FORK: skipLlm = voiceFlowRef.current.isActive (true)
  → onSttText(text) fires
  → voiceFlowRef.current.processText(text) [in useVoiceFlow]

  useVoiceFlow.processText:
    → parseAllFields(text, stateRef.current)  [pure, regex-based]
    → if all 4 fields found → updateState({step:'done', area:187, ...})
    → playTts("면적 187... 우레탄 31000") [await]
    → goToNextEmpty() → step === 'generating'
    → callbacks.onComplete(finalState)

  EstimateEditor.onComplete(state):
    → initFromVoiceFlow({area, wallM2, complexPpp, urethanePpp})
    → useEstimate.initFromVoiceFlow: builds both sheets via buildItems()
    → setEstimate() → React re-render → WorkSheet appears
    → setActiveTab('complex-detail')
    → useAutoSave fires after 1000ms debounce → Supabase upsert

KNOWN BREAK POINT: voiceFlowRef.current.isActive in useVoice's skipLlm ref
  useVoice receives skipLlm = voiceFlowRef.current.isActive at render time.
  useEffect updates skipLlmRef when prop changes.
  But voiceFlowRef.current is mutated synchronously in render (not in effect).
  Race: if startFlow() fires and recording starts within the same render cycle,
  skipLlmRef may still be false when processAudio() runs.
  Result: LLM gets called with the raw speech as a modify command, not routed to voiceFlow.
```

### Flow 2: Edit Existing Estimate via Voice (modify mode)

```
User speaks (e.g., "바탕정리 재료비 300원 올려")
  → MediaRecorder.stop() → processAudio()
  → POST /api/stt → text
  → skipLlm = false (sheets exist, voiceFlow not active)
  → POST /api/llm with modify system prompt + estimateContext JSON
  → Claude returns: {commands:[{action:"update_item", target:"바탕정리", field:"mat", delta:300, confidence:0.96}], tts_response:"..."}

  handleModifyResponse():
    → commands[0].confidence >= 0.7 → shouldExecute = true
    → callbacks.onCommands(commands)

  EstimateEditor.handleVoiceCommands(commands):
    → not a sysCmd → applyVoiceCommands(commands, activeSheetIndex)

  useEstimate.applyVoiceCommands():
    → saveSnapshot() [deep clone before mutation]
    → setEstimate(prev => {
        applyCommands(sheets[sheetIndex], commands)
        → updateItem: finds "바탕정리", adds delta to mat, recalcs amounts
        → calc(): recomputes grandTotal
        return {sheets with updated sheet}
      })
    → setIsDirty(true) → useAutoSave debounces → Supabase upsert

  After state update → React re-render → WorkSheet shows updated row
  TTS: "바탕정리 재료비 삼백원 증가. 총액 오백구십만원."

KNOWN BREAK POINT: estimateContext is stale
  estimateContext is built in EstimateEditor render and passed to useVoice.
  useVoice stores it in estimateContextRef via useEffect.
  If user edits quickly and speaks before re-render propagates,
  LLM receives context from the state before the last edit.
  This causes delta mismatches in "올려" commands (relative changes based on stale base).
```

### Flow 3: Manual Cell Edit

```
User taps cell → InlineCell renders number input
  → onChange → onItemChange(itemIndex, field, value)
  → EstimateEditor: updateItem(activeSheetIndex, itemIndex, field, value)
  → useEstimate.updateItem():
    → saveSnapshot()
    → setEstimate: recalc item amounts, recalc sheet via calc()
    → setIsDirty(true)
  → useAutoSave triggers after 1000ms

KNOWN BREAK POINT: InlineCell may not exist or onItemChange may not wire correctly
  WorkSheet passes onItemChange down to InlineCell.
  If InlineCell renders a plain <input> without calling onItemChange on blur,
  the value change stays local in component state and never reaches useEstimate.
  Verify: InlineCell must call onItemChange(i, field, numericValue) on blur/enter.
```

### Flow 4: CRM → New Estimate

```
[NOT IMPLEMENTED — design only]

User navigates to /crm → customer list from Notion API
  → clicks "견적 쓰기" on customer row
  → POST /api/estimates { customer_name, site_name, manager_name, manager_phone }
  → Supabase insert estimates row → returns new id
  → redirect to /estimate/[id]
  → page.tsx SSR fetches empty estimate (sheets: [])
  → EstimateEditor renders "견적서 작성" guide screen
  → customer fields pre-filled in estimate (customer_name, site_name already in DB row)

DEPENDENCY: Notion API client (lib/notion/client.ts) must be built first.
DEPENDENCY: /api/estimates POST route with customer pre-fill must exist.
```

---

## Key Wiring Bugs (Confirmed by Code Analysis)

### Bug 1: skipLlm ref timing race

**Location:** `EstimateEditor.tsx` L167-170, `useVoice.ts` L63-64

**Mechanism:**
```typescript
// EstimateEditor render (every render):
voiceFlowRef.current = { processText: voiceFlow.processText, isActive: voiceFlow.isActive }

// useVoice reads:
useEffect(() => { skipLlmRef.current = skipLlm }, [skipLlm])
// skipLlm = voiceFlowRef.current.isActive — captured at render, propagated by effect
```

**Problem:** `voiceFlowRef.current.isActive` updates synchronously on render, but `useVoice`'s `skipLlmRef` updates in an effect (next microtask). If `startFlow()` sets `isActive = true` and recording starts in the same render cycle, `skipLlmRef` is still `false` when `processAudio()` runs.

**Fix:** Pass `voiceFlowRef` directly to `useVoice`. Inside `processAudio`, read `voiceFlowRef.current.isActive` at call time, not via a lagging effect-synced ref.

### Bug 2: stateRef / flowState divergence in useVoiceFlow

**Location:** `hooks/useVoiceFlow.ts` L31, L40-43

**Mechanism:**
```typescript
const stateRef = useRef<FlowState>(createInitialFlowState())

const updateState = (s: FlowState) => {
  stateRef.current = s   // sync
  setFlowState(s)        // async (batched React state)
}
```

`processText` is called from `onSttText` callback which fires inside `processAudio` (a closure). The closure uses `useCallback` with `[callbacks]` as dep. But `callbacks` object is recreated on every render of `EstimateEditor` (it's an inline object literal). This means `processText`'s `useCallback` never truly stabilizes — it always has fresh `callbacks`, which is correct. However, the `stateRef` approach is correct precisely because it avoids stale state closure reads. This is not a bug — it is the right pattern.

**Actual problem:** `processText` is declared with `useCallback([callbacks])`. If `callbacks` object reference changes between the time `startRecording()` triggers and `processText` is called (because re-render happened in between), `voiceFlowRef.current.processText` holds the old closure. The ref assignment `voiceFlowRef.current = { processText: voiceFlow.processText, isActive: voiceFlow.isActive }` happens on render, so as long as `EstimateEditor` re-renders before the STT result arrives, the ref is fresh.

**Real risk:** `callbacks.startRecording` and `callbacks.playTts` are captured at `useVoiceFlow` init and updated when callbacks changes. These must be stable refs (from `useVoice` which uses `useCallback`). They are. This is safe.

### Bug 3: handleVoiceCommands closure captures stale `voice`

**Location:** `EstimateEditor.tsx` L112-164, L173-196

**Mechanism:**
```typescript
const voice = useVoice({ ..., onSttText: (text) => {
  if (voiceFlowRef.current.isActive) {
    voiceFlowRef.current.processText(text)
  } else {
    addLog('user', text)
  }
}})
```

`handleSave` references `voice.playTts` but `voice` is declared after `handleSave` — this is a forward reference that relies on closure not executing until `handleSave` is called (not at definition time). This is fine in JS.

However: `handleVoiceCommands` is defined before `voice` is declared. The `eslint-disable-next-line react-hooks/exhaustive-deps` comments on `handleSave` and `handleEmail` suppress exhaustive-deps warnings. These are legitimate suppressions but mean any stale closure errors won't surface.

**Actual confirmed bug:** `handleVoiceCommands` is passed as `onCommands` to `useVoice`. It is memoized with `useCallback([...deps])`. `voice` is not in its dep list (because `voice` doesn't exist at the point of `handleVoiceCommands` definition — the object is returned by `useVoice` which is called after). The `handleVoiceCommands` callback references `handleSave` which in turn uses `voice.playTts`. Since `voice` is assigned to a const in render scope, when `handleVoiceCommands` was memoized it captured the render scope, so `voice.playTts` is always fresh from the render where `handleVoiceCommands` was last recreated. **This is safe as long as deps are correct.** But `handleSave` is in the `useCallback` deps for `handleVoiceCommands`, so it will update when `handleSave` updates, which includes when `voice` changes. This chain is correct.

### Bug 4: autoSave delete-then-insert — data loss window

**Location:** `hooks/useAutoSave.ts` L64-91 (per CONCERNS.md)

**Mechanism:** Delete all items for sheet, then insert fresh. If delete succeeds and insert fails (network timeout, RLS error), items are permanently lost.

**Fix pattern:**
```typescript
// Correct: upsert by id
await supabase.from('estimate_items').upsert(
  sheet.items.map((item, i) => ({ ...item, sheet_id: sheet.id, sort_order: i + 1 })),
  { onConflict: 'id' }
)
// Then delete items that no longer exist in sheet:
const keepIds = sheet.items.map(i => i.id).filter(Boolean)
await supabase.from('estimate_items')
  .delete()
  .eq('sheet_id', sheet.id)
  .not('id', 'in', `(${keepIds.join(',')})`)
```

This requires items to have stable `id` values. New items (added via voice/manual) must receive a UUID before the upsert, not after DB insert.

---

## Suggested Build Order

Build order is determined by what each component depends on. Fix the pipeline from bottom up.

### Tier 0: Verify/fix pure logic (no React, no API)

These are pure functions. Fix them first because every other layer depends on them.

1. `lib/estimate/buildItems.ts` — verify P-matrix → items is correct for current schema
2. `lib/estimate/calc.ts` — verify subtotal → grandTotal math
3. `lib/voice/commands.ts` — verify `applyCommands` mutates correctly (no item mutation without spread)
4. `lib/voice/voiceFlow.ts` — verify `parseAllFields` regex handles all Korean number formats

### Tier 1: Fix state management hook (useEstimate)

`useEstimate` is sound. One fix:

5. `useEstimate.initFromVoiceFlow` — add guard: skip sheet creation if sheet with same type already exists (already present in code, verified correct)
6. `useEstimate.applyVoiceCommands` — verify routeCommands confidence threshold matches expected behavior

### Tier 2: Fix voice pipeline wiring

7. `useVoice` — change `skipLlm` from prop to callback approach:
   ```typescript
   // Instead of skipLlm prop:
   shouldSkipLlm?: () => boolean
   // In processAudio:
   if (shouldSkipLlmRef.current?.()) { ... }
   ```
   This makes the check synchronous at call time, eliminating the timing race.

8. `useVoiceFlow` — verify `stateRef` is always written before `setFlowState`. Currently correct but add comment explaining the pattern.

9. `EstimateEditor` — fix the `voice` forward-reference pattern:
   - Extract `handleVoiceCommands` into a `useCallback` that depends on stable refs from `useEstimate`
   - Remove inline object literal for voiceFlow callbacks (extract to `useMemo` or stable `useRef`)

### Tier 3: Fix persistence

10. `useAutoSave` — replace delete-all + re-insert with upsert-by-id pattern
11. Add UUID generation for new items at creation time (in `addItem` in commands.ts)

### Tier 4: Fix InlineCell → state connection

12. `InlineCell` — verify `onItemChange` called on blur and Enter with numeric value
13. `WorkSheet` — verify `onItemChange` prop is wired to `updateItem` in EstimateEditor

### Tier 5: Build missing features

14. CRM: `lib/notion/client.ts` → `app/(authenticated)/crm/page.tsx` → customer list
15. CRM → estimate: `POST /api/estimates` with customer pre-fill → redirect
16. Estimate list: `app/(authenticated)/estimates/page.tsx`
17. Load past estimate: search API + navigation

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Rebuilding callbacks on every render

**What:** Passing inline object literal `{ startRecording, stopRecording, playTts, onComplete, addLog }` as `callbacks` prop to `useVoiceFlow`.

**Why bad:** `useCallback` deps on `callbacks` means every render creates a new dep value, defeating memoization. Every re-render (including the one caused by TTS status changes) recreates `processText`, which means `voiceFlowRef.current.processText` is always fresh — but this causes `useCallback` to run on every render, which is wasteful and introduces potential for missed updates if a dep was accidentally omitted.

**Instead:** Pass individual stable callbacks (each memoized with `useCallback`), not an object literal. Or use a stable `callbacksRef` pattern (already used in `useVoice` correctly).

### Anti-Pattern 2: Deriving `isActive` from React state then reading it through a ref

**What:** `voiceFlowRef.current.isActive` reads `flowState.step` via a closure inside `useVoiceFlow`'s return value, which is assigned to `voiceFlowRef` synchronously in render.

**Why bad:** The ref assignment happens during render, so it reflects the state from the last render. But between renders, if `startFlow()` fires (which calls `setFlowState`), the ref still has the old `isActive: false` until the next render completes.

**Instead:** Read `stateRef.current.step` for synchronous checks. `stateRef` is always updated synchronously in `updateState()` before `setFlowState()`.

Fix:
```typescript
// useVoiceFlow returns:
return {
  flowState,
  startFlow,
  processText,
  resetFlow,
  isActive: flowState.step !== 'idle' && flowState.step !== 'done',
  isActiveSynchronous: () => stateRef.current.step !== 'idle' && stateRef.current.step !== 'done',
}
// EstimateEditor uses isActiveSynchronous() in skipLlm check
```

### Anti-Pattern 3: EstimateContext as serialized JSON string passed as prop

**What:** `estimateContext = JSON.stringify({...})` recalculated on every render, passed to `useVoice`, stored via `useEffect` in `estimateContextRef`.

**Why bad:** JSON.stringify on every render is cheap but the effect chain creates a 1-render lag. Modify commands arrive with the previous render's context.

**Instead:** Pass a `getEstimateContext: () => string` callback (using `useCallback` with `[estimate]` dep). Inside `useVoice.processAudio`, call it at fetch time. This reads current state at the moment the LLM call is made, not at render time.

### Anti-Pattern 4: Deleting all items before re-inserting

**What:** `useAutoSave` deletes all `estimate_items` for a sheet, then inserts the current array.

**Why bad:** Creates a data-loss window. Also generates noise in DB logs and Supabase realtime subscriptions.

**Instead:** Upsert by id. New items get a client-generated UUID (use `crypto.randomUUID()`). Deleted items get explicitly deleted by id diff.

---

## Scalability Considerations

| Concern | Current (1 user, ~15 items/sheet) | Future (100 estimates/day) |
|---------|----------------------------------|---------------------------|
| LLM latency per command | 1-3s sequential, blocks next recording | Queue commands, apply optimistically |
| AutoSave frequency | 1s debounce, delete+insert O(n) | Upsert diff O(changed items only) |
| P-matrix load | Loaded on every page SSR | Cache in edge middleware or SWR |
| Audio blob size | 10-60s webm, base64 encoded inline | Stream to signed S3 URL, pass URL to Whisper |

The current scale (one user, one estimate session at a time) does not require addressing these now. Fix correctness first.

---

## Sources

- Direct code analysis: `EstimateEditor.tsx`, `useVoice.ts`, `useVoiceFlow.ts`, `useEstimate.ts`, `commands.ts`, `voiceFlow.ts`, `useAutoSave.ts` (all read 2026-03-30)
- `.planning/codebase/CONCERNS.md` (codebase analysis, 2026-03-30)
- `.planning/codebase/ARCHITECTURE.md` (layer documentation, 2026-03-30)
- CLAUDE.md sections 4, 8 (business requirements)

---

*Architecture research: 2026-03-30*
