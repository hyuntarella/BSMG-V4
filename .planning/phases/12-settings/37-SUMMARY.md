---
phase: 12-settings
plan: 37
subsystem: settings
tags: [settings, price-matrix, ui]
dependency_graph:
  requires: []
  provides: [settings-tab-shell, price-matrix-editor, price-matrix-api]
  affects: [app/(authenticated)/settings/page.tsx]
tech_stack:
  added: []
  patterns: [service-role-rls-bypass, inline-cell-editing, controlled-dropdown-filter]
key_files:
  created:
    - app/(authenticated)/settings/page.tsx
    - components/settings/SettingsTabs.tsx
    - components/settings/PriceMatrixEditor.tsx
    - app/api/settings/price-matrix/route.ts
  modified: []
decisions:
  - "Service role client instantiated at module level in API route (not per-request) — safe for server-side only route"
  - "AREA_RANGES derived from AREA_BOUNDARIES constant to stay in sync with types"
  - "PriceMatrixEditor uses useCallback for loadData to prevent infinite useEffect loop"
metrics:
  duration: 4min
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_changed: 4
---

# Phase 12 Plan 37: Settings Tab Shell + P-Matrix Editor Summary

**One-liner:** Settings page with 7-tab navigation and P-matrix inline cell editor backed by service-role API.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 설정 페이지 탭 쉘 + P매트릭스 API | e330864 | settings/page.tsx, SettingsTabs.tsx, price-matrix/route.ts |
| 2 | PriceMatrixEditor 컴포넌트 | 611419a | PriceMatrixEditor.tsx |

## What Was Built

### SettingsTabs (`components/settings/SettingsTabs.tsx`)
- 7 tabs: 단가표, 기본공종, 프리셋, 원가, 계산규칙, 장비단가, 보증
- Horizontal scroll (`overflow-x-auto whitespace-nowrap`)
- Active tab: `bg-brand text-white`, inactive: `bg-gray-100 text-gray-600`
- Rounded pill buttons (`rounded-full px-4 py-1.5 text-sm`)

### Settings Page (`app/(authenticated)/settings/page.tsx`)
- `'use client'` with `useState` for `activeTab`
- Imports `SettingsTabs` + `PriceMatrixEditor`
- Placeholder tabs for future phases (38, 39)

### P-Matrix API (`app/api/settings/price-matrix/route.ts`)
- Uses `createClient` with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- GET: filters by `area_range` + `method`, orders by `price_per_pyeong` then `item_index`
- PUT: upserts with conflict on `company_id,area_range,method,price_per_pyeong,item_index`

### PriceMatrixEditor (`components/settings/PriceMatrixEditor.tsx`)
- Dropdowns for `AreaRange` (5 values from `AREA_BOUNDARIES`) and `Method` (복합/우레탄)
- `useEffect` on `[areaRange, method]` triggers data fetch via `useCallback loadData`
- Table: grouped columns per `price_per_pyeong`, sub-columns mat/labor/exp
- Row names from `COMPLEX_BASE` or `URETHANE_BASE` by `item_index`
- Cell click: opens inline `<input type="number">` with yellow bg (`bg-yellow-50`)
- Enter/blur commits; Escape cancels
- Save button: PUT to API, toast notification on success/error
- Empty state message when no data

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- Placeholder tabs for '기본공종', '프리셋', '원가', '계산규칙', '장비단가', '보증' show "Phase 38/39에서 구현" — intentional per plan spec, will be resolved in Plans 38-39.

## Self-Check: PASSED
