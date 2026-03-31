# Domain Pitfalls: Voice-Driven React Estimate System

**Domain:** Voice-first web app — React state + STT/LLM/TTS pipeline + Supabase nested autosave
**Researched:** 2026-03-30
**Based on:** Direct codebase analysis (`hooks/useVoice.ts`, `hooks/useAutoSave.ts`, `hooks/useEstimate.ts`,
`lib/voice/voiceFlow.ts`, `components/estimate/EstimateEditor.tsx`) + external research on voice pipeline
architecture and React state machine patterns.

---

## Critical Pitfalls

Mistakes that cause silent data loss, pipeline deadlock, or user-facing corruption.

---

### Pitfall 1: Delete-Then-Insert Autosave Has a Data-Loss Window

**What goes wrong:** `useAutoSave` deletes all items for a sheet, then inserts them fresh every save cycle.
If the INSERT fails (network error, RLS violation, Supabase connection drop) after the DELETE succeeds,
all estimate items for that sheet are permanently gone from the DB. The in-memory React state is intact,
but the next page load retrieves nothing.

**Why it happens:** The two operations are separate awaited calls with no transaction wrapping. A 1-second
debounce means this fires constantly during active editing. Any transient network blip hits the window.

**Code location:** `hooks/useAutoSave.ts` L64-91

**Consequences:**
- User edits a 15-item estimate. Network hiccups during save. Next day they reload — empty sheet.
- No error is surfaced to the user (only `console.error`).
- The in-memory state and DB diverge silently.

**Prevention:**
1. Replace with upsert-by-id: compute a diff of added/modified/deleted items and apply only changes.
2. At minimum, wrap delete+insert in a Postgres function called via `supabase.rpc()` to get atomicity.
3. Add visible error state in the UI when save fails — never swallow autosave errors silently.
4. Fall back to a "dirty" indicator that persists until confirmed DB success.

**Warning signs:**
- Users report "내용이 사라졌어요" after refreshing
- `console.error('자동 저장 실패:')` appearing in logs without UI feedback
- Discrepancy between in-memory state and what loads from DB

**Phase:** Fix before any feature work. This is a data integrity issue.

---

### Pitfall 2: `voiceFlowRef.current.isActive` Is Stale at `useVoice` Hook Initialization

**What goes wrong:** `useVoice` is called with `skipLlm: voiceFlowRef.current.isActive`. This value is
captured at render time. The `voiceFlowRef` is updated on the line immediately after `useVoice` is
called (`voiceFlowRef.current = { ... isActive: voiceFlow.isActive }`). But `skipLlm` inside `useVoice`
is mirrored to `skipLlmRef` via a `useEffect`, which only runs after paint — not synchronously.

**Code location:** `components/estimate/EstimateEditor.tsx` L167-216

**Consequences:**
- When the voice flow becomes active and a recording finishes, `processAudio` reads `skipLlmRef.current`
which may still be `false` (stale). The LLM is called when it should be skipped.
- STT text gets sent to BOTH the LLM path AND `voiceFlow.processText()`, causing double-processing.
- In the reverse case: flow goes inactive but skipLlm is still `true` — LLM is never called, voice
commands are silently dropped.

**Why it happens:** React's render/effect cycle: `useState` setters are async, `useEffect` fires after
paint. A ref-based "sync" that depends on a `useEffect` is not actually synchronous.

**Prevention:**
1. Move `skipLlm` decision inside `processAudio` itself: check `voiceFlowRef.current.isActive` at the
   moment STT completes, not at hook initialization time. The ref is already available for this.
2. Route all STT output through a single dispatch function in `EstimateEditor` that reads the current
   flow state and decides where to send the text.
3. Never use `useEffect` to sync a value that must be current at async callback time — use `useRef`
   directly for that value.

**Warning signs:**
- LLM API calls appearing in network tab during voice guide collection phase
- Voice flow collecting area/wall but also triggering "modify" commands simultaneously
- STT transcripts appearing twice in the voice log

