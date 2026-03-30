# Phase 1: 음성 파이프라인 연결 - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

음성 발화 → 파싱 → 견적서 테이블 반영 → TTS 피드백 end-to-end 동작. 기존 코드의 끊어진 파이프라인을 연결하는 Phase. 신규 기능 추가가 아닌 연결 복구.

Requirements: VOICE-01, VOICE-02, VUX-01

</domain>

<decisions>
## Implementation Decisions

### 음성 가이드 플로우 UX
- **D-01:** 첫 발화에서 `parseAllFields()`로 4필드 전부 추출 시도. 다 채워지면 즉시 시트 생성, 빈 것만 순차 질문. 현재 코드(`voiceFlow.ts`) 방식 유지.
- **D-02:** TTS 질문 후 1.5초(`AUTO_RESUME_DELAY`) 후 자동 녹음 재개. 터치 0회 유지. 현재 `useVoiceFlow.ts`의 자동 재개 방식 유지.
- **D-03:** "됐어"/"넘겨" 마디 넘기기 시 현재 필드를 0으로 채우고 다음 필드로. null로 남기지 않음.
- **D-04:** 플로우 완료 후 복합+우레탄 시트 둘 다 생성. complexPpp=0이거나 urethanePpp=0이어도 시트 생성. CLAUDE.md 설계 기준.

### Claude's Discretion
- TTS 피드백 내용: 각 단계에서 TTS가 읽는 내용 범위 (필드 확인, 총액 변화, 다음 질문 안내)는 CLAUDE.md §4-5 패턴을 기본으로 하되, 자연스러운 흐름을 위해 조정 가능
- 에러/재시도 처리: STT 실패, LLM 파싱 실패, 네트워크 오류 시 동작 방식 — Phase 1에서는 기본 에러 메시지 + 재시도 안내 수준
- voiceFlow stateRef/useState 동기화 수정 방법: STATE.md에 플래그된 이슈. 구현 방식은 Claude 판단

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 음성 플로우 핵심 파일
- `lib/voice/voiceFlow.ts` — 플로우 상태 기계, parseAllFields, parseFlowInput, 마디 넘기기/취소 명령 감지
- `hooks/useVoiceFlow.ts` — 플로우 훅 (startFlow, processText, AUTO_RESUME_DELAY)
- `hooks/useVoice.ts` — 녹음+STT+LLM+TTS 통합 훅 (VoiceStatus, VoiceMode, 콜백)
- `lib/voice/prompts.ts` — extract/supplement/modify/command 모드 시스템 프롬프트

### 견적서 핵심 파일
- `components/estimate/EstimateEditor.tsx` — 메인 오케스트레이터 (음성+편집 연결)
- `hooks/useEstimate.ts` — 견적서 state 관리 (initFromVoiceFlow, applyVoiceCommands)
- `lib/estimate/buildItems.ts` — P매트릭스 → 공종 항목 생성
- `lib/estimate/calc.ts` — 소계→잡비→이윤→절사 계산

### API 라우트
- `app/api/stt/route.ts` — OpenAI Whisper 프록시
- `app/api/llm/route.ts` — Claude Sonnet 프록시
- `app/api/tts/route.ts` — OpenAI TTS 프록시

### 프로젝트 설계
- `CLAUDE.md` §4 (음성 시스템 설계) — 4모드, 확신도, TTS 피드백 패턴
- `.planning/REQUIREMENTS.md` — VOICE-01, VOICE-02, VUX-01 정의
- `.planning/codebase/CONCERNS.md` — voiceFlow stateRef 동기화 이슈

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `voiceFlow.ts`: 완성된 상태 기계 + 파싱 로직 (parseAllFields, parseFlowInput, parseKoreanNumber)
- `useVoice.ts`: STT/LLM/TTS 파이프라인 훅 — 녹음, API 호출, 오디오 재생 이미 구현
- `useVoiceFlow.ts`: 플로우 관리 훅 — startFlow, processText, 자동 재개 로직
- `useEstimate.ts`: `initFromVoiceFlow()` 메서드 존재 — FlowState → 시트 생성 연결점
- `buildItems.ts`: P매트릭스 보간 → 공종 항목 배열 생성 (핵심 비즈니스 로직)
- `VoiceBar` 컴포넌트: 하단 고정 바 UI 이미 존재

### Established Patterns
- MediaRecorder → webm/opus → base64 → POST /api/stt → text
- 콜백 ref 패턴: useVoice에서 options를 callbacksRef로 관리하여 의존성 문제 방지
- 상태 동기화: stateRef + useState 이중 관리 (동기화 불안정 이슈 있음)

### Integration Points
- `EstimateEditor.tsx`에서 useVoice + useVoiceFlow + useEstimate 연결
- `initFromVoiceFlow(flowState, priceMatrix)`: FlowState → Estimate 변환 핵심 연결점
- `addLog()`: 음성 로그 UI 표시

</code_context>

<specifics>
## Specific Ideas

No specific requirements — 현재 코드의 끊어진 연결을 복구하는 것이 핵심. CLAUDE.md §4-5의 설계를 따름.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-voice-pipeline*
*Context gathered: 2026-03-30*
