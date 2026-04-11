---
name: bsmg-orchestrator
description: "방수명가 도메인 전문가 오케스트레이터. 음성 파이프라인, 견적 계산, DB 스키마, UI 컴포넌트, 통합 QA 등 방수명가 프로젝트의 모든 구현 작업을 전문 에이전트 팀으로 수행한다. 다음 상황에서 반드시 트리거: (1) GSD phase 실행 시, (2) 음성/STT/TTS/LLM/프롬프트 관련 작업, (3) 견적/계산/단가/P매트릭스/금액 관련 작업, (4) Supabase/스키마/마이그레이션/RLS 관련 작업, (5) UI 컴포넌트/Figma/Tailwind 관련 작업, (6) 경계면 검증/통합 테스트 요청, (7) '다시 실행', '재실행', '수정', '보완' 등 후속 작업 요청. 방수명가 코드를 수정하는 모든 작업에 이 스킬을 사용하라."
---

# 방수명가 도메인 오케스트레이터

방수명가 프로젝트의 구현 작업을 도메인 전문 에이전트에게 위임하고 결과를 통합하는 오케스트레이터.

## 실행 모드: 서브 에이전트 (전문가 풀 패턴)

작업 유형에 따라 적합한 전문가를 선택하여 서브 에이전트로 호출한다. 독립적인 작업은 `run_in_background: true`로 병렬 실행한다.

## 전문가 풀

| 에이전트 | 정의 파일 | 트리거 키워드 |
|----------|----------|-------------|
| **Voice Architect** | `.claude/agents/voice-architect.md` | 음성, STT, TTS, LLM, 프롬프트, 신뢰도, 명령 파싱, 웨이크워드 |
| **Estimate Engine** | `.claude/agents/estimate-engine.md` | 견적, 계산, 단가, P매트릭스, 공과잡비, 이윤, 금액, 절사 |
| **Schema Guard** | `.claude/agents/schema-guard.md` | 스키마, 마이그레이션, RLS, 테이블, 컬럼, Supabase, 타입 동기화 |
| **UI Builder** | `.claude/agents/ui-builder.md` | UI, 컴포넌트, Figma, 디자인, 레이아웃, 페이지, 화면 |
| **Domain QA** | `.claude/agents/domain-qa.md` | 검증, QA, 테스트, 경계면, 통합, 정합성 |

## Phase 0: 컨텍스트 확인

워크플로우 시작 시 기존 산출물을 확인하여 실행 모드를 결정한다:

1. `_workspace/` 디렉토리 존재 여부 확인
2. 분기:
   - `_workspace/` 존재 + 부분 수정 요청 → **부분 재실행** (해당 에이전트만 재호출)
   - `_workspace/` 존재 + 새 입력 → **새 실행** (`_workspace/`를 `_workspace_prev/`로 이동)
   - `_workspace/` 미존재 → **초기 실행**

## Phase 1: 작업 분석 및 에이전트 선택

1. 사용자 요청 또는 GSD PLAN.md를 분석하여 관련 도메인을 식별한다
2. 도메인별 전문가를 선택한다 (복수 선택 가능)
3. 작업 간 의존 관계를 파악한다:
   - 독립 작업 → 병렬 실행
   - 의존 작업 → 순차 실행 (예: 스키마 변경 → 타입 동기화 → API → 프론트)

**도메인 매핑 규칙:**
- 파일 경로에 `voice/`, `stt`, `tts`, `llm` → Voice Architect
- 파일 경로에 `estimate/`, `calc`, `price`, `cost` → Estimate Engine
- 파일 경로에 `supabase/`, `migrations/` 또는 RLS 관련 → Schema Guard
- 파일 경로에 `components/` 또는 Figma URL 포함 → UI Builder
- 변경된 파일이 2개 이상 도메인에 걸침 → Domain QA 추가 호출

## Phase 2: 에이전트 실행

각 에이전트를 Agent 도구로 호출한다. 반드시 다음 규칙을 따른다:

1. **에이전트 정의 파일을 읽고** 해당 내용을 프롬프트에 포함한다
2. **model: "opus"** 파라미터를 반드시 명시한다
3. 프롬프트에 반드시 포함할 내용:
   - 대상 파일 경로 (full path)
   - 구체적 행동 (무엇을 어떻게)
   - 성공 기준
   - 참조할 기존 코드 패턴
   - 금지 사항 (CLAUDE.md 절대 규칙 중 관련 항목)

