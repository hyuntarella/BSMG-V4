---
phase: 02-voice-edit-loop
plan: "02"
subsystem: voice
tags: [voice, vad, confidence, react-hooks, analysernode]

# Dependency graph
requires:
  - phase: 02-voice-edit-loop/02-01
    provides: useEstimateVoice hub + useVoiceEditMode state machine + useWakeWord

provides:
  - "pendingConfirm useState in useEstimateVoice — reactive skipLlm for medium confidence confirm loop"
  - "clearLastCommand() in useVoice — removes last recentCommandsRef entry on undo after 아니 response"
  - "resetClarificationCount() in useVoice — resets clarificationCountRef on edit mode exit"
  - "handleExitEditMode wrapper — exitEditMode + resetClarificationCount + setPendingConfirm(false)"
  - "read_summary system command — TTS reads sheet type/area/items/total/margin"
  - "read_margin system command — TTS reads current sheet margin percentage"
  - "update_meta system command — routes to updateMeta() with TTS feedback"
  - "VAD in useVoiceEditMode — AnalyserNode 5s silence → stopRecording + exitEditMode"
  - "enableVad feature flag — disable VAD for Galaxy Tab dual-stream issues"

affects: [Phase 03-save, components/estimate/EstimateEditor.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pendingConfirm useState + skipLlm prop: reactive LLM skip for multi-turn confirm flow"
    - "onSttText returning true as LLM skip gate (callbacksRef pattern for always-fresh closure)"
    - "AnalyserNode VAD in separate useEffect with active flag + vadCleanupRef teardown"
    - "handleExitEditMode wrapper pattern: compose multiple reset actions at exit boundary"

key-files:
  created: []
  modified:
    - hooks/useVoice.ts
    - hooks/useVoiceEditMode.ts
    - hooks/useEstimateVoice.ts
    - components/estimate/EstimateEditor.tsx

key-decisions:
  - "Use pendingConfirmRef.current inside onSttText callback (always-fresh) alongside pendingConfirm useState (reactive skipLlm prop) — dual mechanism ensures no LLM call during confirm wait"
  - "enableVad defaults to true but is optional: Galaxy Tab may have dual getUserMedia stream issues"
  - "exitEditMode is useCallback in useVoiceEditMode so VAD effect can reference it without stale closure"
  - "handleExitEditMode wrapper exported from useEstimateVoice.editMode.exitEditMode — callers always get the reset-bundled version"

patterns-established:
  - "Dual confirm guard: useState (triggers re-render → skipLlm prop update) + Ref (always-fresh in callback)"
  - "VAD pattern: separate getUserMedia stream, AnalyserNode, requestAnimationFrame loop, active flag, cleanup ref"

requirements-completed:
  - VOICE-07
  - VOICE-08
  - VUX-04
  - VUX-05

# Metrics
duration: 25min
completed: 2026-03-30
---

# Phase 02 Plan 02: Confidence UX Completion + VAD Summary

**3-level confidence UX complete (pendingConfirm useState + skipLlm + undo/clearLastCommand), read_summary/read_margin/update_meta system commands added, and AnalyserNode VAD (5s silence auto-exit) integrated with enableVad feature flag**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-30T09:30:00Z
- **Completed:** 2026-03-30T09:55:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Medium confidence confirm loop: after executing a medium-confidence command, `pendingConfirm=true` → `skipLlm=true` → next STT checked client-side for "아니" regex → undo + clearLastCommand on negative, normal flow on positive
- System commands `read_summary`, `read_margin`, `update_meta` now handled in `handleVoiceCommands` switch — TTS delivers area/items/total/margin feedback and routes meta field changes
- VAD: AnalyserNode on separate audio stream monitors silence in recording state; 5s below -35dB → `stopRecording()` + `exitEditMode()` with full cleanup via `vadCleanupRef`
- `handleExitEditMode` wrapper ensures `resetClarificationCount()` and `setPendingConfirm(false)` always fire on exit — VOICE-08 clarification reset guaranteed

## Task Commits

1. **Task 1: pendingConfirm useState + clearLastCommand/resetClarification + system commands** - `fda1e18` (feat)
2. **Task 2: VAD 5초 무음 감지를 useVoiceEditMode에 통합** - `8bbe898` (feat)

## Files Created/Modified
- `hooks/useVoice.ts` - Added skipLlm prop + skipLlmRef, clearLastCommand(), resetClarificationCount()
- `hooks/useVoiceEditMode.ts` - Full VAD implementation with AnalyserNode, enableVad flag, onStopRecording option, exitEditMode as useCallback
- `hooks/useEstimateVoice.ts` - pendingConfirm useState, medium confidence detection, onSttText confirm check, handleExitEditMode wrapper, read_summary/read_margin/update_meta commands, getSheetMargin wiring
- `components/estimate/EstimateEditor.tsx` - Pass getSheetMargin to useEstimateVoice

## Decisions Made
- `pendingConfirm` is both useState (for reactive skipLlm prop) AND mirrored to `pendingConfirmRef` (for always-fresh onSttText callback) — dual mechanism is intentional defense against render timing race
- `exitEditMode` changed to `useCallback` in useVoiceEditMode so the VAD `useEffect` can reference it in its dependency array without causing stale closure issues
- VAD uses a separate `getUserMedia` call rather than sharing the recording stream to avoid AudioContext interference; `enableVad` flag provides escape hatch for Galaxy Tab testing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added onStopRecording/enableVad to UseVoiceEditModeOptions before Task 1 complete**
- **Found during:** Task 1 (TypeScript type check after adding onStopRecording to useVoiceEditMode call)
- **Issue:** TypeScript error TS2353 — property 'onStopRecording' not yet in interface since Task 2 adds it
- **Fix:** Added both options to the interface during Task 1 to unblock compilation
- **Files modified:** hooks/useVoiceEditMode.ts
- **Verification:** `npx tsc --noEmit` passes after fix
- **Committed in:** fda1e18 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — type interface added early)
**Impact on plan:** No scope creep. Type interface addition was inevitable, just sequenced into Task 1 to unblock build.

## Issues Encountered
None beyond the TypeScript blocking issue above.

## Known Stubs
None — all system commands wire to real state (getSheetMargin, updateMeta, undo) and produce real TTS output.

## Next Phase Readiness
- Phase 02 voice-edit-loop complete: all VOICE-07/08 and VUX-04/05 requirements satisfied
- Phase 03 (save/export) can proceed — useEstimateVoice stable, voice command routing complete
- Galaxy Tab VAD testing should be done before Phase 03; set `enableVad={false}` if dual-stream issues found

---
*Phase: 02-voice-edit-loop*
*Completed: 2026-03-30*
