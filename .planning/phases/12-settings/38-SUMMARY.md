---
phase: 12-settings
plan: 38
subsystem: settings
tags: [settings, base-items, presets, cost-config, crud-ui]
dependency_graph:
  requires: [37]
  provides: [base-items-editor, presets-editor, cost-editor, presets-api, cost-config-api]
  affects: [app/(authenticated)/settings/page.tsx]
tech_stack:
  added: []
  patterns: [service-role-rls-bypass, inline-cell-editing, category-filter-chips, section-partial-update]
key_files:
  created:
    - components/settings/BaseItemsEditor.tsx
    - components/settings/PresetsEditor.tsx
    - components/settings/CostEditor.tsx
    - app/api/settings/presets/route.ts
    - app/api/settings/cost-config/route.ts
  modified:
    - app/(authenticated)/settings/page.tsx
decisions:
  - "BaseItemsEditor stores edits in cost_config JSONB (base_items key) — no new table needed"
  - "cost-config PUT supports section/value partial update so BaseItemsEditor and CostEditor can save independently"
  - "PresetsEditor EditRow is a sub-component to keep file under 200 lines"
  - "CostEditor loads existing config from DB on mount — falls back to constants if none saved yet"
metrics:
  duration: 8min
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_changed: 6
---

# Phase 12 Plan 38: BaseItemsEditor + PresetsEditor + CostEditor Summary

**One-liner:** 설정 페이지 3개 탭 (기본공종/프리셋/원가) — 인라인 CRUD 편집기 + 서비스롤 API 라우트.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | BaseItemsEditor + PresetsEditor + Presets API | bde0545 | BaseItemsEditor.tsx, PresetsEditor.tsx, presets/route.ts |
| 2 | CostEditor + cost-config API + settings page wiring | e0ad749 | CostEditor.tsx, cost-config/route.ts, settings/page.tsx |

## What Was Built

### BaseItemsEditor (`components/settings/BaseItemsEditor.tsx`)
- 복합/우레탄 토글로 BASE 배열 선택
- 테이블 열: #, 공종명, 규격, 단위, 면적연동, 벽체연동, 장비, 고정수량, 순서/삭제
- 공종명/규격/단위: 클릭 → 노란 배경 인라인 input (Enter/blur commit, Escape cancel)
- Boolean 필드: accent-brand 체크박스
- 순서 변경: ▲/▼ 버튼으로 배열 swap
- 행 삭제: confirm 후 제거
- 행 추가: 하단 점선 버튼 → 빈 BaseItem 추가
- 저장: PUT `/api/settings/cost-config` with `{ section: 'base_items', value: { complex, urethane } }`

### PresetsEditor (`components/settings/PresetsEditor.tsx`)
- useEffect로 GET `/api/settings/presets` → 프리셋 목록 로드
- 카테고리 필터 칩 (전체 + 고유 카테고리 자동 집계)
- 행 클릭 → editingId 설정 → 인라인 EditRow 서브컴포넌트로 전환
- 신규 추가: "프리셋 추가" 버튼 → 테이블 상단에 빈 EditRow
- 저장: POST(신규) / PATCH(기존) → 성공 시 로컬 state 업데이트
- 삭제: confirm → DELETE → 로컬 state 제거

### Presets API (`app/api/settings/presets/route.ts`)
- 서비스 역할 클라이언트로 RLS bypass
- GET: company_id 기준 전체 조회, category/name 순
- POST: name/spec/unit/mat/labor/exp/category insert → 201 + preset 반환
- PATCH: id + 변경 필드만 update (company_id 변경 차단)
- DELETE: id로 단일 삭제

### CostEditor (`components/settings/CostEditor.tsx`)
- GET `/api/settings/cost-config` → DB 저장값 로드, 없으면 constants 기본값 사용
- 1품 단가 + 재료비 인상률: 상단 number input
- 면적대별 원가 테이블: pyeong/hado/jungdo15/sangdo/sheet/misc/pum 7열
- 셀 클릭 → 노란 배경 인라인 input (Enter/blur commit)
- 행 추가/삭제 지원
- PUT `/api/settings/cost-config` with `{ config: { labor_cost_per_pum, material_increase_rate, cost_breakpoints } }`

### cost-config API (`app/api/settings/cost-config/route.ts`)
- GET: cost_config 테이블에서 JSONB config 조회 (PGRST116 = no rows 처리)
- PUT: config 전체 교체 OR section/value 부분 업데이트 지원
- upsert with onConflict: 'company_id'

### Settings Page (`app/(authenticated)/settings/page.tsx`)
- 기본공종 탭: `<BaseItemsEditor />`
- 프리셋 탭: `<PresetsEditor />`
- 원가 탭: `<CostEditor />`
- 계산규칙/장비단가/보증 탭: Phase 39 PlaceholderTab 유지

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- 계산규칙/장비단가/보증 탭은 PlaceholderTab — Phase 39에서 구현 예정 (계획대로)

## Self-Check: PASSED
