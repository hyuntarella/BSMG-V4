---
phase: 01-voice-pipeline
plan: 02
subsystem: voice
tags: [tts, voice-flow, estimate-calc, buildItems, e2e-verification]

# Dependency graph
requires:
  - phase: 01-01
    provides: "stable voiceFlow pipeline with skipLlm reactivity and idle/done guard"
provides:
  - "onComplete callback calculates grand_total via buildItems and reads it aloud via TTS"
  - "TTS feedback: '견적서 생성 완료. 면적 N제곱미터. 복합 N만원, 우레탄 N만원.'"
  - "Full voice pipeline E2E verified by user (extract → parse → build → TTS total)"
affects:
  - "02-voice-edit"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onComplete grand_total pattern: call buildItems directly inside callback rather than reading estimate.sheets (React setState is async, sheets not yet updated at callback time)"

key-files:
  created: []
  modified:
    - "components/estimate/EstimateEditor.tsx"

key-decisions:
  - "Compute grand_total inside onComplete via buildItems() instead of reading estimate.sheets — setState is async so sheets[].grand_total would be stale at callback time"
  - "formatWon helper converts raw number to 만원 unit Korean string inline in onComplete, matching CLAUDE.md TTS feedback patterns"

patterns-established:
  - "Async state read pattern: when React state won't be updated yet, re-derive computed values from source inputs rather than reading state"

requirements-completed:
  - VUX-01

# Metrics
duration: ~15min
completed: 2026-03-30
---

# Phase 01 Plan 02: 총액 TTS 피드백 + E2E 검증 Summary

**onComplete callback now calls buildItems directly to compute 복합/우레탄 grand_total and reads it aloud via TTS, completing the voice-to-estimate feedback loop**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T07:49:00Z
- **Completed:** 2026-03-30T08:05:00Z
- **Tasks:** 2 of 2 (1 auto + 1 human-verify)
- **Files modified:** 1

## Accomplishments
- `onComplete` in EstimateEditor.tsx now imports `buildItems` and `getAR`, computes grand_total for both 복합 and 우레탄 sheets immediately (bypassing async setState), and plays TTS: "견적서 생성 완료. 면적 N제곱미터. 복합 N만원, 우레탄 N만원."
- User verified full E2E pipeline: voice recording → STT → voiceFlow parsing → initFromVoiceFlow → sheet generation → TTS total feedback → idle (no auto-resume)
- VUX-01 requirement satisfied: all voice input now produces TTS confirmation with total amount

## Task Commits

1. **Task 1: 음성 가이드 완료 후 총액 TTS 피드백 추가** - `9759aa4` (feat)
2. **Task 2: 음성 파이프라인 E2E 검증** - human-verify (approved by user, no code commit)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `components/estimate/EstimateEditor.tsx` - Added buildItems + getAR imports; onComplete now computes grand_total and plays TTS with area + 복합/우레탄 totals

## Decisions Made
- Computed grand_total inside onComplete using `buildItems()` directly rather than reading `estimate.sheets` — React `setState` is asynchronous so `estimate.sheets` still holds old data at callback invocation time. Re-deriving from `state.area / complexPpp / urethanePpp` ensures accurate totals.
- Used inline `formatWon` helper converting raw number to 만원 unit Korean string, matching CLAUDE.md TTS feedback pattern: "복합 580만원, 우레탄 420만원."

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 01 complete: voice extract pipeline (area/wall/ppp collection → sheet build → TTS total) is fully operational and user-verified
- Ready for Phase 02: voice modify loop (단가 변경, 공종 추가/삭제, 확신도 분기, undo)
- Known concern carried from 01-01: P매트릭스 RLS fallback to zeros should be re-verified when creating a new estimate from scratch (not just existing seed data)

---
*Phase: 01-voice-pipeline*
*Completed: 2026-03-30*
