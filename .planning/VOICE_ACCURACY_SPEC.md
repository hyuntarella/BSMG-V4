# 음성 정확도 + 편의성 강화 설계서

> **목적**: 이 문서 하나만 읽고 구현 가능하도록 작성됨.
> **작성일**: 2026-04-01
> **상태**: 설계 확정. 구현 대기.
> **선행 작업**: VOICE_PIPELINE_V3_SPEC.md (구현 완료, 커밋 7ddaa5a)

---

## 1. 현재 상태 (v3 구현 완료)

커밋 7ddaa5a에서 3단 파이프라인 구현 완료:
- Layer 1: Web Speech API (실시간 interim)
- Layer 2: Whisper (백그라운드 검증)
- Layer 3: Claude LLM (복잡 명령)

### 현재 문제점
1. 실시간 텍스트 표시가 간헐적 (100%가 아님)
2. 필드명을 매번 말해야 함 (재료비, 노무비 등)
3. 틀렸을 때 교정이 느림 (👎 → 타이핑)
4. 대화 로그가 불충분 (이전값, 추론 여부 안 보임)

---

## 2. 간헐적 텍스트 표시 수정

### 2-1. 원인
- `useVoice.ts:226-229`에서 `finalText`가 올 때 `setInterimText('')` 호출
- 이로 인해 final과 다음 interim 사이에 공백 발생 → 화면에서 글자 사라짐

### 2-2. 수정

**useVoice.ts onresult 핸들러:**
```
변경 전: finalText 오면 setInterimText('')
변경 후: finalText가 와도 setInterimText 안 지움. 다음 interim이 자동으로 덮어씀.
```

### 2-3. 오디오 레벨 바

interim이 없을 때 "듣고 있다"는 시각 피드백:
- useVoice.ts에 `audioLevel` 상태 추가 (0~1)
- VAD 모니터링 루프에서 dB를 0~1로 정규화해서 업데이트
- VoiceBar에 5개 바 렌더링 (audioLevel 기반)

### 2-4. 타이밍 로그

각 단계에 `performance.now()` 기반 로그:
- `[timing] interim arrived: Xms` — onresult 핸들러 진입
- `[timing] ending detected: Xms` — hasEndingTrigger 매치
- `[timing] rule parsed: Xms` — parseCommand 완료
- `[timing] sheet applied: Xms` — applyVoiceCommands 완료
- `[timing] whisper returned: Xms` — /api/stt 응답

---

## 3. 빠른 교정 루프

### 3-1. 패턴

```
"아니" / "아니야" / "아닌데" / "취소" → 직전 1개 undo
"아니 [숫자]" → 직전 undo + 새 값으로 재실행
"아니 [필드명]" → 직전 undo + 필드 교체 재실행
"[숫자] 아니고 [숫자]" → 직전 undo + 새 값으로 재실행
```

### 3-2. "아니" 오작동 방지

- "아니"가 발화의 **첫 단어**일 때만 교정 트리거
- "아니" 뒤에 **공종명이 오면** → 새 명령으로 처리 (교정 아님)
  - "아니 그거 말고 바탕정리 500원 넣어" → 새 명령
- "아니" 뒤에 **숫자/필드명이 오면** → 교정
  - "아니 600원" → 직전 명령의 값 교정

### 3-3. 실행 위치

- `handleInterim`에서 감지 (Web Speech API interim)
- "넣어" 트리거 없이 "아니" 감지 즉시 실행
- Whisper 검증 불필요 (undo는 안전한 연산)

### 3-4. 구현 위치

**triggerMatcher.ts:**
- `detectCorrection(text: string): CorrectionResult | null` 함수 추가

**useEstimateVoice.ts:**
- `lastExecutedCommandRef = useRef<VoiceCommand | null>(null)` 추가
- handleModifyCommands / handleEndingDetected에서 실행 성공 시 저장
- handleInterim에서 교정 패턴 분기 추가

---

