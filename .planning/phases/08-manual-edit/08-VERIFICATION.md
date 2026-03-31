---
phase: 08-manual-edit
verified: 2026-03-31T00:00:00Z
status: gaps_found
score: 7/8 must-haves verified
gaps:
  - truth: "CoverSheet에서 고객명을 편집할 수 있다"
    status: failed
    reason: "CoverSheet.tsx에 customer_name, manager_name, manager_phone, memo 편집 필드가 없다. SUMMARY(Plan 19)는 '이미 구현됨'이라 주장했으나 실제 파일에는 site_name만 편집 가능하고 4개 필드는 존재하지 않는다."
    artifacts:
      - path: "components/estimate/CoverSheet.tsx"
        issue: "customer_name, manager_name, manager_phone, memo 필드가 CoverRow/EditableField로 렌더링되지 않음 (현재 212줄, site_name만 편집 가능)"
    missing:
      - "CoverSheet에 CoverRow + EditableField 패턴으로 customer_name 행 추가"
      - "CoverSheet에 manager_name 행 추가"
      - "CoverSheet에 manager_phone 행 추가"
      - "CoverSheet에 memo 행 추가"
      - "각 행은 onUpdate 콜백을 통해 updateMeta로 연결되어야 함"
---

# Phase 08: Manual Edit Verification Report

