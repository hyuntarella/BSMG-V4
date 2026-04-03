# 음성 파이프라인 v3 — 실시간 3단 파이프라인 설계서

> **목적**: 이 문서 하나만 읽고 구현 가능하도록 작성됨.
> **작성일**: 2026-04-01
> **상태**: 설계 확정. 구현 대기.

---

## 1. 핵심 원칙

- **속도가 생명.** 사람에게 시키는 것보다 10배 빠르고 손을 안 씀.
- **TTS 없음.** 모든 피드백은 시각적(화면).
- **녹음 한 번 켜면 안 꺼짐.** 버튼 ON → 계속 말함 → 버튼 OFF로만 종료.
- **지연 0초 체감.** 말하는 즉시 화면 반응. 단순 명령은 즉시 실행.

---

## 2. 3단 파이프라인 아키텍처

```
Layer 1: Web Speech API (실시간, 무료, 항상 ON)
├─ 화면에 단어 즉시 표시 (interim result)
├─ 공종명 감지 → 시트 행 하이라이트
├─ 필드명 감지 → 해당 셀 포커스 테두리
├─ 숫자+단위 감지 → 값 미리보기 (연한 색)
├─ 종결 어미 감지 → 즉시 오디오 세그먼트 (2초 대기 제거)
└─ 단순 명령 패턴 → 즉시 실행 (LLM 안 거침)

Layer 2: Whisper API (정확, 백그라운드)
├─ 종결 어미 트리거 시 해당 구간 오디오 전송
├─ 단순 명령 → Layer 1 결과 검증 (틀리면 롤백+재실행)
└─ 복잡한 명령 → 정확한 텍스트를 Layer 3으로

Layer 3: Claude Sonnet LLM (복잡한 명령만)
├─ "총액 600만원으로 맞춰줘" (역산)
├─ "재료비 전체 10% 올려" (일괄 조정)
└─ 규칙 파서가 패턴 매칭 실패한 모든 명령
```

---

## 3. 종결 어미 트리거 (한국어 자연어 종결)

"넣어"만이 아니라, 한국어 종결 표현 전체가 실행 트리거:

```
실행 트리거 정규식:
/(넣어|바꿔|해줘?|올려|내려|빼|추가|수정|맞춰|변경|삭제|제거)(줘|라|봐)?[.!?]?$/

구체적 패턴:
넣어 / 넣어줘 / 넣어라
바꿔 / 바꿔줘 / 바꿔라
해줘 / 해 / 해라
수정 / 수정해 / 수정해줘
올려 / 올려줘
내려 / 내려줘
빼 / 빼줘 / 빼라
추가 / 추가해 / 추가해줘
맞춰 / 맞춰줘
으로 (← "500원으로" — 의도 완결)
```

Web Speech API의 interim result에서 이 패턴이 감지되면:
1. 즉시 현재 오디오 세그먼트 분리
2. 규칙 파서가 처리 가능하면 → 즉시 실행
3. 처리 불가능하면 → Whisper + LLM으로

2초 무음은 폴백으로 유지 (종결 어미 없이 말 끊는 경우).

---

## 4. 규칙 기반 실시간 파서

### 4-1. 단순 명령 패턴 (LLM 없이 즉시 실행, 전체의 ~80%)

```
[공종명] + [필드] + [숫자][단위] + [종결]
"바탕정리"  "재료비"  "500원으로"    "바꿔줘"
→ {action: "update_item", target: "바탕정리", field: "mat", value: 500}

[공종명] + [필드] + [숫자][단위] + [증감] + [종결]
"미장"     "노무비"  "100원"       "올려줘"
→ {action: "update_item", target: "바탕조정제미장", field: "labor", delta: +100}

[공종명] + [종결:삭제]
"바탕정리 빼줘"
→ {action: "remove_item", target: "바탕정리"}

[공종명] + [수량] + [종결:추가]
"크랙보수 20미터 추가"
→ {action: "add_item", name: "크랙보수", qty: 20, unit: "m"}
```

### 4-2. 복잡한 명령 (Whisper + LLM 필요, ~20%)

```
"총액 600만원으로 맞춰줘" → 역산
"재료비 전체 10% 올려" → 일괄 조정
"복합 우레탄 비교해줘" → 시스템 명령
"그거 올려" → 컨텍스트 참조 (직전 명령 참조)
패턴 매칭 실패한 모든 것
```

### 4-3. 공종명 fuzzy 매칭

