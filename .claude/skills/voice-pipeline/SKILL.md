---
name: voice-pipeline
description: "방수명가 음성 파이프라인 작업 스킬. STT(Whisper) → LLM(Claude) → TTS(OpenAI) 전체 파이프라인, 음성 명령 추가/수정, 프롬프트 엔지니어링, 신뢰도 라우팅 조정, 교정 이력 관리를 수행한다. '음성', 'STT', 'TTS', '프롬프트', '명령 추가', '신뢰도', '웨이크워드', '발화', '녹음' 키워드가 있으면 이 스킬을 사용하라."
---

# 음성 파이프라인 스킬

Voice Architect 에이전트가 사용하는 작업 스킬.

## 파이프라인 구조

```
발화 → [STT] Whisper gpt-4o-transcribe (한국어)
     → [프롬프트 선택] EXTRACT(최초) / MODIFY(편집 중)
     → [LLM] Claude Sonnet + 컨텍스트(P매트릭스 + 교정 이력)
     → [파싱] { commands[], clarification_needed, confidence }
     → [라우팅] ≥0.9 즉시실행 / 0.5~0.9 확인 / <0.5 되묻기
     → [TTS] OpenAI gpt-4o-mini-tts (비서 톤)
```

## 음성 명령 추가 절차

1. `/lib/voice/commands.ts`의 VoiceCommand 인터페이스 확인
2. 기존 명령 목록 확인 (충돌/중복 방지)
3. 새 명령의 JSON shape 정의
4. `/lib/voice/prompts.ts`에 few-shot 예시 추가
5. `useEstimateVoice.ts` 훅에 명령 핸들러 연결
6. 테스트: 발화 예문 3개 이상으로 LLM 파싱 결과 확인

## 프롬프트 수정 규칙

- EXTRACT 프롬프트: 최초 발화에서 공종/수량/단가를 추출
- MODIFY 프롬프트: 편집 중 발화에서 변경 명령을 추출
- 수정 시 기존 few-shot과 일관성 유지 — 새 예시가 기존 패턴을 깨뜨리지 않도록
- 교정 이력(correction history)은 프롬프트에 포함되어 반복 오류를 줄임

## 신뢰도 라우팅 조정

`/lib/voice/confidenceRouter.ts`의 임계값:
- `HIGH_CONFIDENCE = 0.9` — 즉시 실행
- `LOW_CONFIDENCE = 0.5` — 되묻기
- 중간 → 사용자 확인 후 실행

임계값 변경 시: 기존 값 → 새 값 → 변경 이유를 반드시 명시

## 금지 사항
- 프롬프트에서 한국어 지원 제거 금지
- 신뢰도 라우팅 우회 금지 (항상 즉시실행 등)
- TTS 톤을 로봇처럼 변경 금지