**Phase Goal:** 견적서 수동편집 UI — 공종 추가(프리셋+자유입력)/삭제/순서변경, 품명/규격/단위 인라인 편집, 면적/벽체 수동입력, 고객정보 편집, 평단가 재생성 확인, 시트 삭제, 장비 아이템 추가
**Verified:** 2026-03-31
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | WorkSheet 하단 '+ 공종 추가' 버튼 클릭 시 모달이 열린다 | ✓ VERIFIED | WorkSheet.tsx:266-274 — `onAddItem && <button onClick={() => setAddModalOpen(true)}>` |
| 2 | 모달에서 프리셋 목록이 표시되고 선택 시 기본 단가가 자동 채워진다 | ✓ VERIFIED | AddItemModal.tsx:83-124 — grouped presets rendered, handlePresetAdd passes mat/labor/exp |
| 3 | 자유입력 폼으로 name/spec/unit/qty를 입력하여 공종을 추가할 수 있다 | ✓ VERIFIED | AddItemModal.tsx:153-191 — custom tab with all 4 fields + add button |
| 4 | 추가된 공종이 시트 아이템 목록 끝에 나타나고 합계가 재계산된다 | ✓ VERIFIED | useEstimate.ts:230-274 — addItem appends item, runs calc(), updates grand_total |
| 5 | WorkSheet 각 행 끝에 x 버튼이 표시된다 | ✓ VERIFIED | WorkSheet.tsx:229-242 — `onRemoveItem && <button>✕</button>` |
| 6 | x 버튼 클릭 시 confirm 대화상자가 뜬다 | ✓ VERIFIED | WorkSheet.tsx:232 — `window.confirm(...)` before calling onRemoveItem |
| 7 | 확인 시 해당 공종이 삭제되고 합계가 재계산된다 | ✓ VERIFIED | useEstimate.ts:312-328 — removeItem filters items, runs calc(), updates grand_total |
| 8 | 삭제 후 undo로 복원 가능하다 | ✓ VERIFIED | useEstimate.ts:313 — saveSnapshot called before removal; undo at line 331 restores |
| 9 | WorkSheet에서 품명 셀을 클릭하면 텍스트 편집 가능하다 | ✓ VERIFIED | WorkSheet.tsx:164-171 — InlineCell type="text" for name column |
| 10 | 규격 셀을 클릭하면 텍스트 편집 가능하다 | ✓ VERIFIED | WorkSheet.tsx:173-180 — InlineCell type="text" for spec column |
| 11 | 단위 셀을 클릭하면 텍스트 편집 가능하다 | ✓ VERIFIED | WorkSheet.tsx:182-190 — InlineCell type="text" for unit column |
| 12 | 편집 후 blur 시 값이 저장된다 | ✓ VERIFIED | useEstimate.ts:144-158 — updateItemText updates state and sets isDirty |
| 13 | WorkSheet 상단 정보 바에서 면적 값을 클릭하면 편집 가능하다 | ✓ VERIFIED | WorkSheet.tsx:77-83 — InlineCell for m2, readOnly={!onMetaChange} |
| 14 | 면적(m2) 변경 시 isArea=true인 공종들의 qty가 자동 재계산된다 | ✓ VERIFIED | useEstimate.ts:63-66 — updateMeta triggers rebuildSheet when field is 'm2' |
| 15 | 벽체면적(wall_m2) 입력 필드가 표시되고 변경 시 공종 qty가 업데이트된다 | ✓ VERIFIED | WorkSheet.tsx:86-94 — InlineCell for wall_m2; updateMeta triggers rebuildSheet |
| 16 | CoverSheet에서 고객명을 편집할 수 있다 | ✗ FAILED | CoverSheet.tsx에 customer_name 필드 없음 (grep 결과: 0 matches) |
| 17 | 담당자명을 편집할 수 있다 | ✗ FAILED | CoverSheet.tsx에 manager_name 필드 없음 |
| 18 | 담당자 연락처를 편집할 수 있다 | ✗ FAILED | CoverSheet.tsx에 manager_phone 필드 없음 |
| 19 | 메모/특이사항을 편집할 수 있다 | ✗ FAILED | CoverSheet.tsx에 memo 필드 없음 |
| 20 | 평단가 변경 시 '공종을 재생성하시겠습니까?' 확인 다이얼로그가 뜬다 | ✓ VERIFIED | WorkSheet.tsx:101-108 — window.confirm with exact message |
| 21 | 확인 시 buildItems 재실행으로 공종이 재생성된다 | ✓ VERIFIED | useEstimate.ts:103-105 — updateSheetPpp rebuild=true → rebuildSheet() |
| 22 | 취소 시 평단가만 변경되고 기존 공종은 유지된다 | ✓ VERIFIED | useEstimate.ts:106-109 — !rebuild branch updates price_per_pyeong only |
| 23 | EstimateEditor 헤더에 현재 시트 삭제 버튼이 있다 | ✓ VERIFIED | EstimateEditor.tsx:205-216 — '시트 삭제' button with confirm |
| 24 | 시트 삭제 클릭 시 confirm 후 해당 시트가 제거된다 | ✓ VERIFIED | EstimateEditor.tsx:208-213 — window.confirm → removeSheet(activeSheetIndex) |
| 25 | WorkSheet 각 행에 up/down 버튼이 있다 | ✓ VERIFIED | WorkSheet.tsx:215-227 — ↑↓ buttons conditionally rendered |
| 26 | up/down 클릭 시 공종 순서가 변경된다 | ✓ VERIFIED | useEstimate.ts:290-308 — moveItem splices and reorders sort_order |
| 27 | AddItemModal에 '장비' 탭이 존재한다 | ✓ VERIFIED | AddItemModal.tsx:13, 102 — Tab type includes 'equipment', button renders |
| 28 | 사다리차, 스카이차, 폐기물 3개 장비 프리셋이 표시된다 | ✓ VERIFIED | AddItemModal.tsx:23-27 — EQUIPMENT_PRESETS with all 3 items |
| 29 | 장비 선택 시 is_equipment=true, is_fixed_qty=true로 추가된다 | ✓ VERIFIED | AddItemModal.tsx:68 — `is_equipment: true, is_fixed_qty: true` |
| 30 | 장비의 qty는 일수 입력이고 DEFAULT_EQUIPMENT_PRICES에서 기본 단가가 적용된다 | ✓ VERIFIED | AddItemModal.tsx:5, 24-26, 134, 140 — eqDays state + eqPrice from DEFAULT_EQUIPMENT_PRICES |

