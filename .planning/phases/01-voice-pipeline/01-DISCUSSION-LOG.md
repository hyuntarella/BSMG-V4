# Phase 1: 음성 파이프라인 연결 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 01-음성 파이프라인 연결
**Areas discussed:** 음성 가이드 플로우 UX

---

## 음성 가이드 플로우 UX

### 첫 발화 처리 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 전체 파싱 우선 | 첫 발화에서 parseAllFields로 4필드 전부 추출 시도. 다 채워지면 즉시 생성, 빈 것만 순차 질문. 현재 코드가 이 방식. | ✓ |
| 항상 순차 질문 | 4필드를 항상 하나씩 물어보고 답변 받음. 예측 가능하지만 느림. | |
| LLM extract 모드 | 첫 발화를 Claude LLM으로 보내 12필드 추출. 정확하지만 API 호출 비용+시간 추가. | |

**User's choice:** 전체 파싱 우선 (Recommended)

### 자동 녹음 재개

| Option | Description | Selected |
|--------|-------------|----------|
| TTS 후 자동 녹음 | TTS로 질문 읽은 후 1.5초 후 자동 녹음 시작. 터치 0회 유지. | ✓ |
| 버튼 누르면 녹음 | TTS 피드백 후 사용자가 마이크 버튼을 눌러야 다음 답변 녹음. 안정적이지만 터치 필요. | |

**User's choice:** TTS 후 자동 녹음 (Recommended)

### 마디 넘기기 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 0으로 채우고 다음 | 현재 필드를 0으로 설정하고 다음 필드로. 예: 벽체 질문에 "됐어" → wallM2=0 | ✓ |
| null로 남기고 다음 | 필드를 null로 남기고 넘어감. 나중에 supplement 모드로 보충 가능. | |
| 기본값 적용 | 필드별 기본값 적용. 면적=100m², 벽체=0, 평단가=중간값. | |

**User's choice:** 0으로 채우고 다음 (Recommended)

### 시트 생성 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 복합+우레탄 둘 다 | 4필드 모두 수집하므로 두 시트 동시 생성. CLAUDE.md 설계 기준. | ✓ |
| 평단가 입력된 것만 | complexPpp가 0이면 복합 시트 안 만들고, urethanePpp가 0이면 우레탄 안 만들어서 불필요한 시트 방지. | |

**User's choice:** 복합+우레탄 둘 다 (Recommended)

---

## Claude's Discretion

- TTS 피드백 내용 범위
- 에러/재시도 처리 방식
- voiceFlow stateRef 동기화 수정 방법

## Deferred Ideas

None
