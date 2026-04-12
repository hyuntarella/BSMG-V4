# Phase 3-C 세션 핸드오프

> 작성 시점: 2026-04-12
> 브랜치: `feature/3c-settings`
> 커밋: `95aafe9`
> 기준 main 커밋: `5e875a3`

---

## 1. 변경사항 요약

### material_increase_rate 완전 제거
- `MATERIAL_INCREASE_RATE = 0.20` 상수 삭제 (`lib/estimate/constants.ts`)
- `getAdjustedCost()` → `getCostBreakdown()` alias로 변환 (호환 유지, deprecated 표시)
- `getMarginDisplay()` 단순화: `"52% (인상 전 63%)"` → `"63%"`
- `MarginDisplay.beforeIncrease` 필드 유지 (deprecated, current와 동일값)
- CostEditor에서 재료비 인상률 입력 UI 제거
- SettingsSummary에서 materialIncreaseRate 표시 제거
- cost-config API 주석 정리
- 테스트 업데이트 (478건 전부 통과)

### /settings UI/UX 리뉴얼
- **사이드바** → iOS 세그먼트 컨트롤 (모바일/데스크탑 통일)
- **SettingsSummary** → 칩 스타일 요약 바 (bg-white + shadow-card)
- **페이지 레이아웃**: flex row 구조 제거 → 세로 스택 (세그먼트 → 콘텐츠 카드)
- 디자인 토큰 통일: surface-muted, ink, shadow-card, rounded-xl/2xl

### P매트릭스 UX 개선
- 면적대 **아코디언** (5개 동시 표시, 첫번째 펼침)
- 공법 **세그먼트 컨트롤** (드롭다운 → 토글)
- 칩에 **마진율 미리보기** ("44,000원 · 63%")
- 면적대별 **세트 수 뱃지** ("3세트")
- `usePriceMatrixEditor` 외부 제어형으로 변경 (areaRange, method 파라미터)

### KCC CSV
- 코드베이스에 KCC CSV 임포트 기능 없음. 스킵.

---

## 2. 변경 파일

| 파일 | 상태 | 변경 내용 |
|------|------|----------|
| `lib/estimate/constants.ts` | 수정 | MATERIAL_INCREASE_RATE 삭제 |
| `lib/estimate/costBreakdown.ts` | 수정 | getAdjustedCost alias, getMarginDisplay 단순화 |
| `components/settings/CostEditor.tsx` | 수정 | 재료비 인상률 UI 제거 + 디자인 토큰 |
| `components/settings/SettingsSummary.tsx` | 수정 | materialIncreaseRate 제거 + 칩 스타일 |
| `components/settings/SettingsSidebar.tsx` | 수정 | iOS 세그먼트 컨트롤 |
| `app/(authenticated)/settings/page.tsx` | 수정 | 세로 스택 레이아웃 |
| `components/settings/OtherSettingsPage.tsx` | 수정 | 섹션 설명 + 디자인 토큰 |
| `components/settings/PriceMatrixEditor.tsx` | 수정 | 세그먼트 + 아코디언 구조 |
| `components/settings/PriceMatrixChips.tsx` | 수정 | 마진 미리보기 + marginPyeong prop |
| `components/settings/PriceMatrixDetailTable.tsx` | 수정 | 디자인 토큰 통일 |
| `components/settings/usePriceMatrixEditor.ts` | 수정 | 외부 제어형 (areaRange, method 파라미터) |
| `components/settings/PriceMatrixAccordionItem.tsx` | **신규** | 면적대별 아코디언 항목 |
| `app/api/settings/cost-config/route.ts` | 수정 | 주석 정리 |
| `tests/costBreakdown.test.ts` | 수정 | getAdjustedCost/getMarginDisplay 기대값 갱신 |

---

## 3. 3-B와의 충돌 여부

**충돌 없음.**

3-B 작업 파일:
- `app/api/estimates/[id]/**` — 3-C 미접촉
- `lib/excel/**`, `lib/pdf/**`, `lib/gdrive/**` — 3-C 미접촉
- `components/estimate/SaveButton.tsx` — 3-C 미접촉
- `templates/**` — 3-C 미접촉

3-C 작업 파일: `components/settings/**`, `lib/estimate/constants.ts`, `lib/estimate/costBreakdown.ts`

**교집합 없음.** main 병합 시 순서 무관하게 충돌 발생하지 않음.

---

## 4. 주의사항

### 금지 스코프 파일 영향
- `components/estimate/WorkSheet.tsx`: `marginDisplay.formatted`가 이제 `"63%"` (기존 `"52% (인상 전 63%)"`)로 표시됨. 파일 자체는 미수정.
- `components/estimate/CompareSheet.tsx`: 동일.
- `hooks/useVoiceFlow.ts`: `findPriceForMargin` 결과값이 달라짐 (인상률 0%로 계산하므로 더 낮은 단가).

### 향후 정리 후보
- `PriceMatrixControls.tsx`: PriceMatrixEditor에서 더 이상 사용하지 않음. 다른 곳에서도 미사용. 삭제 후보.
- `getAdjustedCost()`: deprecated alias. 호출부(금지 스코프) 수정 시 함께 제거 가능.
- `MarginDisplay.beforeIncrease`: deprecated 필드. 호출부 수정 시 제거 가능.

### BaseItemsEditor / PresetsEditor
- `components/estimate/SettingsPanel.tsx`에서 import. **삭제 불가** (고아 아님).

---

## 5. 검증 결과

| 항목 | 결과 |
|------|------|
| Build | 성공 |
| Tests | 32 files, 478 tests — 전부 통과 |
| material_increase_rate 잔존 (실제 사용) | 0건 |
| material_increase_rate 잔존 (주석/deprecated) | 5건 |
| TS 에러 (신규) | 0건 |
| 금지 스코프 파일 수정 | 0건 |