**Score:** 7/8 plan goals verified (Plan 19 고객정보 편집: FAILED — 4 truths unmet)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/estimate/AddItemModal.tsx` | 프리셋 선택 + 자유입력 + 장비 탭 모달 | ✓ VERIFIED | 196 lines, 3 tabs (preset/equipment/custom) |
| `hooks/useEstimate.ts` | addItem, removeItem, updateItemText, updateSheetPpp, removeSheet, moveItem 함수 | ✓ VERIFIED | All 6 functions present and exported |
| `components/estimate/WorkSheet.tsx` | + 공종 추가 버튼, x 삭제 버튼, ↑↓ 순서 버튼, text InlineCell, m2/wall_m2 편집, ppp confirm | ✓ VERIFIED | All features present — 299 lines (exceeds 200-line limit) |
| `components/estimate/CoverSheet.tsx` | customer_name, manager_name, manager_phone, memo 편집 필드 | ✗ STUB | 212 lines — only site_name is editable; 4 required fields absent |
| `components/estimate/EstimateEditor.tsx` | 모든 새 prop 전달, 시트 삭제 버튼 | ✓ VERIFIED | All props wired — 258 lines (exceeds 200-line limit) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| WorkSheet.tsx | AddItemModal.tsx | `useState addModalOpen`, import | ✓ WIRED | Line 11 import, line 44 state, line 277 render |
| AddItemModal.tsx → onAdd | useEstimate.addItem | onAdd callback | ✓ WIRED | EstimateEditor.tsx:244 `onAddItem={(item) => addItem(activeSheetIndex, item)}` |
| WorkSheet.tsx → onRemoveItem | useEstimate.removeItem | onRemoveItem callback | ✓ WIRED | EstimateEditor.tsx:245 `onRemoveItem={(idx) => removeItem(activeSheetIndex, idx)}` |
| WorkSheet.tsx → onItemTextChange | useEstimate.updateItemText | onItemTextChange callback | ✓ WIRED | EstimateEditor.tsx:240 |
| WorkSheet.tsx → onMetaChange | useEstimate.updateMeta | onMetaChange callback | ✓ WIRED | EstimateEditor.tsx:243 |
| WorkSheet.tsx → onPppChange | useEstimate.updateSheetPpp | onPppChange callback | ✓ WIRED | EstimateEditor.tsx:242 |
| EstimateEditor.tsx → removeSheet | useEstimate.removeSheet | direct call | ✓ WIRED | EstimateEditor.tsx:46, 210 |
| WorkSheet.tsx → onMoveItem | useEstimate.moveItem | onMoveItem callback | ✓ WIRED | EstimateEditor.tsx:246 |
| AddItemModal.tsx | lib/estimate/constants.ts | `import DEFAULT_EQUIPMENT_PRICES` | ✓ WIRED | AddItemModal.tsx:5 |
| CoverSheet.tsx | useEstimate.updateMeta | onUpdate callback | PARTIAL | site_name is wired; customer_name/manager_name/manager_phone/memo fields do not exist to be wired |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| AddItemModal.tsx | presets | /api/presets fetch + DEFAULT_PRESETS fallback | Yes — 5 hardcoded fallback presets always available | ✓ FLOWING |
| WorkSheet.tsx | sheet.items | useEstimate state via EstimateEditor prop | Yes — from real DB-loaded estimate | ✓ FLOWING |
| CoverSheet.tsx | estimate.customer_name | useEstimate state | N/A — field not rendered at all | ✗ DISCONNECTED |

---

### Behavioral Spot-Checks

Step 7b: Build check only (no running server available).

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build passes with all new features | `npm run build` | BUILD SUCCESS — all routes compiled | ✓ PASS |
| useEstimate exports all 6 new functions | grep exports in file | addItem, removeItem, updateItemText, updateSheetPpp, removeSheet, moveItem all in return object | ✓ PASS |
| AddItemModal has 3 tabs | grep Tab type | 'preset' \| 'equipment' \| 'custom' found at line 13 | ✓ PASS |
| CoverSheet has customer_name field | grep customer_name in CoverSheet.tsx | 0 matches | ✗ FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EDIT-15 | Plan 15 | 공종 추가 — 프리셋+자유입력 모달 | ✓ SATISFIED | AddItemModal.tsx + addItem function wired |
| EDIT-16 | Plan 16 | 공종 삭제 — x 버튼 + confirm + undo | ✓ SATISFIED | removeItem function + WorkSheet x button |
| EDIT-17 | Plan 17 | 품명/규격/단위 인라인 텍스트 편집 | ✓ SATISFIED | updateItemText + InlineCell type="text" |
| EDIT-18 | Plan 18 | 면적/벽체면적 수동 입력 | ✓ SATISFIED | m2/wall_m2 InlineCell in WorkSheet |
| EDIT-19 | Plan 19 | 고객명/담당자/연락처/메모 CoverSheet 편집 | ✗ BLOCKED | 4 fields absent from CoverSheet.tsx |
| EDIT-20 | Plan 20 | 평단가 변경 시 공종 재생성 확인 UX | ✓ SATISFIED | updateSheetPpp + confirm dialog |
| EDIT-21 | Plan 21 | 시트 삭제 + 공종 순서 변경 | ✓ SATISFIED | removeSheet + moveItem + UI buttons |
| EDIT-22 | Plan 22 | 장비 아이템 추가 탭 | ✓ SATISFIED | EQUIPMENT_PRESETS tab in AddItemModal |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/estimate/EstimateEditor.tsx` | 258 lines | 파일 200줄 초과 (CLAUDE.md 규칙 위반) | ⚠️ Warning | 기능 동작에 영향 없음; 유지보수 복잡도 증가 |
| `components/estimate/WorkSheet.tsx` | 299 lines | 파일 200줄 초과 (CLAUDE.md 규칙 위반) | ⚠️ Warning | 기능 동작에 영향 없음 |
| `components/estimate/CoverSheet.tsx` | 전체 | customer_name/manager_name/manager_phone/memo 필드 미구현 | 🛑 Blocker | Plan 19 목표 미달성 — 고객 정보를 CoverSheet에서 편집할 수 없음 |