**호출 예시:**
```
Agent({
  description: "음성 명령 추가",
  model: "opus",
  prompt: `[voice-architect.md 내용]
  
  ## 작업
  - 대상: /lib/voice/commands.ts
  - 행동: '방수 면적 설정' 음성 명령 추가
  - 성공 기준: VoiceCommand 인터페이스 준수, 기존 명령과 충돌 없음
  - 참조: 기존 add_item 명령 패턴
  - 금지: any 타입, 상대경로`
})
```

**병렬 실행 (독립 작업 시):**
```
// 단일 메시지에 여러 Agent 호출
Agent({ description: "UI 컴포넌트", model: "opus", run_in_background: true, ... })
Agent({ description: "API 라우트", model: "opus", run_in_background: true, ... })
```

## Phase 3: QA 검증

에이전트 실행 완료 후, 변경된 파일이 2개 이상 도메인에 걸치면 Domain QA를 호출한다.

1. 변경된 파일 목록을 Domain QA에 전달
2. 경계면 검증 결과를 받는다
3. 불일치 발견 시:
   - 해당 도메인 에이전트를 재호출하여 수정
   - 수정 후 Domain QA 재검증
   - 불일치 0개가 될 때까지 반복 (최대 2회)

## Phase 4: 빌드 검증

모든 작업 완료 후 CLAUDE.md 검증 프로토콜을 실행한다:
1. `npm run build` 통과
2. `npm run lint` 에러 0
3. TypeScript 타입 에러 0

실패 시 관련 에이전트를 재호출하여 수정한다.

## Phase 5: 결과 보고

```markdown
## 작업 완료 보고
### 수정한 파일
- path/to/file.ts — 변경 요약 1줄

### 빌드/린트
- build: PASS/FAIL
- lint: PASS/FAIL
- type: PASS/FAIL

### QA 검증 (경계면 변경 시)
| 경계면 | 상태 |
|--------|------|
| 음성→견적 | PASS |

### 미해결 이슈
- (있으면 기술)
```

## GSD 통합

GSD phase 실행 시 이 오케스트레이터가 자동으로 참여한다:

1. GSD executor가 PLAN.md의 태스크를 실행할 때, 태스크 내용을 분석
2. 관련 도메인 전문가를 Phase 1 규칙에 따라 선택
3. 전문가의 도메인 지식을 활용하여 구현 품질을 높임

## 에러 핸들링

| 에러 유형 | 대응 |
|----------|------|
| 에이전트 실패 | 1회 재시도, 재실패 시 실패 내용 보고 |
| 빌드 실패 | 에러 메시지 분석 → 관련 에이전트 재호출 |
| QA 불일치 | 정본 우선순위(DB>타입>API>프론트)에 따라 수정 방향 결정 |
| 도메인 판별 불가 | 사용자에게 확인 요청 |

## 데이터 전달

- **에이전트 간**: 반환값 기반 (서브 에이전트 결과를 메인이 수집)
- **대용량 산출물**: `_workspace/{phase}_{agent}_{artifact}.{ext}` 파일 기반
- **최종 결과**: 사용자 지정 경로에 직접 출력

## 테스트 시나리오

### 정상 흐름: 음성 명령 추가
1. 사용자: "새 음성 명령 '면적 설정' 추가해줘"
2. Phase 1: Voice Architect + Estimate Engine 선택 (음성+견적 경계)
3. Phase 2: Voice Architect가 commands.ts 수정 → Estimate Engine이 calc.ts 연동 확인
4. Phase 3: Domain QA가 음성→견적 경계면 검증
5. Phase 4: build + lint 통과
6. Phase 5: 결과 보고

### 에러 흐름: 스키마 변경 후 타입 불일치
1. 사용자: "estimates 테이블에 discount 컬럼 추가"
2. Phase 2: Schema Guard가 마이그레이션 + RLS 생성
3. Phase 3: Domain QA가 DB→타입 경계면에서 types.ts 불일치 발견
4. Schema Guard 재호출 → types.ts 업데이트
5. Domain QA 재검증 → PASS
6. Phase 4: build 통과
