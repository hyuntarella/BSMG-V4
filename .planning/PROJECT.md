# 방수명가 견적서 v4

## What This Is

방수 시공 업체의 음성 기반 견적서 + CRM + 대시보드 + 캘린더 + 제안서 통합 시스템. 음성으로 견적 데이터를 입력/수정하고, 엑셀/PDF로 출력하며, Notion CRM 칸반보드에서 고객을 관리한다. 차량 내 핸즈프리 사용이 핵심. Next.js 14 + Supabase + OpenAI(STT/TTS) + Claude(LLM) 스택으로 기존 GAS 시스템을 완전 대체했다.

## Core Value

음성 한마디로 견적서가 완성된다. 터치 0회가 목표.

## Requirements

### Validated

- ✓ 음성 파싱 → 견적서 테이블 반영 (VOICE-01) — v1.0
- ✓ 음성 명령어 체계 시작/마디/종료 (VOICE-02) — v1.0
- ✓ modify 모드: 단가/공종/일괄/역산 (VOICE-03~06) — v1.0
- ✓ 확신도 3단계 분기 (VOICE-07) — v1.0
- ✓ 되묻기 2회 제한 (VOICE-08) — v1.0
- ✓ TTS 피드백 (VUX-01) — v1.0
- ✓ 컨텍스트 유지 대화 직전 3개 (VUX-02) — v1.0
- ✓ 웨이크워드/볼륨 버튼 (VUX-03) — v1.0
- ✓ 음성 시스템 명령 (VUX-04) — v1.0
- ✓ 음성 실행 취소 (VUX-05) — v1.0
- ✓ 인라인 셀 편집 + 재계산 (UI-01) — v1.0
- ✓ 견적서 목록 검색/조회 (UI-02) — v1.0
- ✓ 견적서 불러오기 (UI-03) — v1.0
- ✓ Supabase 저장 (OUT-01) — v1.0
- ✓ 자동저장 디바운스 (OUT-02) — v1.0
- ✓ ExcelJS 엑셀 생성/다운로드 (OUT-03) — v1.0
- ✓ PDF 생성/다운로드 (OUT-04) — v1.0
- ✓ Google Drive 업로드 (OUT-05) — v1.0
- ✓ CRM → 견적서 자동 채움 (CRM-01) — v1.0
- ✓ CRM 칸반보드 + 상세 모달 + 드래그&드롭 — v1.0
- ✓ 제안서 포팅 + GAS 제거 + PDF 저장 — v1.0
- ✓ 대시보드 5개 섹션 (CS현황/미발송/열람/연락/일정) — v1.0
- ✓ 캘린더 월간/주간/일간 뷰 + 이벤트 CRUD — v1.0
- ✓ 규칙서 설정 (P매트릭스/프리셋/원가/계산규칙/장비/보증) — v1.0

### Active

(v1.0 complete — next milestone requirements TBD)

### Out of Scope

- 이메일 자동 발송 — 당분간 수동 처리
- Picovoice 커스텀 웨이크워드 — 추후 단계
- 멀티테넌시/구독 과금 — 상용화 단계
- 고객 포탈 (열람 전용) — 상용화 단계
- 실시간 협업 (Realtime) — 추후
- 다중 명령 체이닝 — 추후

## Context

- v1.0 shipped 2026-03-31
- 코드베이스: ~18,360줄 TypeScript
- 12 phases, 35+ plans executed
- 전체 앱: 견적서 (음성+수동 편집) + 엑셀/PDF 출력 + 제안서 + CRM 칸반 + 대시보드 + 캘린더 + 규칙서 설정
- Notion CRM 연동 (REST API, SDK 미사용)
- E2E 테스트: CRM, 대시보드, 캘린더, 규칙서
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
| STT/TTS는 OpenAI, LLM은 Claude | STT/TTS 품질 vs 파싱 정확도 최적 조합 | ✓ Good |
| Google Drive + Supabase Storage 이중 저장 | 기존 업무 호환 (구드라이브 폴더 공유) | ✓ Good |
| Notion CRM 유지 (Supabase 이관 안 함) | CRM은 GAS 앱에서도 사용 중, 이중 관리 방지 | ✓ Good |
| 이메일 발송 수동 처리 | 우선순위 낮음, 핸즈프리 워크플로우에 불필요 | ✓ Good |
| 템플릿 기반 엑셀 생성 (ExcelJS readFile) | 기존 견적서 서식 1:1 유지 | ✓ Good |
| puppeteer-core + chromium-min for PDF | 서버리스 환경 호환 | ✓ Good |
| Notion REST fetch (SDK 미사용) | Phase 9에서 확립, 경량 유지 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-31 after v1.0 milestone*
