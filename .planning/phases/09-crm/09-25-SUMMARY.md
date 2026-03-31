---
phase: 09-crm
plan: 25
subsystem: crm
tags: [notion, crm, modal, inline-edit, comments, timeline, ui]
dependency_graph:
  requires: [notion-crm-api, crm-kanban-ui]
  provides: [crm-detail-modal]
  affects: [phase-09-plans-26-28]
tech_stack:
  added: []
  patterns: [inline-edit-field, optimistic-local-update, time-ago-format]
key_files:
  created:
    - components/crm/DetailField.tsx
    - components/crm/DetailModal.tsx
    - components/crm/CommentSection.tsx
    - components/crm/ProgressTimeline.tsx
    - components/crm/ActionButtons.tsx
  modified:
    - components/crm/CrmPageClient.tsx
decisions:
  - "DetailField type prop으로 input/select/multiselect 렌더링 분기 — 단일 컴포넌트로 26개 필드 처리"
  - "workTypes multiselect: comma-separated string으로 직렬화 후 배열로 역직렬화 — DetailField onSave 단일 string 시그니처 유지"
  - "DetailModal에서 handleSave가 PATCH fetch + onUpdate 콜백 동시 호출 — 낙관적 업데이트로 즉각 반응"
  - "selectedRecord 상태를 CrmPageClient에 배치 — KanbanBoard는 순수 표시 컴포넌트 유지"
  - "ProgressTimeline은 서버 컴포넌트 (use client 불필요) — 상태 없음"
metrics:
  duration_seconds: 280
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 09 Plan 25: CRM 상세 모달 Summary

CRM 칸반 카드 클릭 시 26개 필드 인라인 편집, 댓글, 진행 타임라인, 외부 링크 버튼을 포함한 상세 모달 완성.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | DetailModal + DetailField 인라인 편집 | 8e884f9 | components/crm/DetailModal.tsx, components/crm/DetailField.tsx |
| 2 | 댓글+타임라인+액션버튼+칸반 모달 연결 | 2f1032b | components/crm/{CommentSection,ProgressTimeline,ActionButtons,CrmPageClient}.tsx |

## What Was Built

### components/crm/DetailField.tsx
- Props: label, value, type (8가지), options, onSave
- 표시 모드: 클릭 시 편집 전환, phone/email/url 타입은 링크 렌더링, 빈 값 "미입력" 표시
- 편집 모드: type별 input/select/multiselect 체크박스. Enter=저장, Escape=취소, blur=저장

### components/crm/DetailModal.tsx
- 6개 섹션 (기본정보/영업정보/시공정보/금액/일정/링크) × 26개 필드
- 각 필드 DetailField로 렌더링, onSave 시 PATCH /api/crm/[id] + onUpdate 콜백
- 파이프라인 options: record.stage → STAGE_MAP[stage] 동적 생성
- 하단에 ActionButtons, ProgressTimeline, CommentSection 배치

### components/crm/CommentSection.tsx
- useEffect로 GET /api/crm/{pageId}/comments 조회, 최신순 정렬
- textarea + 전송 버튼. POST /api/crm/{pageId}/comments. 전송 후 목록 낙관적 추가
- timeAgo() 유틸리티로 "X분 전" 포맷

### components/crm/ProgressTimeline.tsx
- 5단계 세로 타임라인: 문의일자 → 견적방문일자 → 견적서발송일 → 견적서열람일 → 잔금완료
- 날짜 있으면 파란 원 + 날짜, 없으면 회색 원 + "미완료"
- 완료 단계 간 파란 실선, 미완료 단계 간 회색 점선

### components/crm/ActionButtons.tsx
- 지도: 네이버 지도 URL (target="_blank")
- 거리뷰: 카카오 로드뷰 URL (target="_blank")
- 내비: Tmap URL 스킴 (모바일 전용)
- 문자: sms: 링크, 전화: tel: 링크
- 전화번호 없으면 문자/전화 버튼 disabled (aria-disabled + 회색 스타일)

### components/crm/CrmPageClient.tsx (수정)
- `selectedRecord` useState 추가
- `handleCardClick`: selectedRecord 설정
- `handleUpdate`: updateRecordLocal + setSelectedRecord 동기화
- DetailModal 렌더링 연결

## Decisions Made

- DetailField 단일 컴포넌트로 8가지 타입 처리 — 필드별 컴포넌트 분리보다 관리 간단
- workTypes multiselect는 DetailModal handleSave에서 배열 변환 처리 — DetailField 시그니처 단순화
- selectedRecord 상태 CrmPageClient에 배치 — KanbanBoard 변경 최소화

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
