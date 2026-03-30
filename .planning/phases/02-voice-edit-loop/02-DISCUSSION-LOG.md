# Phase 2: 음성 편집 루프 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 02-voice-edit-loop
**Areas discussed:** 수정 모드 진입/종료 플로우

---

## 수정 모드 진입/종료 플로우

### 웨이크워드 감지 방식

| Option | Description | Selected |
|--------|-------------|----------|
| Web Speech API 상시 감지 | 견적서 페이지에서 "수정"/"견적" 키워드 상시 감지. 배터리 소모 있지만 터치 0회 유지 | ✓ |
| 버튼 탭 + 음성 명령어 | 마이크 버튼 탭 → "수정 바탕정리..." 한 번에. 터치 1회 | |
| 볼륨 버튼 토글 | 볼륨업/다운으로 ON/OFF. 하드웨어 의존 | |

**User's choice:** Web Speech API 상시 감지
**Notes:** 터치 0회 목표에 부합

### 자동 수음 재개 타이밍

| Option | Description | Selected |
|--------|-------------|----------|
| TTS 완료 후 2초 | 메모리에 확정된 대로. 수정 모드에서만 작동 | ✓ |
| TTS 완료 즉시 | 빠르지만 TTS 음성을 STT가 잡을 수 있음 | |
| Web Speech API로 감지 | 자동 수음 대신 다음 명령어 감지로 Whisper 녹음 시작 | |

**User's choice:** TTS 완료 후 2초
**Notes:** 메모리에 이미 확정된 사항 재확인

### VAD 무음 감지

| Option | Description | Selected |
|--------|-------------|----------|
| 7초 무음 (-35dB) | 메모리 기존 기준 | |
| 5초 무음 | 수정 모드는 명령이 짧으니 5초면 충분 | ✓ |
| 10초 무음 | 더 느긋한 종료 | |

**User's choice:** 5초 무음
**Notes:** 수정 모드에서는 명령이 짧으므로 7초에서 5초로 단축

---

## Claude's Discretion

- 확신도 분기 UX: 기존 코드(confidenceRouter.ts) + CLAUDE.md 설계 그대로 연결
- 컨텍스트 유지 대화: recentCommandsRef (직전 3개) + LLM 프롬프트 처리
- VAD 구현 방식: AudioWorklet vs AnalyserNode 선택

## Deferred Ideas

None
