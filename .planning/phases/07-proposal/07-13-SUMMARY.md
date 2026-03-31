---
phase: 07-proposal
plan: 13
subsystem: estimate-proposal-link
tags: [routing, url-params, proposal, estimate]
dependency_graph:
  requires: [07-11]
  provides: [견적서→제안서 데이터 연결]
  affects: [components/estimate/EstimateEditor.tsx, components/proposal/ProposalEditor.tsx]
tech_stack:
  added: []
  patterns: [useRouter, useSearchParams, URL params]
key_files:
  created: []
  modified:
    - components/estimate/EstimateEditor.tsx
    - components/proposal/ProposalEditor.tsx
decisions:
  - "견적서→제안서 데이터 전달을 URL query params 방식으로 구현 (localStorage 방식보다 명시적이고 안정적)"
  - "manager 담당자 값에 팀장 suffix 없으면 자동 추가 — 기존 localStorage 자동채움 로직과 동일 패턴 유지"
metrics:
  duration_seconds: 152
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
requirements: [PROP-03]
---

# Phase 07 Plan 13: 견적서→제안서 데이터 연결 Summary

견적서 페이지에 제안서 작성 버튼을 추가하고, URL params(address/manager)로 제안서 페이지에 데이터를 자동 전달하는 연결을 구현했다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 견적서에 제안서 작성 버튼 추가 | ca803e2 | components/estimate/EstimateEditor.tsx |
| 2 | ProposalEditor URL params 자동 채우기 | 0cf7ddf | components/proposal/ProposalEditor.tsx |

## Changes Made

### Task 1 — EstimateEditor.tsx

- `useRouter` import 추가 (`next/navigation`)
- 컴포넌트 내 `const router = useRouter()` 선언
- 이메일 버튼 뒤에 "제안서" 버튼 추가
- 버튼 클릭 시 `estimate.site_name`과 `estimate.manager_name`을 URL params로 `/proposal`에 전달
- `disabled={!estimate.id}` 조건 동일하게 적용

### Task 2 — ProposalEditor.tsx

- `useSearchParams` import 추가 (`next/navigation`)
- 컴포넌트 내 `const searchParams = useSearchParams()` 선언
- 마운트 시 useEffect에서 `address`/`manager` params를 읽어 `v['주소']`/`v['담당자']` state에 반영
- manager 값에 "팀장" suffix 없으면 자동 추가 (기존 localStorage 채움 로직과 동일 패턴)
- DEF_MGR에서 담당자 이름으로 연락처 자동 조회

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- components/estimate/EstimateEditor.tsx: FOUND
- components/proposal/ProposalEditor.tsx: FOUND
- Commit ca803e2: FOUND
- Commit 0cf7ddf: FOUND
- Build: PASSED
