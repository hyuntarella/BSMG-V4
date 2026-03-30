# Project Research Summary

**Project:** 방수명가 견적서 v4
**Domain:** Voice-first field estimation tool (B2B SaaS, construction/waterproofing)
**Researched:** 2026-03-30
**Confidence:** HIGH — spec is internally authored, not inferred from external sources

## Executive Summary

방수명가 견적서 v4는 방수 시공 견적을 차량 내 핸즈프리 음성 명령으로 처리하는 모바일 우선 단일 앱이다. 기존 GAS(Google Apps Script) 기반 v1/v2/v3의 핵심 문제인 CacheService 불안정, sandbox 제약, google.script.run 비결정적 실패를 Next.js 14 + Supabase + Vercel로 완전 대체한다. 음성 입력이 먼저이고 터치 UI는 보조 수단이다. 이 원칙이 모든 기능 우선순위와 UX 결정을 지배한다.

현재 구현 상태는 약 3,400줄로 기반 셋업(인증, STT/TTS/LLM API 연동, 비즈니스 로직 이식, 기본 UI 구조)이 완료되어 있다. 그러나 파싱 결과의 UI 반영 연결, 음성 명령어 체계 안정성, 인라인 편집, 저장/출력, CRM 연동이 미완성이다. 즉, 파이프라인 각 단계는 존재하지만 end-to-end 연결이 깨져 있다.

주요 리스크는 두 가지다. 첫째, 차량 내 음성 인식 정확도(창문 열림 시 65-80%)가 목표 경험에 미달할 수 있다 — TTS 확인 루프와 실행취소(undo)로 반드시 보완해야 한다. 둘째, 현재 "코드는 있으나 연결이 깨진" 상태를 방치하고 새 기능을 추가하면 기술 부채가 급속히 누적된다 — 다음 단계는 신규 기능 추가가 아닌 기존 파이프라인 end-to-end 연결 완성이어야 한다.

## Key Findings

### Recommended Stack

스택은 이미 확정되고 부분 구현된 상태다. Next.js 14 (App Router) + TypeScript strict + Tailwind CSS 3, Supabase (PostgreSQL + Auth + Storage), Vercel 배포, OpenAI Whisper(STT) + gpt-4o-mini-tts(TTS), Claude Sonnet(LLM), ExcelJS(xlsx 생성), Resend(이메일). 이 조합에서 변경 가능한 것은 없다 — 이미 코드가 작성되어 있고 PROJECT.md에 "변경 금지"로 명시되어 있다.

**Core technologies:**
- Next.js 14 App Router: 서버리스 API routes + 클라이언트 컴포넌트 혼합 — Vercel 최적 배포 단위
- Supabase: Auth(RLS) + PostgreSQL + Storage — GAS CacheService 대체, company_id 기반 격리
- OpenAI Whisper (gpt-4o-transcribe): STT — 한국어 건설 도메인 전문용어 처리
- Claude Sonnet: 구조화 파싱 LLM — 복합 명령 해석, 확신도 출력
- OpenAI gpt-4o-mini-tts: TTS — 자연스러운 한국어 음성 피드백
- ExcelJS: 서버리스 환경 xlsx 생성 — GAS Sheets 출력 대체
- Notion API: CRM 데이터 소스 — Supabase 이관 없이 read-only 연동

### Expected Features

PROJECT.md의 Active 항목이 현재 구현해야 할 기능 목록이다. CLAUDE.md 섹션 2에서 음성 대체 가능 기능과 UI 유지 기능이 명확히 분류되어 있다.

**Must have (table stakes) — 현재 Active 상태:**
- 파싱 결과 → 견적서 테이블 정확한 반영 — 핵심 파이프라인 연결
- 음성 modify 모드 (단가 변경, 공종 추가/삭제, 일괄 조정) — 핵심 가치
- UI 인라인 편집 (셀 탭 → 수정 → 금액 재계산) — 음성 보조 수단
- 견적서 저장 (Supabase upsert) — 데이터 지속성
- 음성 명령어 체계 (시작/마디/종료) 정상 동작 — 핸즈프리 진입점
- 확신도 기반 3단계 분기 + TTS 피드백 — 오류 허용 UX

**Should have (competitive):**
- 엑셀 출력 (ExcelJS) — 기존 업무 호환성 필수
- 컨텍스트 유지 대화 (직전 3개 명령) — 자연스러운 연속 대화
- CRM 연동 (Notion → 고객 정보 자동 채움) — 워크플로우 완결
- 마진 게이지 실시간 표시 — 가격 결정 지원
- 복합/우레탄 비교 탭 — 핵심 영업 도구
- 자동 저장 (디바운스) — 데이터 손실 방지

**Defer (out of scope, confirmed):**
- 이메일 자동 발송 — 수동 처리로 대체
- Picovoice 커스텀 웨이크워드 — 2단계 (Web Speech API 웨이크워드 먼저)
- 멀티테넌시/구독 과금 — 상용화 단계
- 실시간 협업 (Supabase Realtime) — 추후
- 제안서 자동 작성 — 별도 프로젝트
- PDF 출력 — 우선순위 낮음 (엑셀이 우선)

