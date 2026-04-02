# 3모드 음성/입력 시스템 — Phase A 빌드 결과

## 구현 파일 (신규)
- `lib/voice/inputMode.ts` — 모드 타입/플래그 정의
- `lib/voice/ttsPlayer.ts` — TTS 재생 유틸
- `lib/voice/anomalyDetector.ts` — 이상치 감지 (순수 함수)
- `lib/voice/soundEffect.ts` — 효과음 (Web Audio API)
- `components/voice/VoiceBarContainer.tsx` — 모드별 바 전환 래퍼
- `components/voice/TextInputBar.tsx` — 사무실 모드 텍스트 입력
- `tests/voice/realtimeParser.test.ts` — 파서 단위 테스트 16개

## 수정 파일
- `hooks/useEstimateVoice.ts` — 모드 상태, 텍스트 핸들러, TTS/효과음/이상치 연동
- `hooks/useVoice.ts` — pauseRecognition/resumeRecognition 추가
- `lib/voice/realtimeParser.ts` — 다중 숫자/되돌리기/일괄조정 패턴 추가
- `lib/voice/voiceLogTypes.ts` — inputSource 필드 추가
- `components/voice/VoiceLogPanel.tsx` — 입력 소스 아이콘
- `components/estimate/EstimateEditor.tsx` — VoiceBar → VoiceBarContainer 교체

## 미변경 파일 (의도적)
- `components/voice/VoiceBar.tsx` — 1글자도 수정 안 함 (조치 6)
- `lib/estimate/buildItems.ts` — 변경 없음
- `lib/estimate/constants.ts` — 변경 없음

## 빌드/테스트 결과
- `npm run build`: PASS
- `npm run test` (vitest): 83 passed, 2 failed (기존 실패: buildItems.test.ts, costBreakdown.test.ts)
- E2E (estimate-editor.spec.ts): 66 passed, 2 failed (기존 실패: RO-02 순서변경, XL-06 엑셀생성)

## 커밋 이력
1. `refactor: extract tts/anomaly/sound/inputMode utilities`
2. `feat: parser multi-field + undo + bulk patterns`
3. `feat: 3-mode voice/input system — VoiceBarContainer + mode integration`