**Stub classification note:** The CoverSheet missing fields are a BLOCKER because the goal "고객정보 편집" is explicitly part of Phase 08's stated goal and Plan 19's must-haves. The SUMMARY for Plan 19 falsely claimed these were pre-existing, but inspection of the actual file confirms they do not exist.

---

### Human Verification Required

#### 1. 공종 추가 후 합계 재계산 실시간 확인

**Test:** 견적서 화면에서 WorkSheet의 "+ 공종 추가" 버튼 클릭 → 프리셋 선택 → 모달 닫힘 후 테이블 하단 합계가 즉시 업데이트되는지 확인
**Expected:** 추가한 공종의 금액이 소계에 더해지고 "합계(단수정리)" 값이 변경됨
**Why human:** 상태 업데이트와 렌더링 타이밍은 정적 분석으로 확인 불가

#### 2. 면적 변경 시 qty 자동 재계산

**Test:** WorkSheet 상단 면적 InlineCell 클릭 → 값 변경 → blur 후 공종 목록의 수량 컬럼 확인
**Expected:** is_base=true인 공종들의 qty가 새 면적 값으로 재계산됨
**Why human:** rebuildSheet 로직의 정확한 qty 반영은 실행 환경에서만 확인 가능

#### 3. CoverSheet site_name 편집 정상 동작 확인

**Test:** 견적서 표지 탭 진입 → 주소 필드 클릭 → 값 입력 → 상단 저장 버튼 클릭
**Expected:** 주소가 저장되고 다음 방문 시 유지됨
**Why human:** 수동 편집 → AutoSave → Supabase 저장 흐름은 정적 분석으로 완전 확인 불가

---

### Gaps Summary

Phase 08의 핵심 목표 중 **"고객정보 편집"** 이 미달성 상태다.

Plan 19의 SUMMARY는 "기존 CoverSheet에 이미 4개 필드가 구현되어 있었다"고 주장했으나, 실제 `components/estimate/CoverSheet.tsx` (212줄)를 직접 확인한 결과 `customer_name`, `manager_name`, `manager_phone`, `memo` 중 어느 것도 EditableField나 CoverRow로 렌더링되지 않는다. 현재 CoverSheet에서 편집 가능한 필드는 `site_name` (현장 주소) 하나뿐이다.

**Root cause:** Plan 19 실행 시 에이전트가 이전 버전의 CoverSheet를 참조했거나, 실제 파일을 확인하지 않고 구현 완료로 처리했다.

**Fix scope:** CoverSheet.tsx에 4개 CoverRow + EditableField 행 추가 (공사명 행 아래). 기존 EditableField 헬퍼 컴포넌트가 파일 내에 이미 존재하므로 동일 패턴 적용 가능. onUpdate 콜백은 이미 prop으로 전달되고 있음.

---

_Verified: 2026-03-31_
_Verifier: Claude (gsd-verifier)_
