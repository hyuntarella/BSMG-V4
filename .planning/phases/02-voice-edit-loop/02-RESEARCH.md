# Phase 2: 음성 편집 루프 - Research

**Researched:** 2026-03-30
**Domain:** Voice edit loop integration — wiring existing voice logic into EstimateEditor
**Confidence:** HIGH (all conclusions derived from direct code inspection, no external deps needed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: "수정" 웨이크워드로만 수정 모드 진입. Web Speech API가 견적서 페이지에서 상시 감지. "견적"과 "수정" 두 키워드를 동시 감지.
- D-02: 견적서 생성 직후에는 정지 대기 상태. 자동 수음 재개 없음. "수정" 웨이크워드를 말해야만 수정 모드로 전환.
- D-03: 수정 모드 안에서만 TTS 완료 후 2초 뒤 자동 수음 재개 (AUTO_RESUME_DELAY = 2000). 연속 수정 가능.
- D-04: "그만"/"종료"/VAD 무음 감지 = 완전 정지. 수정 모드 해제 + 수음 중지.
- D-05: VAD 무음 감지: 5초 무음(-35dB)으로 자동 정지. 수정 모드에서만 작동.
- D-06: 기존 confidenceRouter.ts 그대로 사용 (95%/70% 임계값).
- D-07: 중간 확신도(70-95%)에서 "아니" 응답 시 → 해당 명령 undo + TTS "되돌렸습니다".
- D-08: 되묻기 연속 2회 제한. 이미 useVoice.ts에 구현됨.
- D-09: 직전 3개 명령을 recentCommandsRef로 추적. 이미 useVoice.ts에 구현됨.
- D-10: "그거 올려" 같은 참조는 LLM이 직전 명령의 target을 유추.
- D-11: "취소"/"되돌려" → 직전 스냅샷으로 복원.
- D-12: 모든 음성 명령 실행 전에 스냅샷 저장.
- D-13: 시스템 명령(저장, 탭전환, 요약, 마진 등)은 수정 모드 내에서 동작.

### Claude's Discretion
- TTS 피드백 문구 세부 조정 (CLAUDE.md §4-5 패턴 기반)
- Web Speech API 웨이크워드 감지 세부 구현 (기존 useWakeWord.ts 확장)
- VAD AudioWorklet vs AnalyserNode 구현 방식 선택
- 확신도 중간(70-95%) 확인 후 사용자 응답 파싱 방식

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOICE-03 | modify 모드로 단가 변경(절대값/증감)이 가능하다 | commands.ts의 `update_item` 완전 구현됨. EstimateEditor의 `handleVoiceCommands` → `applyVoiceCommands` 연결 경로 확인. 수정 모드 진입 트리거만 추가하면 즉시 동작 |
| VOICE-04 | modify 모드로 공종 추가/삭제가 가능하다 | commands.ts의 `add_item`, `remove_item` 완전 구현됨. 동일 연결 경로 |
| VOICE-05 | modify 모드로 일괄 비율 조정이 가능하다 | commands.ts의 `bulk_adjust` 완전 구현됨 |
| VOICE-06 | modify 모드로 총액 역산이 가능하다 | commands.ts의 `set_grand_total` 완전 구현됨 |
| VOICE-07 | 확신도 3단계 분기가 동작한다 | confidenceRouter.ts 완성. `applyVoiceCommands`가 `routeCommands`를 호출하나, medium confidence 확인 응답("아니" 처리)은 미구현 — **새 구현 필요** |
| VOICE-08 | 되묻기 연속 2회 제한이 적용된다 | useVoice.ts의 `clarificationCountRef` + `MAX_CLARIFICATION_COUNT = 2` 이미 구현. **연결만 하면 동작** |
| VUX-02 | 직전 3개 명령 컨텍스트 유지하여 참조 발화가 동작한다 | `recentCommandsRef` 이미 useVoice.ts에 구현. `buildLlmPayload`에서 modify 모드 시 자동 전달됨. **연결만 하면 동작** |
| VUX-03 | 볼륨 버튼/웨이크워드로 녹음 활성화 가능하다 | useWakeWord.ts에 볼륨/Space/`"견적"` 구현됨. `"수정"` 키워드 추가 + 수정 모드 전환 콜백 연결 필요 |
| VUX-04 | 음성으로 시스템 명령(저장/탭전환/요약/비교)을 실행할 수 있다 | EstimateEditor의 `handleVoiceCommands`에 save/undo/compare/switch_tab/load 이미 구현. read_summary/read_margin 구현 누락 — **신규 구현 필요** |
| VUX-05 | 음성으로 실행 취소("취소"/"되돌려")가 가능하다 | useEstimate.ts에 `undo()` 구현. handleVoiceCommands에서 `undo` action 처리. voiceFlow의 `isCancelCommand`는 가이드 전용. modify 모드에서는 LLM이 "취소" → `{action: "undo"}` 명령을 생성하도록 프롬프트에 정의됨. **연결됨** |
</phase_requirements>

---

## Summary

Phase 2의 핵심 발견: **비즈니스 로직은 이미 완성되어 있다.** `commands.ts`, `confidenceRouter.ts`, `prompts.ts`, `useVoice.ts`, `useEstimate.ts` 모두 구현 완료 상태이며, EstimateEditor에 연결되지 않은 채로 존재한다.

현재 EstimateEditor는 `voiceMode`를 `estimate.sheets.length === 0 ? 'extract' : 'modify'`로 설정한다. 즉, 시트가 생성된 후에는 이미 `modify` 모드로 전환된다. 문제는 수정 모드 전용 상태 관리(모드 진입/종료, VAD, 자동 재개)가 없다는 점이다.

**주요 Gap 3가지:**

1. **수정 모드 상태 기계 없음** — "수정" 웨이크워드 → 수정 모드 진입 → TTS 완료 후 자동 재개 → "그만" 종료 흐름이 EstimateEditor에 없다. 이것이 Phase 2의 핵심 구현 대상.

2. **medium confidence 확인 응답 처리 없음** — "아니" 발화를 감지하여 undo를 실행하는 로직이 없다. `handleVoiceCommands`가 `onCommands` 콜백으로 호출되는데, medium confidence 명령 후 다음 발화가 "아니"인지 확인하는 분기가 필요.

3. **VAD 없음** — AnalyserNode 기반 5초 무음 감지가 아직 구현되지 않았다.

**Primary recommendation:** 수정 모드 상태 기계를 `useVoiceEditMode` 훅으로 분리 구현. EstimateEditor는 이 훅을 통해 수정 모드 진입/종료를 관리.

---

## Current State Analysis (파일별)

### `lib/voice/commands.ts` — 상태: 완전 구현, 연결 대기
- `applyCommand(sheet, command)`: update_item, add_item, remove_item, bulk_adjust, set_grand_total, reorder_item 6개 action 전부 구현
- `applyCommands(sheet, commands)`: 배열 순차 적용 + `calc()` 재계산 + `grand_total` 업데이트
- `findItem()`: 이름 부분 매칭 (exact, includes, 역방향 includes) — 한국어 공종명 퍼지 매칭 작동
- `recalcItem()`: qty × 단가 → amount 재계산
- **Gap**: `update_meta` action 미구현 — LLM 프롬프트에는 존재하지만 commands.ts switch문에 없음. `EstimateEditor.handleVoiceCommands`가 직접 처리하는 구조도 아님. **Phase 2에서 처리 필요**.

### `lib/voice/confidenceRouter.ts` — 상태: 완전 구현, 연결됨
- `routeConfidence(number)`: HIGH(≥0.95), MEDIUM(≥0.70), LOW(<0.70) 반환
- `routeCommands(commands[])`: 배열 중 최솟값으로 분기
- `useEstimate.applyVoiceCommands`에서 이미 `routeCommands` 호출하여 `shouldExecute` 체크 중
- **Gap**: MEDIUM 시 확인 응답 처리 없음. 현재 useVoice.handleModifyResponse는 `onCommands` 콜백만 호출하며, 이후 "맞습니까?" TTS를 재생하지만 다음 발화가 "아니"임을 감지하는 상태 없음.

### `lib/voice/prompts.ts` — 상태: 완전 구현
- `getModifySystem(estimateContext, recentCommands)`: 견적서 상태 + 직전 3개 명령을 컨텍스트로 전달
- `COMMAND_SYSTEM`: undo, save, switch_tab, read_summary, read_margin, compare, load, email 정의
- `getModifySystem`에 이미 `restore_to`, `set_margin`, `sync_urethane_05` action 정의됨
- **주의**: COMMAND_SYSTEM이 별도로 존재하지만, EstimateEditor는 `voiceMode = 'modify'`를 사용. 수정 모드에서는 getModifySystem이 시스템 명령도 처리하도록 설계됨 (save, switch_tab 등이 getModifySystem action 목록에 포함). 중복 정의이지만 일관성 있게 modify 모드로 통일.

### `hooks/useVoice.ts` — 상태: 완전 구현, 핵심 기능 준비됨
- `handleModifyResponse`: clarification_needed 분기 + 되묻기 2회 제한 + recentCommandsRef 추적 + TTS 재생 — **완성**
- `handleCommandResponse`: action + tts_response 처리 — **완성**
- `processAudio`: STT → LLM → mode별 분기 완성
- `callbacksRef` 패턴: options를 ref로 관리하여 stale closure 방지 — **이 패턴이 수정 모드 상태 기계에서도 사용되어야 함**
- **Gap 1**: `playTts` 후 자동 재개 (AUTO_RESUME_DELAY) 로직 없음. useVoice는 TTS 완료 후 `setStatus('idle')`만 함. 수정 모드에서 자동 재개는 **외부 훅에서 관리해야 함**.
- **Gap 2**: VAD 없음 — useVoice는 MediaRecorder를 수동 stop만 지원.
- **Gap 3**: medium confidence 확인 상태 없음 — "맞습니까?" 후 다음 발화 처리 전담 상태 없음.

### `hooks/useEstimate.ts` — 상태: 완전 구현, 연결됨
- `saveSnapshot()`: 변경 전 estimate를 스냅샷 배열에 추가
- `restoreTo(index)`: 특정 스냅샷으로 복원
- `undo()`: 마지막 스냅샷 pop + 복원 — `handleVoiceCommands`에서 `undo` action으로 호출됨
- `applyVoiceCommands(commands, sheetIndex)`: routeCommands → applyCommands → setState — 연결됨
- **Gap**: `applyVoiceCommands`는 `shouldExecute === false`일 때 `{ executed: false }` 반환하지만, EstimateEditor의 `handleVoiceCommands`는 이 반환값을 사용하지 않음. MEDIUM confidence 후 확인 대기 상태를 관리하려면 이 반환값을 활용해야 함.

### `hooks/useWakeWord.ts` — 상태: 부분 구현, "수정" 키워드 추가 필요
- 볼륨 Up/Down + Space 키 → `onToggle` 호출 — **완성**
- Web Speech API `"견적"` 감지 → `onWakeWord` 호출 — **완성**
- **Gap**: `"수정"` 키워드 감지 → 수정 모드 전환 콜백(`onEditMode`) 필요. 현재 단일 `onWakeWord` 콜백만 존재.
- `isCancelCommand` 감지 없음 — "그만"/"종료" 시 수정 모드 해제는 useVoice.stopSpeaking + 외부 상태 관리 필요
- `"수정"` 감지와 `"견적"` 감지는 동일 recognition 인스턴스에서 동시 처리 가능 (이미 continuous: true 설정)

### `components/estimate/EstimateEditor.tsx` — 상태: 수정 모드 연결 미완성
- `voiceMode`: `estimate.sheets.length === 0 ? 'extract' : 'modify'` — 시트 있으면 이미 modify 모드
- `handleVoiceCommands`: save/undo/compare/switch_tab/load/set_margin/restore_to 처리 완성
- `useWakeWord`: `"견적"` 웨이크워드 → 시트 없으면 voiceFlow, 있으면 startRecording
- **Gap 1**: 수정 모드 상태(`editMode: boolean`) 없음 — D-01/D-02/D-03/D-04에서 요구하는 진입/종료/자동재개 상태 기계 없음
- **Gap 2**: read_summary/read_margin 미구현 — handleVoiceCommands switch문에 없음
- **Gap 3**: medium confidence 확인 대기 상태 없음 — "맞습니까?" 후 "아니" 처리 없음
- **Gap 4**: VAD 연결 없음

---

## Architecture Patterns

### 핵심 패턴: useVoiceEditMode 훅 분리

수정 모드 상태 기계는 EstimateEditor에 인라인으로 넣으면 200줄 제한을 초과하고 관심사 분리도 깨진다. 별도 훅으로 분리하는 것이 맞다.

```typescript
// hooks/useVoiceEditMode.ts
interface UseVoiceEditModeOptions {
  onEnter: () => void        // 수정 모드 진입 시 콜백
  onExit: () => void         // 수정 모드 종료 시 콜백
  onAutoResume: () => void   // TTS 완료 후 자동 재개 (시작 녹음)
  onConfirmUndo: () => void  // medium confidence 후 "아니" 응답 시 undo
}

export function useVoiceEditMode(options: UseVoiceEditModeOptions) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(false)
  // ...
}
```

**EstimateEditor에서 사용:**
```typescript
const editMode = useVoiceEditMode({
  onEnter: () => voice.playTts('수정 모드입니다. 말씀하세요.'),
  onExit: () => { /* 상태 초기화 */ },
  onAutoResume: () => voice.startRecording(),
  onConfirmUndo: () => { undo(); voice.playTts('되돌렸습니다.') },
})
```

### 자동 재개 루프 패턴

useVoiceFlow의 `AUTO_RESUME_DELAY + setTimeout` 패턴을 그대로 사용:

```typescript
// TTS 완료 후 자동 재개
const AUTO_RESUME_DELAY = 2000  // D-03: 2초

useEffect(() => {
  if (!isEditMode) return
  if (voiceStatus === 'idle' && wasProcessing.current) {
    // TTS 완료 후 idle로 전환됨
    const timer = setTimeout(() => {
      if (isEditMode) startRecording()
    }, AUTO_RESUME_DELAY)
    return () => clearTimeout(timer)
  }
}, [voiceStatus, isEditMode])
```

### Medium Confidence 확인 응답 패턴

medium confidence 명령 실행 후, 다음 STT 결과가 "아니"/"아니오"/"아니요"/"틀려"이면 undo. 이 처리는 `pendingConfirm` 상태를 통해 useVoice의 `onSttText` 콜백에서 선행 처리:

```typescript
// EstimateEditor에서 onSttText 콜백
onSttText: (text) => {
  if (pendingConfirmRef.current) {
    if (/아니|틀려|다르/.test(text)) {
      undo()
      voice.playTts('되돌렸습니다.')
      setPendingConfirm(false)
      return   // LLM으로 보내지 않음 (skipLlm은 per-request가 아니라 상태 전환 필요)
    } else {
      setPendingConfirm(false)
    }
  }
  // 일반 처리
}
```

**주의**: useVoice의 `skipLlm`은 `useEffect`로 동기화되는 ref이므로, `pendingConfirm` 상태에서 LLM 건너뛰기를 구현하려면 `skipLlm` prop을 동적으로 변경하면 된다.

### VAD 구현 패턴: AnalyserNode (AudioWorklet보다 단순)

AudioWorklet은 별도 .js 파일이 필요하고 배포 시 public 폴더 관리가 복잡하다. AnalyserNode는 메인 스레드에서 동작하지만 5초 무음 감지 정도는 성능 문제 없다.

```typescript
// VAD 핵심 로직 (useVoice.ts 내부 또는 별도 훅)
const SILENCE_THRESHOLD = -35  // dB
const SILENCE_DURATION = 5000  // 5초

function startVad(stream: MediaStream, onSilence: () => void) {
  const ctx = new AudioContext()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  source.connect(analyser)

  const dataArray = new Float32Array(analyser.frequencyBinCount)
  let silenceStart: number | null = null

  const check = () => {
    analyser.getFloatTimeDomainData(dataArray)
    const rms = Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length)
    const db = 20 * Math.log10(rms)

    if (db < SILENCE_THRESHOLD) {
      if (!silenceStart) silenceStart = Date.now()
      else if (Date.now() - silenceStart >= SILENCE_DURATION) {
        onSilence()
        return  // 타이머 중지
      }
    } else {
      silenceStart = null
    }
    requestAnimationFrame(check)
  }
  check()
  return () => ctx.close()
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 한국어 "아니" 응답 파싱 | 정규식 목록 직접 작성 | 간단한 regex + 이미 isCancelCommand 패턴 있음 | 방수 도메인은 "아니"가 단순 부정이므로 LLM 불필요 |
| 웨이크워드 감지 | 커스텀 ML 모델 | 기존 useWakeWord.ts Web Speech API 확장 | "수정" 한 단어 추가만 필요 |
| 명령 실행 엔진 | 새로 작성 | 기존 commands.ts + applyCommands | 이미 6개 action 완성됨 |
| 확신도 분기 | 새로 작성 | 기존 confidenceRouter.ts | 이미 완성됨 |
| 스냅샷/undo | 새로 작성 | 기존 useEstimate.ts의 undo() | 이미 완성됨 |

---

## Gap Analysis per Requirement

### VOICE-03, VOICE-04, VOICE-05, VOICE-06 (단가/공종/일괄/역산 수정)

**현재 상태:** commands.ts 로직 완성. EstimateEditor에서 `handleVoiceCommands → applyVoiceCommands` 경로 존재.

**실제 Gap:** `voiceMode`가 `'modify'`로 설정되면 이미 수정 명령이 처리된다. 그러나 현재 `useWakeWord`의 `onWakeWord` 콜백이 `estimate.sheets.length > 0`일 때 `voice.startRecording()`을 호출하는 방식 — 수정 모드 상태가 없어서 자동 재개나 VAD가 작동하지 않는다.

**필요한 코드 변경:**
1. `editMode` 상태 추가 → startRecording/stopRecording이 editMode일 때 자동 재개 루프 작동
2. `update_meta` action 처리: handleVoiceCommands에 추가하거나 commands.ts에 추가

**commands.ts에서 update_meta를 처리하지 않는 이유:**
- update_meta는 `estimate.m2`, `estimate.wall_m2` 등 sheet 외부의 estimate 메타를 수정
- applyCommand는 EstimateSheet를 인자로 받으므로 구조적으로 처리 불가
- EstimateEditor.handleVoiceCommands에서 직접 처리하는 것이 맞음 (이미 set_margin이 이렇게 됨)

### VOICE-07 (확신도 3단계 분기)

**현재 상태:**
- `useEstimate.applyVoiceCommands`는 `routeCommands`를 호출하지만, medium confidence 시 `{ executed: true, routing }` 반환 후 아무 처리 없음
- `useVoice.handleModifyResponse`는 `onCommands` 콜백을 무조건 호출 (confidence level 체크 없음)

**Gap:** medium confidence 확인 응답 처리 상태 없음.

**구현 방향:**
- `handleVoiceCommands`에서 `applyVoiceCommands`의 반환값 `routing.level`을 체크
- medium이면 `pendingConfirmRef.current = true` 설정
- 다음 STT 텍스트가 들어올 때 `pendingConfirmRef`가 true이면 "아니" 패턴 매칭 → undo
- "아니" 패턴: `/^(아니|아니오|아니요|틀려|틀렸|달라|다르|취소)/`

**중요한 설계 결정 (Claude's Discretion):**
"아니" 응답을 LLM으로 보내지 않고 client-side regex로 처리한다. LLM 왕복 비용과 지연을 피할 수 있고, "아니" 단어는 의미가 명확하다. 단, `pendingConfirm` 상태에서는 `skipLlm=true`로 설정하여 LLM 호출을 막아야 한다.

### VOICE-08 (되묻기 2회 제한)

**현재 상태:** useVoice.ts의 `clarificationCountRef + MAX_CLARIFICATION_COUNT = 2` 완전 구현.

**Gap:** 없음. useVoice가 이미 처리. 수정 모드 연결만 하면 자동으로 동작.

### VUX-02 (직전 3개 명령 컨텍스트)

**현재 상태:** `recentCommandsRef`가 useVoice에 있고, `buildLlmPayload`에서 modify 모드 시 `getModifySystem(context, JSON.stringify(recentCommands))`로 전달됨.

**Gap:** 없음. 이미 연결됨. 수정 모드가 활성화되면 자동으로 동작.

### VUX-03 (웨이크워드 활성화)

**현재 상태:** useWakeWord.ts에 볼륨/Space/"견적" 구현됨.

**Gap:**
1. "수정" 키워드 감지 → editMode 진입
2. "그만"/"종료" 감지 → editMode 종료 (VAD와 별개로 명시적 종료)

**구현:** useWakeWord.ts에 `onEditMode?: () => void` 콜백 추가. `onresult` 핸들러에서 "수정" 포함 시 `onEditMode?.()` 호출.

**"수정" vs "견적" 충돌 없음:** "견적" 감지 시 voiceFlow 또는 startRecording으로 분기, "수정" 감지 시 editMode 진입. 두 워드가 동시에 발화될 경우는 없다고 가정.

### VUX-04 (시스템 명령)

**현재 상태:** handleVoiceCommands에 save/undo/compare/switch_tab/load/set_margin/restore_to 구현됨.

**Gap:**
- `read_summary`: TTS로 현재 총액/공종수/마진율 읽기 — **신규 구현**
- `read_margin`: TTS로 마진율 읽기 — **신규 구현**
- `sync_urethane_05`: 우레탄 0.5mm 동기화 — Phase 2 스코프인지 확인 필요 (REQUIREMENTS.md에 없음, deferred)

**read_summary 구현:**
```typescript
case 'read_summary': {
  const total = estimate.sheets.reduce((s, sh) => s + sh.grand_total, 0)
  const itemCount = estimate.sheets[0]?.items.length ?? 0
  const margin = getSheetMargin(0)
  const msg = `면적 ${estimate.m2}제곱미터, 공종 ${itemCount}개, 총액 ${formatWon(total)}, 마진 ${margin}퍼센트.`
  addLog('assistant', msg)
  voice.playTts(msg)
  return
}
```

### VUX-05 (음성 undo)

**현재 상태:** useEstimate.undo() 구현 완성. handleVoiceCommands에서 `undo` action 처리.

**Gap:** medium confidence 후 "아니" → D-07 undo는 별도 경로 (위 VOICE-07 참조). "취소"/"되돌려" → LLM이 `{action: "undo"}` 생성 → handleVoiceCommands → undo() 호출 경로는 **이미 연결됨**.

---

## Common Pitfalls

### Pitfall 1: TTS 완료 후 자동 재개 타이밍
**What goes wrong:** `voice.status === 'idle'`이 될 때마다 자동 재개 타이머가 발동하면, 수정 모드 비활성 상태에서도 재개가 일어남.
**Why it happens:** useEffect 의존성에 `isEditMode`를 포함하지 않으면 상태 독립성이 깨짐.
**How to avoid:** 자동 재개 타이머를 `isEditMode === true`일 때만 활성화. `wasProcessing` ref로 "처리 중이었다가 idle로 전환"만 감지.
**Warning signs:** 수정 모드 종료 후에도 녹음이 자동으로 시작되는 증상.

### Pitfall 2: pendingConfirm 상태와 useVoice skipLlm 동기화
**What goes wrong:** `pendingConfirm=true`일 때 useVoice가 LLM을 호출하면 "아니" 발화가 수정 명령으로 파싱됨.
**Why it happens:** useVoice의 `skipLlm`은 `useEffect`로 ref에 동기화되는데, React state 변경과 다음 render 사이에 녹음이 시작되면 구 값을 사용.
**How to avoid:** `skipLlm` 대신 `onSttText` 콜백에서 `pendingConfirmRef.current`를 체크하고 early return. 콜백은 ref로 관리되므로 항상 최신값.
**Warning signs:** "아니" 발화 후 추가 명령이 실행되는 증상.

### Pitfall 3: Web Speech API와 MediaRecorder 동시 실행
**What goes wrong:** Web Speech API (continuous recognition for wakeword)와 MediaRecorder가 동시에 마이크를 사용하면 Android에서 충돌.
**Why it happens:** 일부 Android 브라우저는 두 개의 마이크 스트림을 동시에 허용하지 않음.
**How to avoid:** 웨이크워드 감지 시 recognition.stop() 후 MediaRecorder 시작. TTS/녹음 완료 후 recognition 재시작. 현재 useWakeWord.ts에 이미 `recognition.stop()` 후 3초 후 재시작 패턴 구현됨 — 이 패턴 유지.
**Warning signs:** 모바일에서 "수정" 감지 후 마이크 접근 실패 에러.

### Pitfall 4: applyVoiceCommands의 update_meta 미지원
**What goes wrong:** "면적 200으로 변경" 명령 시 LLM이 `{action: "update_meta", field: "m2", value: 200}` 생성 → applyVoiceCommands 내부의 applyCommand가 `미지원 action` 반환 → 실행 안 됨.
**Why it happens:** applyCommand는 EstimateSheet 대상이고, m2는 Estimate 루트 필드.
**How to avoid:** handleVoiceCommands에서 update_meta를 시스템 명령처럼 사전 처리 (save, undo와 동일 패턴):
```typescript
case 'update_meta': {
  const field = sysCmd.field as keyof Estimate
  if (sysCmd.value !== undefined) updateMeta(field, sysCmd.value)
  return
}
```
**Warning signs:** 면적 변경 명령이 무반응인 증상.

### Pitfall 5: VAD가 녹음 중이 아닐 때 작동
**What goes wrong:** AudioContext가 수정 모드 종료 후에도 살아있어 오디오 분석을 계속함.
**Why it happens:** `requestAnimationFrame` 루프를 명시적으로 중단하지 않으면 계속 실행.
**How to avoid:** VAD는 `startRecording()` 내부에서 시작하고, `stopRecording()`에서 AudioContext.close()로 명시적 종료. cancellation flag 패턴 사용:
```typescript
let active = true
const check = () => {
  if (!active) return
  // ... 분석 로직 ...
  requestAnimationFrame(check)
}
return () => { active = false; ctx.close() }
```

### Pitfall 6: recentCommandsRef 타이밍
**What goes wrong:** medium confidence 명령 후 "아니"로 undo할 때, recentCommandsRef에 해당 명령이 이미 들어가 있어 다음 modify 명령에서 취소된 명령을 컨텍스트로 제공.
**Why it happens:** handleModifyResponse에서 onCommands 전에 recentCommandsRef 업데이트.
**How to avoid:** undo 후 recentCommandsRef에서 마지막 명령 제거. 또는 pendingConfirm 상태에서 "아니" 시 recentCommandsRef.current.pop() 호출. useVoice 외부에서 ref 직접 접근은 안 되므로, useVoice에 `clearLastCommand()` 메서드 노출.

---

## Code Examples

### "수정" 웨이크워드 추가 (useWakeWord.ts)
```typescript
// Source: 기존 useWakeWord.ts 패턴 기반
recognition.onresult = (event: any) => {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript
    if (transcript.includes('수정')) {
      recognition.stop()
      onEditMode?.()  // 새 콜백
      setTimeout(() => {
        try { recognition.start() } catch { /* 이미 실행 중 */ }
      }, 3000)
      return
    }
    if (transcript.includes('견적')) {
      recognition.stop()
      onWakeWord?.()
      setTimeout(() => {
        try { recognition.start() } catch { /* 이미 실행 중 */ }
      }, 3000)
      return
    }
  }
}
```

### 수정 모드 자동 재개 (EstimateEditor.tsx)
```typescript
// Source: useVoiceFlow.ts의 AUTO_RESUME_DELAY 패턴 참조
const AUTO_RESUME_DELAY = 2000  // D-03
const prevVoiceStatusRef = useRef<VoiceStatus>('idle')

