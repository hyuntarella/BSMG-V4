---
phase: 12-settings
plan: 39
subsystem: settings
tags: [settings, calc-rules, equipment, warranty, summary-bar, e2e]
dependency_graph:
  requires: [37, 38]
  provides: [calc-rules-editor, equipment-editor, warranty-editor, settings-summary, settings-e2e]
  affects: [app/(authenticated)/settings/page.tsx]
tech_stack:
  added: []
  patterns: [section-partial-update, summary-bar, playwright-e2e]
key_files:
  created:
    - components/settings/CalcRulesEditor.tsx
    - components/settings/EquipmentEditor.tsx
    - components/settings/WarrantyEditor.tsx
    - components/settings/SettingsSummary.tsx
    - e2e/settings.spec.ts
  modified:
    - app/(authenticated)/settings/page.tsx
decisions:
  - "CalcRulesEditor preview uses example 1,000,000원 base — shows real-time effect of rate changes"
  - "SettingsSummary uses Promise.all for concurrent cost-config + presets fetch"
  - "Settings page uses top-level SettingsSummary bar outside tab panel — always visible"
metrics:
  duration: 5min
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_changed: 6
---

# Phase 12 Plan 39: CalcRulesEditor + EquipmentEditor + WarrantyEditor + SettingsSummary Summary

**One-liner:** 설정 페이지 나머지 3개 탭 (계산규칙/장비단가/보증) 완성 + 전체 요약 바 + E2E 테스트로 GAS 규칙서 편집 기능 완전 재현.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | CalcRulesEditor + EquipmentEditor + WarrantyEditor | dad9070 | CalcRulesEditor.tsx, EquipmentEditor.tsx, WarrantyEditor.tsx |
| 2 | SettingsSummary + settings page integration + E2E | 80f9810 | SettingsSummary.tsx, settings/page.tsx, e2e/settings.spec.ts |

## What Was Built

### CalcRulesEditor (`components/settings/CalcRulesEditor.tsx`)
- GET `/api/settings/cost-config` → config.calc_rules에서 overhead_rate/profit_rate/round_unit 추출
- 공과잡비 (%): number input, step 0.01, min 0, max 50, 현재값 표시
- 기업이윤 (%): number input, 설명 포함 카드 스타일
- 절사 단위: select 5개 옵션 (1만/5만/10만/50만/100만원)
- 미리보기: 예시 소계 1,000,000원 기준 공과잡비+이윤+절사 실시간 계산 표시
- PUT section='calc_rules' partial update

### EquipmentEditor (`components/settings/EquipmentEditor.tsx`)
- GET → config.equipment_prices에서 ladder/sky/waste 추출
- 3개 카드 (grid cols-3): 사다리차/스카이차/폐기물처리 각 단위 표시
- 각 카드: 이름 + 단위(일당/식) + number input + fm() 포맷 표시
- PUT section='equipment_prices' partial update

### WarrantyEditor (`components/settings/WarrantyEditor.tsx`)
- GET → config.warranty에서 years/bond_years 추출
- 하자보수년수/이행증권년수: number input + 설명 카드
- PUT section='warranty' partial update

### SettingsSummary (`components/settings/SettingsSummary.tsx`)
- Promise.all로 cost-config + presets 동시 로드
- 요약 바: 공과잡비%/기업이윤%/절사/사다리차/스카이차/보증 한 줄 표시
- 복합/우레탄 공종수 + 프리셋 수 표시
- data-testid="settings-summary-bar" for E2E

### Settings Page 최종 통합
- 7개 탭 모두 실제 컴포넌트로 연결 (PlaceholderTab 완전 제거)
- 상단 SettingsSummary 바 항상 표시

### E2E Tests (`e2e/settings.spec.ts`)
- 설정 페이지 로드 + 기본 탭 확인
- 7개 탭 순회 클릭 테스트
- 요약 바 data-testid 존재 + 콘텐츠 확인
- 계산규칙/장비단가/보증 탭 편집 UI + 저장 버튼 존재 테스트

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — 모든 7개 탭이 실제 편집기로 연결됨.

## Self-Check: PASSED
