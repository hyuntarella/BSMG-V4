# Phase 2: 음성 편집 루프 - Validation Architecture

**Phase:** 02-voice-edit-loop
**Created:** 2026-03-30
**Source:** 02-RESEARCH.md Validation Architecture section

---

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Next.js 빌드 검증 (jest 없음) |
| Config file | 없음 |
| Quick run command | `npm run build` |
| Full suite command | `npm run build && npm run lint` |

---

## Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-03 | "바탕정리 재료비 400원으로" -> 테이블 즉시 반영 | manual (음성 실제 테스트) | `npm run build` | N/A |
| VOICE-04 | "크랙보수 20미터 추가" -> 공종 행 추가 | manual | `npm run build` | N/A |
| VOICE-05 | "재료비 전체 10% 올려" -> 전체 재료비 증가 | manual | `npm run build` | N/A |
| VOICE-06 | "총액 600만원으로" -> 역산 반영 | manual | `npm run build` | N/A |
| VOICE-07 | 95%+ 즉시실행, 70-95% 확인, 70%- 되묻기 | manual | `npm run build` | N/A |
| VOICE-08 | 되묻기 3회째 "알겠습니다" + 수정모드 종료시 카운터 리셋 | manual | `npm run build` | N/A |
| VUX-02 | "그거 올려" -> 직전 target 유추 | manual | `npm run build` | N/A |
| VUX-03 | "수정" 발화 -> 수정 모드 진입 | manual | `npm run build` | N/A |
| VUX-04 | "현재 상태 알려줘" -> TTS 요약 | manual | `npm run build` | N/A |
| VUX-05 | "취소" -> 이전 상태 복원 | manual | `npm run build` | N/A |

**모든 요구사항이 manual 테스트** -- 음성 인식 파이프라인의 특성상 자동화 불가. `npm run build && npm run lint` 통과가 코드 완료 기준이며, 갤럭시탭 실제 음성 테스트가 기능 완료 기준이다.

---

## Sampling Rate

- **Per task commit:** `npm run build` (빌드 에러 없음 확인)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** 빌드+린트 통과 후 갤럭시탭 음성 실제 테스트 (02-03-PLAN.md Task 2)

---

## Wave 0 Gaps

- 테스트 파일 신규 생성 불필요 -- 빌드/린트가 코드 완료 기준
- `hooks/useVoiceEditMode.ts` 신규 생성 -- Wave 1(02-01-PLAN.md)에서 생성
- `hooks/useEstimateVoice.ts` 신규 생성 -- Wave 1(02-01-PLAN.md)에서 생성

---

## Nyquist Compliance

이 Phase는 음성 파이프라인 특성상 자동화된 단위 테스트를 작성하기 어렵다. 대신:

1. **자동 검증**: `npm run build && npm run lint` -- TypeScript 타입 정합성 + ESLint 규칙 준수
2. **수동 검증**: 02-03-PLAN.md의 checkpoint:human-verify에서 8+1개 시나리오를 갤럭시탭 실제 음성으로 테스트
3. **코드 품질**: EstimateEditor.tsx 200줄 이내 제한 (`wc -l` 검증)

이 3가지가 결합되어 Phase 2의 Nyquist 요건을 충족한다.