### Architecture Approach

아키텍처는 단일 Vercel 앱 + Supabase 백엔드 구조다. 핵심 데이터 흐름은 마이크 → MediaRecorder(webm/opus) → /api/stt → /api/llm → 확신도 분기 → state 반영 → Supabase upsert → TTS 피드백이다. 모든 API 키는 서버사이드 route에서만 노출되고, RLS로 company_id 기반 데이터 격리가 강제된다.

**Major components:**
1. `hooks/useVoice.ts` — 녹음 + STT + LLM + TTS + 확신도 라우팅 통합 오케스트레이터
2. `hooks/useEstimate.ts` — 견적서 전체 state 관리 (buildItems, calc, 오버라이드 반영)
3. `components/estimate/WorkSheet.tsx` — 공종 테이블 + 인라인 편집 (핵심 UI)
4. `lib/voice/commands.ts` — 파싱된 명령 배열을 state에 실행하는 command executor
5. `lib/estimate/buildItems.ts` — v1 핵심 로직 (P매트릭스 기반 공종 생성, 이미 이식됨)
6. `/api/llm/route.ts` — Claude Sonnet 호출, 4개 모드(extract/supplement/modify/command) 분기
7. `lib/excel/generateWorkbook.ts` — ExcelJS 기반 xlsx 생성 (GAS Sheets 대체)

### Critical Pitfalls

1. **파싱 결과가 UI에 반영되지 않는 연결 단절** — 현재 이 상태. LLM 응답 JSON → useEstimate state 업데이트 경로가 끊겨 있다. commands.ts executor가 모든 action type을 완전히 처리하도록 먼저 완성해야 한다.

2. **음성 명령어 체계 불안정** — 시작/마디넘기기/종료 명령이 제대로 동작하지 않는다. extract/supplement/modify 모드 전환 로직과 웨이크워드 감지가 별개로 분리되어야 한다. 모드 상태를 명확한 FSM(유한 상태 기계)으로 구현하지 않으면 반복 재발한다.

3. **인라인 편집과 음성 편집의 state 충돌** — 두 경로(터치 편집, 음성 명령)가 같은 estimate state를 수정한다. optimistic update + Supabase upsert 패턴을 일관되게 적용하지 않으면 데이터 불일치가 발생한다.

4. **차량 내 STT 정확도 저하** — 창문 열림 시 65-80% 수준. 이를 UX 레벨에서 수용해야 한다: TTS 확인 루프, 확신도 70% 미만 자동 되묻기, "취소" 명령 즉시 undo. 정확도를 높이는 것보다 오류를 빠르게 잡는 것이 목표.

5. **ExcelJS로 GAS Sheets 레이아웃 재현 난이도** — 셀 병합, 테두리, 서식이 복잡하다. v1 GAS 출력물을 기준으로 역설계해야 하며, 2-3일 별도 작업이 필요하다. 저장 기능보다 먼저 구현하면 전체 일정이 블록된다 — 엑셀 출력은 다른 기능 안정화 후 독립 단계로 처리해야 한다.

## Implications for Roadmap

현재 프로젝트는 신규 개발이 아닌 "부분 구현된 시스템의 end-to-end 연결"이다. 따라서 위상 순서는 기능 추가 순서가 아닌 연결 복구 우선순서다.

### Phase 1: 음성-to-견적서 파이프라인 완성

**Rationale:** 가장 많은 기능이 이 연결에 의존한다. 이것 없이는 다른 어떤 기능도 검증할 수 없다. 현재 가장 크리티컬한 단절 지점.
**Delivers:** 음성 발화 → 파싱 → 견적서 테이블 반영 → TTS 피드백이 end-to-end 동작하는 단일 루프
**Addresses:** 파싱 결과 UI 반영, 음성 extract/supplement 모드, TTS 피드백
**Avoids:** 연결 단절 방치하고 신규 기능 추가 시 기술 부채 누적

### Phase 2: 음성 modify 모드 + 확신도 분기

**Rationale:** Phase 1(데이터 입력)이 완성된 후 편집 루프를 닫는다. 확신도 분기가 없으면 차량 내 오사용 리스크가 높다.
**Delivers:** 단가 변경, 공종 추가/삭제, 일괄 조정, 총액 역산을 음성으로 처리. 3단계 확신도(즉시실행/확인/되묻기) 동작.
**Uses:** lib/voice/commands.ts executor, lib/voice/confidenceRouter.ts
**Implements:** 컨텍스트 유지 대화 (직전 3개 명령 추적)

### Phase 3: 인라인 편집 + 저장 + 자동저장

