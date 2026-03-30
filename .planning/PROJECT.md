# 방수명가 견적서 v4

## What This Is

방수 시공 업체의 음성 기반 견적서 시스템. CRM에서 고객을 선택하고, 음성으로 견적 데이터를 입력/수정하며, 엑셀/PDF로 출력한다. 차량 내 핸즈프리 사용이 핵심. Next.js 14 + Supabase + OpenAI(STT/TTS) + Claude(LLM) 스택으로 기존 GAS 시스템을 완전 대체한다.

## Core Value

음성 한마디로 견적서가 완성된다. 터치 0회가 목표.

## Requirements

### Validated

- ✓ Next.js 14 + Supabase 기반 셋업 — existing
- ✓ Supabase Auth 이메일 로그인 — existing
- ✓ STT API (OpenAI Whisper) 연동 — existing
- ✓ LLM API (Claude Sonnet) 파싱 — existing
- ✓ TTS API (OpenAI gpt-4o-mini-tts) 연동 — existing
- ✓ 비즈니스 로직 이식 (buildItems, calc, priceData, constants) — existing
- ✓ P매트릭스/프리셋 Supabase seed — existing
- ✓ 견적서 UI 기본 구조 (탭, 테이블, 표지) — existing
- ✓ 음성 녹음 + STT + LLM 파이프라인 기본 동작 — existing

### Active

- [ ] 파싱 결과 → 견적서 테이블 정확한 반영
- [ ] 음성 명령어 체계 (시작/마디 넘기기/종료) 정상 동작
- [ ] 음성 modify 모드 (단가 변경, 공종 추가/삭제, 일괄 조정)
- [ ] UI 인라인 편집 (셀 탭 → 수정 → 금액 재계산)
- [ ] 견적서 저장 (Supabase upsert)
- [ ] 엑셀 출력 (ExcelJS → 다운로드)
- [ ] PDF 출력
- [ ] CRM 연동 (Notion CRM → 고객 정보 가져오기 → 견적서 시작)
- [ ] CRM에서 견적서 버튼 → 주소/담당자 자동 채움
- [ ] 음성 확장 (견적서 외 시스템 명령: 저장, 탭 전환, 요약, 비교)
- [ ] 확신도 기반 3단계 분기 (즉시실행/확인/되묻기)
- [ ] TTS 피드백 (모든 명령 후 결과+총액 알림)
- [ ] 컨텍스트 유지 대화 (직전 3개 명령 참조)
- [ ] 견적서 목록 페이지
- [ ] 견적서 불러오기
- [ ] 마진 게이지 실시간 표시
- [ ] 복합/우레탄 비교 탭
- [ ] 자동 저장 (디바운스)
- [ ] Google Drive 업로드

### Out of Scope

- 이메일 자동 발송 — 당분간 수동 처리
- Picovoice 커스텀 웨이크워드 — 추후 단계
- 멀티테넌시/구독 과금 — 상용화 단계
- 고객 포탈 (열람 전용) — 상용화 단계
- 제안서 자동 작성 — 별도 프로젝트
- 캘린더/정산 Supabase 이관 — 별도 프로젝트
- 실시간 협업 (Realtime) — 추후

## Context

- 기존 v1(GAS HTML), v2(WYSIWYG), v3(Netlify STT) 모두 GAS 의존 문제로 불안정
- v4는 GAS 완전 탈피. 코드 재사용 없이 새로 작성
- 현재 코드 ~3,400줄 구현됨 (hooks 5개, components 12개, lib 15개, API routes 7개)
- STT/LLM/TTS API 연동은 동작하지만, 파싱 결과 → UI 반영 연결이 깨져 있음
- 음성 명령어 체계가 불안정 (시작/마디/종료 명령이 제대로 안 먹힘)
- UI 인라인 편집이 동작하지 않음
- 저장/출력 기능은 코드가 있으나 테스트되지 않음
- CRM은 Notion API 연동 (env vars 설정됨, 코드 미구현)
- 대상 디바이스: 갤럭시탭 S10 FE (1200x800)
- 사용 환경: 차량 내 핸즈프리

## Constraints

- **Tech stack**: Next.js 14 + Supabase + Tailwind 3 — 변경 금지
- **No GAS**: GAS 코드 수정/의존 금지
- **No v2 code**: Figma 디자인만 참조, v2 코드 재사용 금지
- **TypeScript strict**: any 타입 금지
- **Component size**: 파일당 200줄 이내
- **Voice first**: 모든 입력/수정은 음성으로 가능해야 함

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| STT/TTS는 OpenAI, LLM은 Claude | STT/TTS 품질 vs 파싱 정확도 최적 조합 | — Pending |
| Google Drive + Supabase Storage 이중 저장 | 기존 업무 호환 (구드라이브 폴더 공유) | — Pending |
| Notion CRM 유지 (Supabase 이관 안 함) | CRM은 GAS 앱에서도 사용 중, 이중 관리 방지 | — Pending |
| 이메일 발송 수동 처리 | 우선순위 낮음, 핸즈프리 워크플로우에 불필요 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
