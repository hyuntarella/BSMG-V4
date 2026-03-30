# Phase 2: 음성 편집 루프 - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

이미 만든 견적서를 음성으로 자유롭게 수정할 수 있다. modify 모드로 단가/공종을 음성으로 수정, 확신도 분기 + 컨텍스트 유지 대화 + undo. 기존 코드의 핵심 로직(commands.ts, confidenceRouter.ts, prompts.ts)은 구현되어 있으나 EstimateEditor에 연결되지 않은 상태.

Requirements: VOICE-03, VOICE-04, VOICE-05, VOICE-06, VOICE-07, VOICE-08, VUX-02, VUX-03, VUX-04, VUX-05

</domain>

<decisions>
## Implementation Decisions

### 수정 모드 진입/종료 플로우
- **D-01:** "수정" 웨이크워드로만 수정 모드 진입. Web Speech API가 견적서 페이지에서 상시 감지. "견적"과 "수정" 두 키워드를 동시 감지.
- **D-02:** 견적서 생성 직후에는 정지 대기 상태. 자동 수음 재개 없음. "수정" 웨이크워드를 말해야만 수정 모드로 전환.
- **D-03:** 수정 모드 안에서만 TTS 완료 후 2초 뒤 자동 수음 재개 (AUTO_RESUME_DELAY = 2000). 연속 수정 가능.
- **D-04:** "그만"/"종료"/VAD 무음 감지 = 완전 정지. 수정 모드 해제 + 수음 중지.
- **D-05:** VAD 무음 감지: 5초 무음(-35dB)으로 자동 정지. 수정 모드에서만 작동.

### 확신도 분기 UX
- **D-06:** 기존 confidenceRouter.ts 그대로 사용 (95%/70% 임계값). CLAUDE.md §4-3 설계 기준.
- **D-07:** 중간 확신도(70-95%)에서 "아니" 응답 시 → 해당 명령 undo (직전 스냅샷 복원) + TTS "되돌렸습니다".
- **D-08:** 되묻기 연속 2회 제한 (MAX_CLARIFICATION_COUNT = 2). 이미 useVoice.ts에 구현됨.

### 컨텍스트 유지 대화
- **D-09:** 직전 3개 명령을 recentCommandsRef로 추적. 이미 useVoice.ts에 구현됨. LLM 프롬프트에 직전 명령 전달.
- **D-10:** "그거 올려" 같은 참조는 LLM이 직전 명령의 target을 유추. 클라이언트 로직 불필요 — LLM 프롬프트(getModifySystem)에서 처리.

### 음성 undo
- **D-11:** "취소"/"되돌려" → 직전 스냅샷으로 복원. useEstimate.ts의 saveSnapshot + restoreTo 사용.
- **D-12:** 모든 음성 명령 실행 전에 스냅샷 저장. 연속 취소로 여러 단계 되돌리기 가능.

### 시스템 명령
- **D-13:** "저장해줘", "우레탄 탭으로", "현재 상태 알려줘", "마진 얼마야?", "복합 우레탄 비교해줘" 등 command 모드는 수정 모드 내에서 동작. 별도 진입 불필요.

### Claude's Discretion
- TTS 피드백 문구 세부 조정 (CLAUDE.md §4-5 패턴 기반)
- Web Speech API 웨이크워드 감지 세부 구현 (기존 useWakeWord.ts 확장)
- VAD AudioWorklet vs AnalyserNode 구현 방식 선택
- 확신도 중간(70-95%) 확인 후 사용자 응답 파싱 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 음성 편집 핵심 파일
- `lib/voice/commands.ts` — applyCommand/applyCommands: update_item, add_item, remove_item, bulk_adjust, set_grand_total 구현
- `lib/voice/confidenceRouter.ts` — routeConfidence: 3단계 확신도 분기 (95%/70%)
- `lib/voice/prompts.ts` — getModifySystem: modify 프롬프트 + 직전 3개 명령 컨텍스트
- `hooks/useVoice.ts` — handleModifyResponse: 확신도 분기 + 되묻기 카운트 + recentCommandsRef
- `hooks/useEstimate.ts` — saveSnapshot, restoreTo: undo 기반, applyVoiceCommands 연결점

### 음성 플로우 핵심 파일
- `lib/voice/voiceFlow.ts` — 플로우 상태 기계, parseAllFields
- `hooks/useVoiceFlow.ts` — 가이드 수집 플로우 훅
- `hooks/useWakeWord.ts` — 웨이크워드 감지 (현재 "견적" 키워드)

### 견적서 연결점
- `components/estimate/EstimateEditor.tsx` — 메인 오케스트레이터 (음성+편집 연결)
- `lib/estimate/buildItems.ts` — P매트릭스 → 공종 항목 생성
- `lib/estimate/calc.ts` — 소계→잡비→이윤→절사 계산

### 프로젝트 설계
- `CLAUDE.md` §4 (음성 시스템 설계) — 4모드, 확신도, TTS 피드백 패턴, modify 명령 목록
- `CLAUDE.md` §4-4 (컨텍스트 유지 대화) — 직전 3개 명령 추적 예시
- `.planning/REQUIREMENTS.md` — VOICE-03~08, VUX-02~05 정의

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `commands.ts`: 6개 action 타입 전부 구현됨 (update_item, add_item, remove_item, bulk_adjust, set_grand_total, reorder_item)
- `confidenceRouter.ts`: routeConfidence + routeCommands 완성
- `prompts.ts`: getModifySystem + COMMAND_SYSTEM 완성
- `useVoice.ts`: handleModifyResponse (확신도 분기 + 되묻기 2회 제한 + recentCommands 추적)
- `useEstimate.ts`: saveSnapshot/restoreTo (undo), applyVoiceCommands 메서드 존재
- `useWakeWord.ts`: Web Speech API "견적" 감지 이미 구현 — "수정" 키워드 추가만 필요

### Established Patterns
- Phase 1에서 확립: voiceFlowRef.current.isActive → flowActive useState 동기화 패턴
- callbacksRef 패턴: useVoice에서 options를 ref로 관리하여 의존성 문제 방지
- skipLlm 패턴: voiceFlow 활성 시 LLM 건너뛰기 — 수정 모드에서는 skipLlm=false

### Integration Points
- `EstimateEditor.tsx`에서 useVoice의 onCommands 콜백 → useEstimate.applyVoiceCommands 연결 필요
- useVoice의 mode를 'modify'로 전환하는 트리거 필요 (웨이크워드 "수정")
- useWakeWord에 "수정" 키워드 추가 + 수정 모드 진입 콜백

</code_context>

<specifics>
## Specific Ideas

- 수정 모드 진입 시 TTS: "수정 모드입니다. 말씀하세요." (짧고 간결)
- 수정 완료 후 TTS: 항상 변경 내용 + 총액 변화 읽기 (CLAUDE.md 패턴)
- VAD는 수정 모드에서만 작동 — 가이드 플로우 중에는 VAD 없음 (AUTO_RESUME_DELAY로 처리)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-voice-edit-loop*
*Context gathered: 2026-03-30*