**Rationale:** 음성 보조 수단인 터치 편집을 완성하고, 데이터 지속성을 확보한다. 이후 모든 기능 테스트에 저장이 필요하다.
**Delivers:** 셀 탭 → 숫자 키패드 → 금액 재계산, Supabase upsert, 디바운스 자동저장
**Avoids:** state 충돌 — optimistic update 패턴 일관 적용

### Phase 4: 견적서 UI 완성 (마진 게이지 + 비교 탭 + 목록)

**Rationale:** 핵심 기능이 동작한 후 시각 피드백과 워크플로우를 완성한다.
**Delivers:** 마진 게이지 실시간, 복합/우레탄 비교 탭, 견적서 목록 + 불러오기
**Uses:** Figma 시안 (v2 코드 참조 금지)

### Phase 5: CRM 연동 (Notion)

**Rationale:** 독립적인 연동 작업. UI/음성이 안정된 후 진행해야 충돌 없음.
**Delivers:** Notion CRM에서 고객 선택 → 견적서 자동 채움, CRM 버튼 → 견적서 시작
**Implements:** Notion API read-only 연동 (env vars 기설정됨, 코드 미구현)

### Phase 6: 엑셀 출력 (ExcelJS)

**Rationale:** 복잡한 독립 작업. 다른 기능 안정화 후 집중 처리. 업무 호환성 필수이지만 마지막 단계.
**Delivers:** xlsx 다운로드 (GAS 출력물 레이아웃 재현), Google Drive 업로드
**Avoids:** 초반 블록킹 — ExcelJS 레이아웃 재현을 먼저 하면 일정 지연

### Phase Ordering Rationale

- Phase 1-3은 의존성 체인: 입력 → 편집 → 저장. 순서 변경 불가.
- Phase 4(UI)는 Phase 1-2 완성 후 병렬 가능하지만, 테스트 품질 위해 순차 권장.
- Phase 5(CRM)는 완전 독립적 — Phase 3 이후 언제든 삽입 가능.
- Phase 6(엑셀)은 UI 레이아웃 확정 후에야 정확한 셀 매핑이 가능하므로 마지막.
- 웨이크워드(Web Speech API) / 하드웨어 버튼은 Phase 2 내에 포함.
- PDF 출력은 out of scope 유지.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (modify 모드):** 명령 파서와 state executor 사이의 action type 설계가 핵심 — 모든 CLAUDE.md 섹션 4-2 action들을 완전히 커버하는지 검토 필요
- **Phase 6 (엑셀):** ExcelJS API와 GAS Sheets 출력물 간 셀 서식 매핑 — v1 견적서.html Code.js est_handleSave 역설계 필요

Phases with standard patterns (skip research-phase):
- **Phase 1 (파이프라인 연결):** 이미 구현된 각 단계를 연결만 하면 됨 — 표준 패턴
- **Phase 3 (저장):** Supabase upsert + optimistic update — 잘 문서화된 패턴
- **Phase 5 (Notion 연동):** Notion API read-only — 표준 REST 연동

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 확정, 부분 구현됨. CLAUDE.md + PROJECT.md 일치 |
| Features | HIGH | PROJECT.md Active 목록이 명확한 우선순위 기준 |
| Architecture | HIGH | CLAUDE.md 섹션 3-4에 상세 명시, 코드 존재 |
| Pitfalls | HIGH | PROJECT.md Context 섹션이 현재 실패 지점을 명시 |

**Overall confidence:** HIGH

### Gaps to Address

- **Notion API 연동 범위:** read-only로 고객 정보만 가져오는지, 파이프라인 상태 업데이트도 필요한지 — Phase 5 계획 시 확인
- **Google Drive 업로드 방식:** Supabase Storage와 이중 저장 시 충돌 가능성, Drive API 인증 방식 — Phase 6 계획 시 확인
- **웨이크워드 Web Speech API 한국어 지원 범위:** "견적"/"시작" 감지 정확도가 차량 내 소음에서 충분한지 — Phase 2 구현 시 실측 필요
- **PDF 출력 재논의:** out of scope로 확정됐지만 고객 이메일 발송 워크플로우 복원 시 필요해질 수 있음 — Phase 6 완료 후 재평가

## Sources

### Primary (HIGH confidence)
- `CLAUDE.md` (v4 종합 기획서 v1.1, 2026-03-26) — 스택, 기능, 아키텍처, 데이터베이스 스키마, 구현 순서
- `.planning/PROJECT.md` (2026-03-30) — 현재 구현 상태, Active/Validated/Out of scope 요구사항, Key Decisions

### Secondary (MEDIUM confidence)
- Git log (최근 5 커밋) — 실제 구현 진행 상황 (벽체면적 파싱, TTS 안내, 음성 플로우 재설계 이력)
- Memory: project_current_state.md — P매트릭스 RLS 수정, 벽체단위, 음성가이드복원 완료 상태

### Tertiary (LOW confidence)
- OpenAI STT 정확도 수치 (섹션 11-1) — 내부 추정값, 실측 미완료. 차량 내 실제 정확도는 검증 필요.

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
