---
phase: 02-voice-edit-loop
plan: "01"
subsystem: voice
tags: [refactor, voice, edit-mode, wake-word]
dependency_graph:
  requires: []
  provides: [useEstimateVoice, useVoiceEditMode, wake-word-edit]
  affects: [EstimateEditor, useWakeWord, useVoice]
tech_stack:
  added: []
  patterns: [callbacksRef-stale-closure, editModeRef-sync, lazy-init-resend]
key_files:
  created:
    - hooks/useEstimateVoice.ts
    - hooks/useVoiceEditMode.ts
  modified:
    - components/estimate/EstimateEditor.tsx
    - hooks/useWakeWord.ts
    - hooks/useVoice.ts
    - lib/email/sendEstimate.ts
decisions:
  - "useEstimateVoice uses voicePlayTtsRef to break circular dependency between handleVoiceCommands and voice.playTts"
  - "editModeRef synced each render for onSttText stale-closure-safe access to isEditMode/exitEditMode"
  - "onSttText returns boolean to short-circuit LLM pipeline for '그만'/'종료' detection"
  - "Resend client lazy-initialized to fix pre-existing build failure when RESEND_API_KEY not set"
metrics:
  duration: ~45min
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 6
---

# Phase 2 Plan 01: useEstimateVoice 추출 + 수정 모드 루프 Summary

EstimateEditor에서 음성 관련 로직을 useEstimateVoice 훅으로 추출하고, "수정" 웨이크워드로 진입하는 수정 모드 상태 기계(useVoiceEditMode)를 구현하여 TTS 완료 2초 후 자동 녹음 재개 루프를 완성했다.

## What Was Built

### Task 1: useEstimateVoice 훅 추출 + EstimateEditor 경량화
- `hooks/useEstimateVoice.ts` (신규, 205줄): EstimateEditor에서 음성 관련 로직 전체 추출
  - handleVoiceCommands (시스템 명령 + modify 명령 라우팅)
  - useVoice 훅 호출
  - useVoiceEditMode 훅 호출 및 배선
  - useWakeWord 훅 호출 (onEditMode 콜백 연결)
  - onSttText에서 "그만"/"종료"/"멈춰" 감지 → LLM 건너뜀
- `components/estimate/EstimateEditor.tsx` (축소, 195줄 → CLAUDE.md 200줄 제한 준수)
  - playTtsRef 패턴으로 handleSave/handleEmail에서 voice.playTts 참조

### Task 2: useVoiceEditMode + useWakeWord 수정 키워드
- `hooks/useVoiceEditMode.ts` (신규, 96줄): 수정 모드 상태 기계
  - isEditMode/enterEditMode/exitEditMode
  - AUTO_RESUME_DELAY=2000ms: (speaking|processing)→idle 전환 감지 시 자동 녹음 재개
  - callbacksRef 패턴으로 stale closure 방지
- `hooks/useWakeWord.ts` (수정, 161줄): Web Speech API 웨이크워드 감지 추가
  - "수정" 키워드 → onEditMode 콜백 (수정 모드 우선)
  - "견적"/"시작" 키워드 → onWakeWord 콜백
- `hooks/useVoice.ts` (수정): onSttText 콜백 추가 (STT 결과를 LLM 전에 인터셉트)

## Key Architecture Decisions

| 결정 | 이유 |
|------|------|
| voicePlayTtsRef 패턴 | voice.playTts와 handleVoiceCommands 순환 참조 방지 |
| editModeRef 동기화 | onSttText 클로저 내 최신 isEditMode/exitEditMode 참조 |
| onSttText → boolean | "그만" 감지 시 LLM API 호출 없이 즉시 처리 |
| Resend lazy-init | 빌드 시 RESEND_API_KEY 없어도 빌드 성공 |

## Voice Edit Loop Flow

```
Web Speech API 상시 감지
→ "수정" 감지 → onEditMode → enterEditMode()
→ TTS: "수정 모드입니다. 말씀하세요."
→ voiceStatus: idle (TTS 완료)
→ useVoiceEditMode useEffect: speaking→idle 전환 감지
→ 2초 후 voice.startRecording() 자동 호출
→ 녹음 → STT → onSttText 체크 ("그만"이면 LLM 건너뜀)
→ (수정 명령) LLM → handleVoiceCommands → applyVoiceCommands
→ TTS 피드백 (useVoice.handleModifyResponse)
→ voiceStatus: speaking → idle
→ [자동 재개 루프]
→ "그만" 감지 → exitEditMode() → 종료
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bug] Resend 모듈 수준 초기화로 빌드 실패**
- **Found during:** Task 2 build verification
- **Issue:** `lib/email/sendEstimate.ts`가 모듈 로드 시 `new Resend(process.env.RESEND_API_KEY)`를 실행하여 빌드 환경에 RESEND_API_KEY 없을 때 에러
- **Fix:** getResend() 함수로 lazy initialization 패턴 적용
- **Files modified:** lib/email/sendEstimate.ts
- **Commit:** 45b0a0f

### Plan Adaptations

**useVoiceFlow 없음**: 이 worktree에는 hooks/useVoiceFlow.ts가 없어 plan의 voiceFlow 관련 인터페이스(initFromVoiceFlow, snapshots, restoreTo)를 생략했다. useEstimate의 실제 API(pushUndo/undo)를 사용하여 구현.

**ESLint 미설정**: 프로젝트에 .eslintrc가 없어 `npm run lint` 불가. TypeScript 컴파일 + `npm run build`로 검증 완료.

## Self-Check

Files created/modified:
- hooks/useEstimateVoice.ts: FOUND
- hooks/useVoiceEditMode.ts: FOUND
- components/estimate/EstimateEditor.tsx: 195 lines (UNDER 200)
- hooks/useWakeWord.ts: FOUND (with onEditMode callback)
- hooks/useVoice.ts: FOUND (with onSttText callback)

Commits:
- 32b887a: feat(02-01): extract voice logic to useEstimateVoice + slim EstimateEditor
- 45b0a0f: feat(02-01): wire useVoiceEditMode + edit mode loop + fix Resend lazy-init

## Self-Check: PASSED