Web Speech API가 "바탕 정리"로 잡아도 매칭되도록:
- 공백 제거 후 비교
- 줄임말 매핑: 바미=바탕조정제미장, 드비=드라이비트하부절개, 상도=우레탄상도
- 시트에 있는 공종명 목록과 prefix 매칭

### 4-4. 필드명 매핑

```
재료비/재료/자재 → mat
노무비/노무/인건비 → labor
경비 → exp
단가 → mat (기본, 장비류는 labor)
수량 → qty
규격 → spec
```

### 4-5. 숫자+단위 파싱

```
"500원" → 500
"3만5천" → 35000
"10" (단가 문맥) → 100000 (만원 단위)
"10" (수량 문맥) → 10
"12만원" → 120000
```

금액 기본 단위 규칙:
- 단가 문맥에서 10~100 범위 숫자 → 만원 단위
- "원" 붙으면 그대로
- 수량 문맥이면 그대로

---

## 5. 실시간 시각 피드백

### 5-1. 말하는 중 (Web Speech API interim result)

| 감지 내용 | 화면 반응 | 타이밍 |
|-----------|----------|--------|
| 공종명 | 해당 행 노란 하이라이트 | ~0.1초 |
| 필드명 | 해당 셀 포커스 테두리 (점선) | ~0.1초 |
| 숫자+단위 | 셀에 값 미리보기 (연한 색 텍스트) | ~0.1초 |
| 종결 어미 | 확정 반영 (진한 색으로 전환) | ~0.1초 |

### 5-2. 확정 후 하이라이트 (기존 턴 기반 시스템 유지)

- 직전 수정: accent-200/60 (진한)
- 2턴 전: accent-100/50 (중간)
- 3턴 전: accent-50/40 (연한)
- 4턴 이상: 하이라이트 제거

### 5-3. 처리 중 표시

- 단순 명령: 처리 중 표시 없음 (즉시 반영이라)
- 복잡 명령: 해당 행에 "계산 중..." 인디케이터

---

## 6. 두 가지 모드

### 6-1. 최초 생성 모드 (시트 없음)

```
버튼 ON → 자유 발화
→ Web Speech API가 실시간 표시 + 필드 미리보기
→ 종결 어미 "넘겨"/"시작"/"만들어" 감지 OR 버튼 OFF
→ 축적된 전체 텍스트를 Whisper → LLM extract (14필드)
→ 시트 즉시 생성 + 탭 전환
→ 녹음 유지 (버튼 OFF 안 했으면)
```

extract 프롬프트 필드 (14개):
- method, area, wallM2, complexPpp, urethanePpp
- leak, rooftop, plaster, elevator
- ladder, sky, dryvit, waste
- deadline, notes

### 6-2. 수정 모드 (시트 있음)

```
버튼 ON → 연속 녹음
→ 발화마다 Web Speech API 실시간 피드백
→ 종결 어미 감지 → 세그먼트 분리
  → 단순 명령: 규칙 파서 즉시 실행 + Whisper 백그라운드 검증
  → 복잡 명령: Whisper → LLM → 실행
→ 대화 로그에 기록
→ 녹음 유지
→ 버튼 OFF → 종료
```

---

## 7. 대화 로그 UI

접이식 패널 (기존 VoiceLogPanel.tsx 확장):

```
나: "바탕정리 재료비 500원으로 바꿔줘"
  → 바탕정리 재료비 300→500원 ✓    [👍] [👎]

나: "미장 노무비 3만원 올려줘"
  → 미장 노무비 +30,000원 ✓       [👍] [👎]

나: "총액 600만원으로 맞춰줘"
  → 총액 역산 → 6,000,000원 ✓     [👍] [👎]
```

- 👎 → 인라인 교정 입력 → LLM 재파싱 → 교정 이력 축적
- 교정 이력은 LLM 프롬프트에 포함 (최근 10건)

---

## 8. LLM 프롬프트 (복잡한 명령용)

기존 getModifySystem() 구조 유지. 포함 내용:
- 현재 견적서 전체 상태 (공종명, 규격, 수량, 단가, 금액)
- 공종 마스터 데이터 + 줄임말
- 직전 3개 명령 히스토리
- 교정 이력 최근 10건
- 도메인 규칙 (만원 단위, 장비→labor, 식/1 항목, 개소 표현)
- tts_response 없음 (TTS 제거됨)

---

