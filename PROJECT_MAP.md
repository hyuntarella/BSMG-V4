# bsmg-v5 지도
**용도:** Claude 세션 시작 시 컨텍스트 주입용. 구조·최신 문서 포인터·파일 연결.
**최종 갱신:** 2026-04-14

---

## 한 줄 요약

방수명가(부성에이티) 견적서 v5. Next.js 14 App Router + Supabase + Vercel + OpenAI(STT/TTS) + Claude(LLM). **음성 퍼스트, 터치 0회 목표** (차량 내 핸즈프리). lens 시스템의 하위 모듈.

---

## 공식 문서 (최신만 봐라)

**두 축으로 나뉨:** 원안(as-designed) vs 현재상태(as-built). 뭘 먼저 볼지 헷갈리면 아래 표 참고.

| 파일 | 성격 | 역할 | 언제 볼지 |
|---|---|---|---|
| `CLAUDE.md` | 규칙 | 스택·금지·검증·하네스 | 매 작업 시작 |
| `docs/PROJECT_SPEC.md` | 원안 | v1.1 초기 전체 기획 (배경·음성·DB·UI·API·구현 순서) | **"왜 이렇게 설계했나"** — 의도 확인 시 |
| `bsmg_estimate_final_v8.md` | 현재상태 | Phase 진행·repo 실제 구조·최근 배포·버그 기록 (v5~v7은 구버전) | **"지금 뭐가 구현돼있나"** — 실제 상태 확인 시 |
| `crm-requirements-spec.md` | 요구사항 | CRM 모듈 요건 | CRM 작업 시 |

> **팁:** 원안(SPEC)과 현재상태(v8)가 충돌하면 **v8이 진실**. SPEC은 갱신 안 되는 문서.

---

## 무시 영역 (휘발성/아카이브)

최상위에 누적된 세션 산출물. 현재 상태 파악엔 쓰지 말 것.

- `NEXT_SESSION_HANDOFF.md`, `NEXT_SESSION_HANDOFF_5~8.md` — 과거 세션 인계 메모
- `BSMG-V4-AUTONOMOUS-RUN.md`, `BSMG-V4-PARSER-FIX-PROMPT.md`, `BSMG-V4-UX-9.0-*.md` — v4 시절 프롬프트
- `bsmg_estimate_final_v5.md`, `v6.md`, `v7.md` — 견적 스펙 구버전 (v8만 유효)
- `docs/BSMG_V4_ANALYSIS.md`, `docs/HANDOFF_TO_NEXT_CHAT_v5.md`, `docs/SESSION_STATE.md` — 과거 세션 스냅샷
- `.planning/` — 작업 계획 휘발성
- `(방수) 방수명가 견적서(최신)/` — 외부 참고 자료 (직접 편집 금지)

---

## 코드 구조

```
app/                Next.js App Router (서버 기본, 'use client'는 필요 시만)
├── (authenticated)/    인증 후 접근 영역
├── api/                API 라우트 (route.ts)
├── dashboard/          대시보드
├── login/              로그인
└── layout.tsx / error / loading / not-found / offline

components/         도메인별 UI
├── calendar/ crm/ dashboard/ estimate/ inquiry/ proposal/
├── voice/              음성 UI (STT/TTS/웨이크워드)
├── layout/ ui/ settings/

lib/                공용 로직
├── supabase/           client.ts(브라우저) / server.ts(서버) — 새 인스턴스 생성 금지
├── estimate/           견적 계산 (P매트릭스, 공과잡비 3%, 이윤 6%, 10만원 절사)
├── voice/              STT/LLM/TTS 파이프라인
├── acdb/ excel/ pdf/ gdrive/ gsheets/ notion/ lens/ email/ utils/

hooks/              useVoice*, useEstimate*, useCrm, useAutoSave 등
e2e/                end-to-end 테스트
data/               정적 데이터 (단가표 등 추정)
middleware.ts       RLS/인증 미들웨어
```

---

## 도메인 하네스 (.claude/skills)

CLAUDE.md가 요청: 방수명가 코드 수정 시 `bsmg-orchestrator` 스킬 트리거.

| 스킬 | 트리거 영역 |
|---|---|
| `bsmg-orchestrator` | 오케스트레이션 진입점 (GSD phase, 재실행/수정/보완) |
| `voice-pipeline` | 음성 STT/TTS/LLM/프롬프트/신뢰도/웨이크워드 |
| `estimate-calc` | 견적·단가·P매트릭스·공과잡비·이윤·절사·면적 |
| `schema-ops` | Supabase·마이그레이션·RLS·타입 동기화·구독·company_id |
| `ui-build` | Figma 토큰 추출 → Tailwind 구현 → 1:1 대조 |
| `domain-qa` | 경계면 교차 검증 (API↔훅, DB↔TS 타입, 음성 JSON↔견적 상태) |

---

## 파일 간 연결 (건드리면 같이 확인)

- **DB 스키마 변경** → `lib/supabase/` + TypeScript 타입 + RLS 정책 + 영향받는 컴포넌트
- **음성 명령 추가** → `lib/voice/` 프롬프트 + `hooks/useVoice*` + 대상 도메인 hook
- **견적 계산 로직** → `lib/estimate/` + `hooks/useEstimate.ts` + 관련 컴포넌트 + `bsmg_estimate_final_v8.md` 스펙
- **UI 컴포넌트** → Figma 토큰 대조 (CLAUDE.md §3) + 200줄 제한 + 서버/클라이언트 판단
- **API 라우트** → `app/api/` + 프론트 훅의 shape + RLS

---

## 절대 규칙 요약 (CLAUDE.md 발췌)

- Next.js 15/React 19/Tailwind 4 **업그레이드 금지**
- TypeScript strict, `any` 금지
- 컴포넌트 파일당 200줄 이내
- 모든 테이블 `company_id` 기반 RLS
- 절대경로만 (`@/lib/`, `@/components/`, `@/hooks/`)
- 새 패키지 설치 전 승인 필수
- 금액 계산 수정 시 기존 계산식 명시 후 변경 보고
- "괜찮습니다" 금지. 빌드/린트/테스트/스크린샷 비교만 완료 기준

---

## lens와의 관계

bsmg-v5는 lens-docs의 `03_연동/01_견적서_bsmg-v5.md`에 명세된 견적서 모듈. lens 온톨로지의 `07_견적서_객체`가 이 시스템에서 생성됨. lens 관점에서 이걸 수정할 때는 `lens-docs/03_연동/01_견적서_bsmg-v5.md` 먼저 확인.

---

## 변경 이력
- 2026-04-14: 초안 생성