useEffect(() => {
  const prev = prevVoiceStatusRef.current
  prevVoiceStatusRef.current = voice.status

  // 처리 완료 후 idle로 전환 (processing/speaking → idle)
  const wasActive = prev === 'processing' || prev === 'speaking'
  if (wasActive && voice.status === 'idle' && editMode.isEditMode) {
    const timer = setTimeout(() => {
      if (editMode.isEditMode) voice.startRecording()
    }, AUTO_RESUME_DELAY)
    return () => clearTimeout(timer)
  }
}, [voice.status, editMode.isEditMode])
```

### medium confidence undo 처리 (EstimateEditor.tsx)
```typescript
// Source: D-07 결정 기반
const pendingConfirmRef = useRef(false)

const handleVoiceCommands = useCallback((commands: VoiceCommand[]) => {
  // ...기존 시스템 명령 처리...

  const targetSheet = activeSheetIndex >= 0 ? activeSheetIndex : 0
  if (estimate.sheets[targetSheet]) {
    const result = applyVoiceCommands(commands, targetSheet)
    // medium confidence → 다음 발화에서 "아니" 확인
    if (result.routing.level === 'medium') {
      pendingConfirmRef.current = true
    }
  }
}, [...])

// onSttText 콜백에서 pendingConfirm 체크
onSttText: (text) => {
  if (pendingConfirmRef.current) {
    if (/^(아니|아니오|아니요|틀려|틀렸|달라|다르|취소)/.test(text.trim())) {
      undo()
      voice.playTts('되돌렸습니다.')
      pendingConfirmRef.current = false
      return  // LLM 호출 차단 — skipLlm prop으로 전달
    }
    pendingConfirmRef.current = false
  }
  if (voiceFlowRef.current.isActive) {
    voiceFlowRef.current.processText(text)
  } else {
    addLog('user', text)
  }
}
```

**주의:** `onSttText` 단계에서 LLM 호출을 막으려면 `skipLlm` prop을 `pendingConfirmRef.current`와 동기화해야 한다. 그러나 `skipLlm`은 `useEffect`로 동기화되어 render 사이 시간차가 있다. 안전한 대안: `onSttText` 콜백 내에서 직접 early return 후 `processAudio` 내부에 추가 체크 (callbacksRef 패턴 사용 중이므로 항상 최신값).

실제 구현: useVoice에 `isPendingConfirm: boolean` prop 추가 또는 `pendingConfirmRef`를 useVoice 내부로 이동하고 `setPendingConfirm(true)` 메서드를 노출.

---

## File Modification Map

### 신규 생성 파일
| 파일 | 목적 | 우선순위 |
|------|------|----------|
| `hooks/useVoiceEditMode.ts` | 수정 모드 상태 기계 (진입/종료/자동재개/VAD/pendingConfirm) | Wave 1 |

### 수정 파일
| 파일 | 변경 내용 | 우선순위 |
|------|----------|----------|
| `hooks/useWakeWord.ts` | `onEditMode?: () => void` 콜백 추가, "수정" 키워드 감지 | Wave 1 |
| `components/estimate/EstimateEditor.tsx` | useVoiceEditMode 연결, read_summary/read_margin 추가, update_meta 처리, medium conf undo 처리 | Wave 1 |
| `hooks/useVoice.ts` | `setPendingConfirm` 메서드 노출 또는 `isPendingConfirm` prop 추가 (VAD + medium conf 처리용) | Wave 1 |

### 변경 없는 파일 (그대로 사용)
| 파일 | 이유 |
|------|------|
| `lib/voice/commands.ts` | 6개 action 완성. update_meta는 EstimateEditor에서 처리 |
| `lib/voice/confidenceRouter.ts` | 완성. 변경 불필요 |
| `lib/voice/prompts.ts` | 완성. getModifySystem 그대로 사용 |
| `hooks/useEstimate.ts` | undo/applyVoiceCommands 완성. 변경 불필요 |
| `lib/voice/voiceFlow.ts` | 가이드 플로우 전용. 수정 모드와 무관 |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Next.js 빌드 검증 (jest 없음) |
| Config file | 없음 |
| Quick run command | `npm run build` |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-03 | "바탕정리 재료비 400원으로" → 테이블 즉시 반영 | manual (음성 실제 테스트) | `npm run build` | ❌ Wave 0 |
| VOICE-04 | "크랙보수 20미터 추가" → 공종 행 추가 | manual | `npm run build` | ❌ |
| VOICE-05 | "재료비 전체 10% 올려" → 전체 재료비 증가 | manual | `npm run build` | ❌ |
| VOICE-06 | "총액 600만원으로" → 역산 반영 | manual | `npm run build` | ❌ |
| VOICE-07 | 95%+ 즉시실행, 70-95% 확인, 70%- 되묻기 | manual | `npm run build` | ❌ |
| VOICE-08 | 되묻기 3회째 "알겠습니다" | manual | `npm run build` | ❌ |
| VUX-02 | "그거 올려" → 직전 target 유추 | manual | `npm run build` | ❌ |
| VUX-03 | "수정" 발화 → 수정 모드 진입 | manual | `npm run build` | ❌ |
| VUX-04 | "현재 상태 알려줘" → TTS 요약 | manual | `npm run build` | ❌ |
| VUX-05 | "취소" → 이전 상태 복원 | manual | `npm run build` | ❌ |

**모든 요구사항이 manual 테스트** — 음성 인식 파이프라인의 특성상 자동화 불가. 빌드/린트 통과가 완료 기준.

### Sampling Rate
- **Per task commit:** `npm run build` (빌드 에러 없음 확인)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** 빌드+린트 통과 후 갤럭시탭 음성 실제 테스트

### Wave 0 Gaps
- 테스트 파일 신규 생성 불필요 — 빌드/린트가 완료 기준
- `hooks/useVoiceEditMode.ts` 신규 생성 — Wave 1 시작 전 파일 뼈대 필요

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2는 기존 Next.js 앱 코드 변경만 포함. 외부 의존성 없음. OpenAI/Anthropic API는 Phase 1에서 이미 동작 확인됨.

---

## Open Questions

1. **sync_urethane_05 action 스코프**
   - What we know: getModifySystem 프롬프트에 정의됨. REQUIREMENTS.md에는 없음.
   - What's unclear: Phase 2 스코프인지, 추후 Phase인지.
   - Recommendation: REQUIREMENTS.md에 없으므로 Phase 2에서 구현하지 않음. handleVoiceCommands에 placeholder만 추가.

2. **read_summary의 마진율 계산 기준**
   - What we know: `getSheetMargin(sheetIndex)`가 useEstimate에 있고, 복합과 우레탄 각각 반환.
   - What's unclear: read_summary에서 복합/우레탄 중 어느 것을 읽을지. 탭에 따라? 둘 다?
   - Recommendation: activeSheetIndex >= 0이면 해당 시트, 아니면 복합(index 0) 기준. 단순하게 구현.

3. **VAD가 voiceFlow 중에 작동하면 안 되는지**
   - What we know: D-05에서 "수정 모드에서만 작동"으로 결정됨.
   - What's unclear: 구현 위치 — useVoice 내부에 VAD를 넣으면 voiceFlow 중에도 작동할 수 있음.
   - Recommendation: VAD를 `useVoiceEditMode` 훅 내부에 넣어 `isEditMode`로 제어. startRecording/stopRecording에 VAD 관련 콜백 전달.

---

## Sources

### Primary (HIGH confidence)
- 직접 코드 열람: `lib/voice/commands.ts`, `confidenceRouter.ts`, `prompts.ts`
- 직접 코드 열람: `hooks/useVoice.ts`, `useEstimate.ts`, `useWakeWord.ts`, `useVoiceFlow.ts`
- 직접 코드 열람: `components/estimate/EstimateEditor.tsx`
- `.planning/phases/02-voice-edit-loop/02-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- Phase 1 구현 패턴 (`callbacksRef`, `voiceFlowRef`, `skipLlm`) — 코드에서 직접 확인

---

## Metadata

**Confidence breakdown:**
- Current state analysis: HIGH — 모든 파일 직접 열람
- Gap analysis: HIGH — 코드 구조에서 직접 도출
- Architecture patterns: HIGH — 기존 패턴 기반
- Pitfalls: MEDIUM — 유사한 구현 경험 기반, 실제 테스트 전까지 확정 불가

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (코드 변경 없는 경우)