## 4. 필드 자동 추론 — 6단계 우선순위

### 4-1. 추론 함수

`realtimeParser.ts`에 `inferField()` 추가:

```
우선순위 1: 명시적 지정 — 사용자가 필드명 말함
우선순위 2: 직전 컨텍스트 계승 — "도" 패턴, 필드만 말한 경우
우선순위 3: 동작어에서 추론 — 올려/내려/바꿔 → 단가(mat 기본)
우선순위 4: 금액 범위 — 100~10000=단가, 100000+=장비
우선순위 5: 견적서 현재 상태 — 값 있는 필드가 1개면 그 필드
우선순위 6: 공종 카테고리 기본값 — 방수공종=mat, 장비류=labor
```

### 4-2. ParseContext 인터페이스

```typescript
export interface ParseContext {
  lastCommand?: VoiceCommand
  sheetState?: Array<{
    name: string
    mat: number
    labor: number
    exp: number
    is_equipment: boolean
  }>
}
```

### 4-3. parseCommand 확장

기존 정규식(필드 필수) 매칭 실패 시 필드 생략 패턴 시도:

```
"[공종명] [값]으로" → inferField로 필드 추론
"[공종명] [값] 올려/내려" → inferField로 필드 추론
```

### 4-4. "도" 패턴 처리 순서

1단계: 전체 텍스트에서 공종명 매칭 먼저
  - "사다리차도 올려" → "사다리차" 매칭 성공 → "도"는 조사
2단계: 공종명 매칭 실패 시 → "도"를 직전 컨텍스트 계승
  - "재료비도 300" → 공종 매칭 실패 → 직전 공종의 재료비

### 4-5. 2트랙 확정 방식

| 확신도 | 기준 | 동작 |
|--------|------|------|
| 높음 | 우선순위 1~3 + 종결어미 | 즉시 실행 |
| 낮음 | 우선순위 4~6 또는 종결어미 없음 | 미리보기 표시 → "넣어" 대기 |

- 미리보기 상태에서 "넣어" → 확정 반영
- 미리보기 상태에서 "아니 [필드]" → 필드 교정 후 반영
- 미리보기 상태에서 2초 무음 → 확정 반영 (폴백)

---

## 5. 불완전 명령 → 버퍼 축적 (질문하지 않음)

"바탕정리" 만 말하고 끊긴 경우:
- 질문("어떻게?")하지 않음 — 사용자가 이미 다음 말을 하고 있을 수 있음
- 버퍼에 축적 → 다음 발화와 합쳐서 파싱
- 2초 무음 후에도 불완전하면 그때 VoiceBar에 "바탕정리 — 계속 말씀하세요" 표시

```
발화1: "바탕정리" → 버퍼 저장 (공종만 감지)
발화2: "재료비 500원 넣어" → 버퍼 + 발화2 합쳐서 파싱
→ "바탕정리 재료비 500원 넣어" → 실행
```

---

## 6. 동음이의어 사전

### 6-1. 기본 사전 (코드 — 변경 없는 도메인 용어)

realtimeParser.ts에 하드코딩:
```
이계소 → 2개소
삼계소 → 3개소
사계소 → 4개소
오계소 → 5개소
헤베 → m²
루베 → m³
```

### 6-2. 학습 사전 (DB — 교정 이력에서 추출)

voice_dictionary 테이블:
```sql
create table voice_dictionary (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  wrong_text text not null,
  correct_text text not null,
  context text,
  source text default 'manual',  -- 'manual' | 'auto_from_corrections'
  created_at timestamptz default now()
);
```

- 앱 시작 시 1회 로드 → 메모리 캐시
- 음성 파이프라인에서는 캐시만 참조 (비동기 쿼리 없음)
- 교정 이력에서 같은 패턴 3회 이상 → 자동 등록 (별도 cron)

---

## 7. 숫자 파싱 강화

현재 parseKoreanNumber 보완:

```
추가할 패턴:
오백 → 500
삼천 → 3000
삼천오백 → 3500
만 → 10000
삼만 → 30000
삼만오천 → 35000
십이만 → 120000
육백만 → 6000000
```

순한글 → 숫자 변환 함수:
```
일=1, 이=2, 삼=3, 사=4, 오=5, 육=6, 칠=7, 팔=8, 구=9
십=10, 백=100, 천=1000, 만=10000
```

기본 패턴만 규칙파서에. 복합("삼십이만삼천오백")은 LLM이 더 정확.

---

## 8. 상세 대화 로그

### 변경 전
```
나: "바탕정리 500원 넣어"
→ 바탕정리 mat 500 ✓
```

### 변경 후
```
나: "바탕정리 500원 넣어"
→ 바탕정리 | 재료비(추론) | 8,000 → 500원 ✓  [👍][👎]
```

### 구현
- 실행 전 해당 셀의 이전값을 추출
- 필드가 추론된 경우 "(추론)" 표시
- VoiceLogEntry에 메타 추가:

```typescript
// voiceLogTypes.ts 확장
interface VoiceLogEntry {
  ...기존...
  /** 실행 상세 (이전값, 추론 여부) */
  executionDetail?: {
    prevValue?: number
    fieldInferred?: boolean
  }
}
```

---

## 9. 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `lib/voice/triggerMatcher.ts` | `detectCorrection()` 추가 |
| `lib/voice/realtimeParser.ts` | `ParseContext`, `inferField()`, 필드생략 패턴, 순한글 숫자, 동음이의어 사전, 불완전 명령 버퍼 |
| `hooks/useVoice.ts` | finalText에서 setInterimText('') 제거, audioLevel, 타이밍 로그 |
| `hooks/useEstimateVoice.ts` | lastExecutedCommandRef, handleInterim 교정분기, parseCommand에 context 전달, 미리보기 2트랙, 불완전 명령 버퍼, 상세 로그 |
| `components/voice/VoiceBar.tsx` | audioLevel prop + 레벨바, 추론 필드 물음표 표시 |
| `components/voice/VoiceLogPanel.tsx` | 상세 실행 내역 표시 (이전값→새값, 추론 표시) |
| `lib/voice/voiceLogTypes.ts` | executionDetail 필드 추가 |
| `supabase/migrations/` | voice_dictionary 테이블 |

---

## 10. 구현 순서

```
Step 1: 간헐적 표시 수정 + 타이밍 로그 + 오디오 레벨 바
        - useVoice.ts: setInterimText('') 제거, audioLevel, timing logs
        - VoiceBar.tsx: audioLevel 바

Step 2: 빠른 교정 루프
        - triggerMatcher.ts: detectCorrection()
        - useEstimateVoice.ts: lastExecutedCommandRef, handleInterim 교정 분기

Step 3: 필드 자동 추론
        - realtimeParser.ts: ParseContext, inferField(), 필드생략 패턴
        - useEstimateVoice.ts: context 전달, 2트랙 (즉시/미리보기)

Step 4: 불완전 명령 버퍼
        - useEstimateVoice.ts: pendingBufferRef, 합치기 로직

Step 5: 동음이의어 + 순한글 숫자
        - realtimeParser.ts: BUILTIN_DICTIONARY, parseKoreanFull()

Step 6: 상세 대화 로그
        - voiceLogTypes.ts: executionDetail
        - useEstimateVoice.ts: 이전값 추출
        - VoiceLogPanel.tsx: 상세 표시

Step 7: DB 마이그레이션
        - voice_dictionary 테이블

Step 8: 빌드 + 테스트 검증
```

---

## 11. 주의사항

- TTS 부활 금지
- taskkill, kill-port 사용 금지
- 기존 테스트 깨뜨리지 마
- test.skip() 금지
- npm run build + npm run test 통과 후 커밋
- 한 에이전트가 전체 맥락에서 한 번에 수정