**Phase:** Fix before voice command work (milestone 1).

---

### Pitfall 3: TTS Playback and Recording Can Overlap

**What goes wrong:** `toggleRecording` checks `status === 'idle'` before starting recording. But `status`
is React state — it updates asynchronously. If the user taps the record button during TTS playback,
`status` may still read `'idle'` for a render cycle while audio is actually playing, allowing
`startRecording` to run. Result: microphone is open while TTS is playing, the TTS audio is captured by
the microphone, and Whisper transcribes the TTS speech as user input.

**Code location:** `hooks/useVoice.ts` L307-314 (`toggleRecording`), L67-107 (`playTts`)

**Consequences:**
- TTS says "면적을 말씀해주세요" — this gets transcribed and fed back to the LLM as if the user said it.
- Creates a feedback loop: TTS → STT → LLM → TTS → STT...
- In car environments with phone speaker, this is almost guaranteed to happen.

**Why it happens:** `status` is `useState`, updated via `setStatus`. Between the button tap and the next
render, the old value is visible. Hardware volume button handler fires synchronously, but React state
update is batched.

**Prevention:**
1. Add a `isPlayingRef = useRef(false)` that is set synchronously when TTS starts (`isPlayingRef.current = true`)
   and cleared when audio ends. Check this ref — not `status` — in `toggleRecording` and in the wake
   word handler.
2. Block all recording start paths while `isPlayingRef.current === true`.
3. For hardware button: add `if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }`
   before starting recording, making button press an interrupt-and-record action.

**Warning signs:**
- Voice logs showing TTS phrases appearing as user utterances
- Infinite "확인하셨나요?" loops
- STT transcripts containing Korean TTS-style formal language ("말씀해주세요", "반영했습니다")

**Phase:** Fix before car testing (milestone 1-2).

---

### Pitfall 4: Multiple Concurrent LLM/TTS Calls with No Cancellation