## 9. 기술 구현 포인트

### 9-1. Web Speech API + MediaRecorder 병렬 실행

```
getUserMedia → stream
├─ stream → SpeechRecognition (Web Speech API) ← 실시간 전사
└─ stream → MediaRecorder ← 오디오 녹음 (Whisper용)
```

같은 마이크 스트림을 두 곳에서 동시 사용.
SpeechRecognition은 continuous=true, interimResults=true.

### 9-2. 오디오 세그먼트 분리

종결 어미 감지 시:
1. 현재 MediaRecorder.stop()
2. 같은 stream으로 새 MediaRecorder.start()
3. 이전 MediaRecorder의 chunks → Whisper로 전송
4. 갭: 거의 없음 (같은 stream 재사용)

### 9-3. Whisper 검증 + 롤백

```
1. Web Speech → "바탕정리 재료비 500원" → 규칙 파서 실행 → 시트 반영
2. Whisper → "바탕정리 재료비 5000원" → 다르다!
3. 롤백 (undo) → Whisper 결과로 재실행
```

롤백은 기존 스냅샷 시스템(useEstimate의 saveSnapshot/undo) 활용.

### 9-4. 파일 구조

```
hooks/
  useVoice.ts              ← 리팩토링: MediaRecorder + Web Speech API 병렬
  useEstimateVoice.ts      ← 리팩토링: 3단 파이프라인 오케스트레이션
  useEstimate.ts           ← 변경 없음

lib/voice/
  realtimeParser.ts        ← 신규: 규칙 기반 실시간 파서
  triggerMatcher.ts        ← 확장: 종결 어미 전체 패턴
  prompts.ts               ← 기존 유지 (복잡 명령용)
  commands.ts              ← 기존 유지 (명령 실행)
  voiceLogTypes.ts         ← 기존 유지

components/voice/
  VoiceBar.tsx             ← 리팩토링: 실시간 전사 텍스트 표시
  VoiceLogPanel.tsx        ← 기존 유지
  
components/estimate/
  WorkSheet.tsx            ← 확장: 실시간 하이라이트 (행/셀/미리보기)
  EstimateEditor.tsx       ← 연결
```

### 9-5. Web Speech API 브라우저 지원

- Chrome/Edge: 완전 지원
- Safari: 부분 지원 (webkitSpeechRecognition)
- Firefox: 미지원 → Web Speech 없이 기존 VAD+Whisper 폴백

폴백 시: 현재 v2 구조 그대로 동작 (2초 무음 → Whisper → LLM).

---

## 10. 폴백 전략

```
1순위: Web Speech API 시각피드백 + 규칙파서 즉시실행 + Whisper 검증
2순위: Web Speech API 미지원 → VAD 2초 무음 + Whisper + 규칙파서/LLM
3순위: 규칙파서 실패 → Whisper + LLM (현재 v2와 동일)
```

모든 경우에 동작함. 차이는 속도뿐.

---

## 11. 구현 순서 (권장)

```
Step 1: realtimeParser.ts (규칙 기반 파서)
        - 공종명 매칭, 필드 매칭, 숫자 파싱, 종결 어미 감지
        - 단순 명령 패턴 → VoiceCommand 변환
        - 복잡 명령 판별 → "needs_llm" 플래그

Step 2: triggerMatcher.ts 확장
        - 종결 어미 전체 패턴 추가

Step 3: useVoice.ts 리팩토링
        - Web Speech API 병렬 실행 (SpeechRecognition)
        - interim result 콜백
        - 종결 어미 트리거로 오디오 세그먼트

Step 4: WorkSheet.tsx 실시간 하이라이트
        - 행 하이라이트, 셀 포커스, 값 미리보기 props 추가

Step 5: useEstimateVoice.ts 리팩토링
        - 3단 파이프라인 오케스트레이션
        - 규칙 파서 즉시실행 + Whisper 검증 + LLM 폴백

Step 6: VoiceBar.tsx 실시간 텍스트 표시

Step 7: 테스트 + 빌드 검증
```

---

## 12. 주의사항

- TTS 절대 부활 금지
- taskkill, kill-port 사용 금지
- 기존 Playwright 테스트 깨뜨리지 마
- npm run test 깨뜨리지 마
- test.skip() 금지
- 한 에이전트가 전체 맥락에서 한 번에 수정. GSD 서브에이전트로 쪼개지 마.
- npm run build + npm run test 통과 확인 후 git commit
