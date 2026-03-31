# Roadmap: 방수명가 견적서 v4

## Overview

Phase 1~4 완료 (음성 파이프라인 + 편집 루프 + 저장 + 목록). Phase 5부터 견적서 완성 → 제안서 → CRM → 대시보드 → 캘린더 → 규칙서 순서로 전체 시스템을 구축한다.

## Phases

**완료된 Phase (1~4)**

- [x] **Phase 1: 음성 파이프라인 연결** (completed 2026-03-30)
- [x] **Phase 2: 음성 편집 루프** (completed 2026-03-31)
- [x] **Phase 3: 인라인 편집 + 저장** (completed 2026-03-31)
- [x] **Phase 4: 견적서 UI 완성** (completed 2026-03-31)

**진행 예정 Phase (5~39)**

### 견적서 엑셀 출력 (Phase 5-8)
- [ ] **Phase 5**: 복합 템플릿 로드 + 데이터 채우기
- [ ] **Phase 6**: 우레탄 템플릿 + 동적 행 삽입
- [ ] **Phase 7**: 표지(Sheet1) — 관리번호, 고객명, 금액 한글변환, 보증조건
- [ ] **Phase 8**: 엑셀 다운로드 버튼 + Supabase Storage 업로드

### 견적서 PDF 출력 (Phase 9-10)
- [ ] **Phase 9**: 견적서 PDF 생성 (서버사이드 렌더링)
- [ ] **Phase 10**: PDF 다운로드 + Google Drive 업로드

### 제안서 (Phase 11-14)
- [ ] **Phase 11**: 제안서.html → Next.js 페이지 포팅
- [ ] **Phase 12**: GAS 호출 → API route 대체
- [ ] **Phase 13**: 견적서/CRM → 제안서 연결 (주소 + 담당자)
- [ ] **Phase 14**: 제안서 PDF → Google Drive 저장

### 견적서 수동편집 UI (Phase 15-22)
- [ ] **Phase 15**: 공종 추가 — 프리셋 선택 모달 + 자유입력
- [ ] **Phase 16**: 공종 삭제 × 버튼
- [ ] **Phase 17**: 공종명/규격/단위 인라인 편집
- [ ] **Phase 18**: 면적(m²)/벽체면적 수동 입력
- [ ] **Phase 19**: 고객명/담당자/연락처/메모 수동 입력
- [ ] **Phase 20**: 평단가 변경 시 공종 재생성 확인 UX
- [ ] **Phase 21**: 시트 삭제 + 공종 순서 변경 (↑↓)
- [ ] **Phase 22**: 장비 아이템 추가 (사다리차/스카이차/폐기물)

### CRM (Phase 23-28)
**Plans:** 6 plans in 4 waves

Plans:
- [x] 09-23-PLAN.md — Notion API 클라이언트 + CRM CRUD + 댓글 API routes
- [x] 09-24-PLAN.md — CRM 칸반보드 UI (5탭 + 파이프라인 컬럼 + 카드)
- [x] 09-25-PLAN.md — CRM 상세 모달 (인라인 편집 + 댓글 + 타임라인 + 액션)
- [x] 09-26-PLAN.md — 레코드 생성 모달 + 드래그&드롭 파이프라인 이동 + Undo
- [x] 09-27-PLAN.md — 실적 탭 (카드 갤러리, 연도/월 그룹, 성공 파란/실패 붉은)
- [ ] 09-28-PLAN.md — 견적서/제안서 연결 + 검색 + 담당자 필터 + E2E 테스트

### 대시보드 (Phase 29-33)
**Plans:** 5 plans in 3 waves

Plans:
- [x] 29-PLAN.md — CS 현황 섹션 (Notion CRM 클라이언트 + 카드 리스트 + 파이프라인 변경)
- [ ] 30-PLAN.md — 미발송 카드 (경과일수 + 더보기 + UI 숨김)
- [ ] 31-PLAN.md — 견적서 열람 고객 카드 (상대시간 + 추적 픽셀)
- [ ] 32-PLAN.md — 연락해야 할 곳 카드 (성공확률 미배정 건)
- [ ] 33-PLAN.md — 오늘 일정 + 견적서 불러오기 모달 + E2E 테스트 + 인증 우회

### 캘린더 (Phase 34-36)
**Plans:** 3 plans in 3 waves

Plans:
- [ ] 34-PLAN.md — Notion 캘린더 CRUD API + 월간 그리드 뷰
- [ ] 35-PLAN.md — 주간/일간 뷰 + TimeGrid 공통 컴포넌트
- [ ] 36-PLAN.md — 이벤트 CRUD 모달 + 팀원 관리 + E2E 테스트

### 견적서 규칙서 (Phase 37-39)
**Plans:** 3 plans in 3 waves

Plans:
- [ ] 37-PLAN.md — 설정 탭 쉘 + P매트릭스 뷰어/편집 + API
- [ ] 38-PLAN.md — 기본공종/프리셋/원가 편집 UI + API
- [ ] 39-PLAN.md — 계산규칙 + 장비단가 + 보증 + 요약 + E2E 테스트

## Progress

| Group | Phases | Status |
|-------|--------|--------|
| 음성 파이프라인 | 1-4 | Complete |
| 엑셀 출력 | 5-8 | Not started |
| PDF 출력 | 9-10 | Not started |
| 제안서 | 11-14 | Not started |
| 수동편집 | 15-22 | Not started |
| CRM | 23-28 | Planned (6 plans) |
| 대시보드 | 29-33 | Planned (5 plans) |
| 캘린더 | 34-36 | Planned (3 plans) |
| 규칙서 | 37-39 | Planned (3 plans) |