**What goes wrong:** `processAudio` is called from `recorder.onstop`, which fires asynchronously.
If the user records twice in quick succession (or if a previous recording's onstop fires late),
two `processAudio` coroutines run concurrently. Both call the LLM, both call TTS. The second TTS
interrupts or overlays the first. State updates from command 1 partially apply before command 2's
state updates run on top.

**Code location:** `hooks/useVoice.ts` L176-254 (`processAudio`), L272 (`recorder.onstop`)

**Consequences:**
- Two LLM calls return in indeterminate order. The later-returning call's commands overwrite the
  earlier one's applied state changes, creating phantom undos.
- Two audio elements play simultaneously (two `new Audio(url)` instances).
- `savingRef.current` guard in `useAutoSave` prevents concurrent saves, but the in-memory state from
  two voice commands racing is not protected.

**Prevention:**
1. Add a `processingRef = useRef(false)` guard at the start of `processAudio`. Return early if already
   processing. This prevents overlapping pipeline calls.
2. Or implement a command queue: append to a queue and process sequentially, one at a time.
3. Stop any in-flight `audioRef.current` before starting new TTS playback (already partially done,
   but needs to extend to concurrent `processAudio` invocations).

**Warning signs:**
- Two "processing" spinner states appearing
- Estimate items updated then immediately reverted
- Multiple TTS audio streams playing simultaneously

**Phase:** Fix before voice modify mode work.

---

### Pitfall 5: `voiceFlow` State Machine Uses Both `useRef` and `useState` for the Same Truth

**What goes wrong:** `useVoiceFlow` (referenced in `EstimateEditor`) maintains flow state. The CONCERNS
file documents that `stateRef.current` and `flowState` (useState) can desync if `processText` is called
before the state setter runs. When a step completes, `setFlowState(next)` queues a re-render. But
`stateRef` is updated synchronously. If another STT result arrives before the re-render, `processText`
reads `stateRef` (which has the new step) while the UI still shows the old step. Callbacks that depend
on rendered state use the old step.

**Code location:** `lib/voice/voiceFlow.ts`, `hooks/useVoiceFlow.ts`

**Consequences:**
- Flow jumps a step silently (e.g., skips collecting_wall, jumps to collecting_complex_ppp).
- TTS prompt for the wrong step plays.
- Fields get assigned to the wrong FlowState bucket.

**Why it happens:** Classic dual-state anti-pattern: same data in both a ref (for synchronous access in
callbacks) and useState (for rendering). They are not kept in sync atomically.

**Prevention:**
1. Keep exactly ONE source of truth: `useRef` for the state the state machine logic reads/writes;
   derive all rendered output from that ref by exposing a separate `displayState` that is updated
   via `useState` only for rendering.
2. OR use only `useState` + functional updater form (`setState(prev => ...)`) everywhere to avoid
   stale reads, and accept that callbacks always work on the latest committed state.
3. Add an invariant: after every state transition, assert `stateRef.current.step === flowState.step`.
   Log loudly if they differ.

**Warning signs:**
- Voice flow asking for the same field twice (e.g., two consecutive "면적을 말씀해주세요")
- Flow reaching 'generating' before all 4 fields are collected
- `initFromVoiceFlow` called with null values that should have been collected

**Phase:** Fix before voice guide testing.

---

## Moderate Pitfalls

### Pitfall 6: Regex-Based Field Parsing Misassigns Values Across Fields

**What goes wrong:** `parseAllFields` in `voiceFlow.ts` uses sequential regex matches. The urethane
parser matches `/우레탄\s*(?:평단가\s*)?(\d+)/`. If the user says "우레탄 면적 37헤베 복합 35000 우레탄 31000",
the urethane regex captures "37" from "우레탄 면적 37" before reaching "31000". The area regex
already captured "37" too (via `hebeMatch`). Result: urethanePpp = 37 (wrong), which passes through
because 37 is a valid number and there's no range validation.

**Prevention:**
1. Add range validation after parsing: area must be > 10 (m²), ppp must be > 10000.
2. Test with utterances where the same word appears in multiple contexts.
3. Parse in priority order with context awareness: if "우레탄" is followed by a unit word (헤베/미터),
   it's area context, not ppp context.

**Warning signs:**
- `complexPpp` or `urethanePpp` showing values like 37 or 150 (suspiciously small for a price)
- Area field containing 35000 (suspiciously large for m²)

**Phase:** Address during voice guide validation work.

---

### Pitfall 7: `onParsed` in `useVoice` Adds Sheets Without Checking Flow Mode

**What goes wrong:** In `EstimateEditor`, the `onParsed` callback (for extract/supplement mode) calls
`addSheet('복합')` and `addSheet('우레탄')` when area or method is parsed. But `useVoiceFlow` also
calls `initFromVoiceFlow` which creates sheets via `setEstimate`. If both run (e.g., voice flow
completes AND `onParsed` fires for the same recording), two sets of sheets are created. The second
`addSheet` call is guarded by `if (!prev.sheets.some(s => s.type === '복합'))` — but if `initFromVoiceFlow`
and `addSheet` run in the same React batched update, `prev.sheets` in `addSheet` may not yet reflect
`initFromVoiceFlow`'s additions.

**Code location:** `EstimateEditor.tsx` L187-195 (`onParsed`), L199-213 (`voiceFlow onComplete`)

**Prevention:**
1. When `voiceFlow.isActive`, suppress `onParsed` entirely — the flow handles its own sheet creation.
2. Check `skipLlm` status to confirm: if LLM was skipped, `onParsed` should not be called.
3. Make `initFromVoiceFlow` idempotent: always check existing sheets before adding (already partially
   done, but verify the guard works under React batching).

**Warning signs:**
- Two "복합" or two "우레탄" sheets appearing (though `type` uniqueness check should prevent this)
- `grand_total` showing 0 on one sheet because it was created by the wrong path with empty priceMatrix

**Phase:** Address alongside the useRef/skipLlm desync fix.

---

### Pitfall 8: `saveSnapshot` Captures Stale Estimate State in Callbacks

**What goes wrong:** `saveSnapshot` in `useEstimate` closes over `estimate` from the render at the time
the callback was created. When `updateItem` calls `saveSnapshot`, the snapshot it stores is the estimate
as of that render — which may already be one edit behind if two edits happened in quick succession
(within the same React batch). Undo restores to a state that never existed on screen.

**Code location:** `hooks/useEstimate.ts` L31-38 (`saveSnapshot`), L97-99 (`updateItem`)

**Prevention:**
1. Take the snapshot inside the functional `setEstimate(prev => ...)` updater instead, where `prev` is
   always the committed state, not a closure value.
2. Or use `useRef` to always access the latest estimate for snapshot purposes.

**Warning signs:**
- Undo restores to an unexpected state (not the one the user saw before the action)
- Snapshot list shows duplicate entries

**Phase:** Medium priority — fix before changelog/undo feature is used heavily.

---

### Pitfall 9: Inline Cell Edit Events Fire During Voice Processing

**What goes wrong:** The CONCERNS doc notes that UI inline editing is currently broken. The likely cause:
`updateItem` → `setEstimate` → React re-renders WorkSheet → InlineCell loses focus → `onBlur` fires
again → `updateItem` called with the pre-focus value → overwrites the just-applied voice command.

This is the classic "voice and manual edit fight over state" problem. Voice applies a command, React
re-renders with the new value, the focused cell re-renders, blur fires with the old value, and the
voice change is immediately overwritten.

**Prevention:**
1. Debounce inline cell commits: only commit on explicit blur + value actually changed from what's in
   state.
2. Compare `newValue !== currentItemValue` before calling `updateItem` in the `onBlur` handler.
3. Use `useRef` to track "this cell is being actively edited" and suppress voice commands that target
   the same item while a cell is focused.

**Warning signs:**
- Typing a value in a cell and seeing it revert immediately
- Voice command appears to work (TTS confirms) but the cell shows the old value

**Phase:** Fix as part of inline editing work.

---

### Pitfall 10: P매트릭스 Silent Zero Fallback Produces Invalid Estimates

**What goes wrong:** When `priceData.ts` can't find matching data, it returns `[0,0,0]` arrays silently.
`buildItems` uses these zeros to compute all unit costs. The resulting estimate shows 0 won for every
line item. `grand_total` is 0. The user sees a blank estimate with no indication anything went wrong.

**Code location:** `lib/estimate/priceData.ts` L17-21

**Consequences:**
- User completes voice flow, estimate is "created", but all prices are 0.
- If autosaved immediately (before user notices), the zeros are persisted to DB.
- A voice command "현재 상태 알려줘" would TTS "총액 0원" — deeply confusing.

**Prevention:**
1. When `getPD` returns fallback zeros, throw an error that propagates to the UI and TTS: "가격 데이터를
   불러오지 못했습니다. 설정에서 P매트릭스를 확인하세요."
2. Block autosave when `grand_total === 0` and sheets have items (this is an impossible legitimate state).
3. Add a warning indicator in the MarginGauge or sheet header when prices are all zero.

**Warning signs:**
- All line items showing 0원 in the estimate table
- `grand_total` = 0 with a non-empty item list
- console.warn "P매트릭스에 ... 데이터 없음" appearing

**Phase:** Fix concurrently with P매트릭스 RLS fix.

---

## Minor Pitfalls

### Pitfall 11: Korean Number Parser Mishandles Edge Cases

**What goes wrong:** `parseKoreanNumber("삼만")` → `30000`. But `parseKoreanNumber("삼만오천")` goes
through `parseSimpleKorean("오천")` which returns 5000, giving `30000 + 5000 = 35000` correctly.
However, `parseKoreanNumber("삼만오")` → `parseSimpleKorean("오")` returns 5 (not 5000), giving
`30005`. Users saying "삼만오" mean 35000 but get 30005.

**Prevention:** If the lower part of a "만" split is a single digit (1-9) and the context is ppp,
multiply by 1000 (treat as "천 단위" shorthand). Add test cases: "삼만오", "이만삼", "사만오천".

**Warning signs:** `complexPpp` or `urethanePpp` values like 30005, 20003 appearing in estimates.

**Phase:** Fix during voice guide validation.

---

### Pitfall 12: Sort Order Becomes Inconsistent After Item Delete

**What goes wrong:** CONCERNS doc notes: when item at index 3 is deleted, remaining items keep their
original `sort_order` values (1, 2, 4, 5...). The gap is harmless for display (ORDER BY sort_order works),
but when `updateItem` uses `itemIndex` (array index) to reference items, the array index and `sort_order`
are no longer aligned. After enough deletes, `items[3].sort_order` might be 5, creating confusion for
any code that assumes array position == sort_order.

**Prevention:** Renormalize `sort_order` immediately after every delete: `items.forEach((it, i) => it.sort_order = i + 1)`.

**Warning signs:** Items appearing out of order after delete+add cycles; sort_order values like 1, 2, 4, 5 with a gap.

**Phase:** Fix during voice command implementation (add_item/remove_item).

---

### Pitfall 13: `blobToBase64` Uses String Concatenation for Large Buffers

**What goes wrong:** `blobToBase64` in `useVoice.ts` builds a binary string with `binary += String.fromCharCode(bytes[i])` in a loop. For audio recordings >1MB, this creates millions of string concatenations, causing garbage collection pressure and UI jank during processing.

**Prevention:** Replace with `Buffer.from(buffer).toString('base64')` (server-side) or use `FileReader.readAsDataURL` which is browser-native and optimized for large blobs.

**Warning signs:** UI freezes for 0.5-2 seconds immediately after stopping recording.

**Phase:** Low priority — fix when recording duration extends beyond 30 seconds.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Voice guide → estimate creation | Pitfall 2 (skipLlm stale) | Fix voiceFlowRef timing before guide testing |
| Car/tablet testing | Pitfall 3 (TTS→mic feedback) | Add isPlayingRef guard before first car test |
| Inline editing | Pitfall 9 (blur vs voice conflict) | Debounce + value comparison in onBlur |
| Voice modify commands | Pitfall 4 (concurrent LLM calls) | processingRef guard in processAudio |
| Autosave under network load | Pitfall 1 (delete/insert data loss) | Upsert-by-id before relying on autosave |
| P매트릭스 configuration | Pitfall 10 (silent zero fallback) | Error surfacing + autosave block on zero |
| Undo/changelog feature | Pitfall 8 (stale snapshot) | Snapshot inside functional updater |
| Multi-utterance sessions | Pitfall 5 (ref/state desync) | Single source of truth in voiceFlow |

---

## Sources

- Codebase analysis: `hooks/useAutoSave.ts`, `hooks/useVoice.ts`, `hooks/useEstimate.ts`,
  `lib/voice/voiceFlow.ts`, `components/estimate/EstimateEditor.tsx`
- `.planning/codebase/CONCERNS.md` — 2026-03-30 audit
- [Designing concurrent pipelines for real-time voice AI — Gladia](https://www.gladia.io/blog/concurrent-pipelines-for-voice-ai)
- [Voice Agent Architecture: STT, LLM, and TTS Pipelines — LiveKit](https://livekit.com/blog/voice-agent-architecture-stt-llm-tts-pipelines-explained)
- [useState Race Conditions in React — Medium](https://leo88.medium.com/usestate-race-conditions-gotchas-in-react-and-how-to-fix-them-48f0cddb9702)
- [Understanding useRef Lifecycle — Wavether (2025)](https://www.wavether.com/blog/2025/07/21/understanding-the-lifecycle-of-useref-in-react-and-avoiding-stale-reference-bugs/)
- [Supabase Upsert Documentation](https://supabase.com/docs/reference/javascript/upsert)
- Confidence: HIGH for pitfalls 1-5 (direct code evidence), MEDIUM for pitfalls 6-13 (pattern-based inference)
