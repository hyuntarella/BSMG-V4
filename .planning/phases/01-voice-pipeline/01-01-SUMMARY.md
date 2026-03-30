---
phase: 01-voice-pipeline
plan: 01
subsystem: voice
tags: [react-hooks, state-management, voice-flow, skip-llm]

# Dependency graph
requires: []
provides:
  - "useVoiceFlow.processText with idle/done guard — discards late STT results safely"
  - "flowActive React state in EstimateEditor — makes skipLlm reactive to voiceFlow.isActive"
  - "Stable voiceFlow <-> useVoice <-> useEstimate connection"
affects:
  - "02-voice-pipeline"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "flowActive useState pattern: mirror a ref's boolean into React state so prop updates trigger re-render and downstream useEffect/ref sync"
    - "stateRef idle/done guard: async callbacks check ref before proceeding to prevent stale-closure race conditions"

key-files:
  created: []
  modified:
    - "hooks/useVoiceFlow.ts"
    - "components/estimate/EstimateEditor.tsx"

key-decisions:
  - "Use separate flowActive useState (not inline voiceFlowRef.current.isActive) so skipLlm prop triggers a React re-render that updates skipLlmRef inside useVoice"
  - "Guard processText with idle/done check using stateRef (not flowState) to avoid stale useState reads in async context"

patterns-established:
  - "Ref-to-state mirror: when a ref value must flow through React props, mirror it into useState via useEffect so downstream consumers get reactive updates"
  - "Async guard pattern: at start of useCallback async fn, read stateRef.current and early-return if state is terminal"

requirements-completed:
  - VOICE-01
  - VOICE-02

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 01 Plan 01: voiceFlow skipLlm Reactivity + processText Guard Summary

**flowActive useState mirrors voiceFlow.isActive to make skipLlm reactive, and processText now guards against idle/done state to discard late STT results**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-30T07:45:00Z
- **Completed:** 2026-03-30T07:53:00Z
- **Tasks:** 1 of 1
- **Files modified:** 2

## Accomplishments
- `flowActive` React state added to EstimateEditor — when voiceFlow activates, state triggers re-render, updating `skipLlmRef.current` inside useVoice so LLM calls are correctly skipped
- `processText` in useVoiceFlow now has an early-return guard: if `stateRef.current.step === 'idle' || 'done'`, the function exits immediately — prevents late-arriving STT audio from corrupting a completed flow
- Build passes cleanly with no TypeScript or lint errors

## Task Commits

1. **Task 1: useVoiceFlow stateRef 동기화 안정화 + skipLlm 반응성 보장** - `0b29a26` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `hooks/useVoiceFlow.ts` - Added idle/done guard at start of processText
- `components/estimate/EstimateEditor.tsx` - Added flowActive useState, useEffect sync, and changed skipLlm prop from stale ref read to reactive state

## Decisions Made
- Chose `useState` mirror over passing `voiceFlowRef.current.isActive` directly because React props only trigger `useEffect` (and thus `skipLlmRef` update) when the value changes as a React state — a ref value change doesn't schedule a render
- Kept `voiceFlowRef.current` pattern intact for `onSttText` callback routing (that path is already safe via `callbacksRef`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- voiceFlow pipeline is now stable end-to-end: flow activation disables LLM, late STT results are discarded
- Ready for Phase 01 Plan 02 (next plan in voice-pipeline phase)

---
*Phase: 01-voice-pipeline*
*Completed: 2026-03-30*
