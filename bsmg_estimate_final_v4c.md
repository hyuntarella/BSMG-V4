# BSMG-V4 Project Truth v4c

> **v3 → v4c 변경사항**: Phase 3-C (/settings UI/UX 리뉴얼 + material_increase_rate 완전 제거) 완료 반영.
> 3-B가 병렬 진행 중이므로 v4c로 분리. 추후 사용자가 3-B v4와 통합 병합.
> 기준 시점: Phase 3-C 완료 직후 (2026-04-12).

---

## §0. 운영 규칙

### CC 측
- 모든 CC 세션은 단발성. 세션 종료 시 클리어.
- md 파일이 유일한 영속 컨텍스트.
- 세션 종료 시 v{N+1}.md + HANDOFF.md 생성 필수.
- 병렬 실행 원칙: 독립 작업은 단일 메시지에 multiple tool calls로 동시 실행. 순차는 의존성 있을 때만. 불필요 순차는 규칙 위반.
- 범위 외 수정 금지. 모호하면 질문.

### 프롬프트 작성 측
- 모든 프롬프트 자립형(self-contained).
- 페이즈 병렬화 검토 필수.

---

## 1. 실제 Repo 구조

```
app/
  (authenticated)/settings/page.tsx   # 설�� 페이지 엔트리 (3-C 리뉴얼)
  api/settings/
    cost-config/route.ts              # GET/PUT
    price-matrix/route.ts             # GET/PUT/DELETE
    presets/route.ts                  # GET/POST/PUT/DELETE
    acdb-list/route.ts                # GET
  api/estimates/[id]/
    save-all/route.ts                 # 저장 + registerNewItems
    export/route.ts                   # Phase 3-A: 공법별 XLSX 다운로드
    generate/route.ts                 # Excel + PDF 생성
    pdf/route.ts                      # PDF 단일 생성
    email/route.ts                    # 이메일 발송
components/settings/                  # 21 컴포넌트 (§4 참조) + 1 신규
components/estimate/
  SaveButton.tsx                      # FAB 저장/XLSX/PDF 버튼
  EstimateEditorForm.tsx              # 견적 에디터 메인
  SettingsPanel.tsx                   # BaseItemsEditor + PresetsEditor 사용
lib/estimate/
  constants.ts                        # BASE 상수, COST_TABLE, COST_BREAKPOINTS 등
                                      # MATERIAL_INCREASE_RATE 삭제됨 (3-C)
  types.ts                            # BaseItem, Estimate, EstimateSheet 등
  areaRange.ts                        # getArea(m2)
  syncUrethane.ts                     # URETHANE_MULTIPLIERS
  margin.ts                           # getMargin
  cost.ts                             # getCostPerM2
  costChips.ts                        # getChipMarginPercent
  costBreakdown.ts                    # getCostBreakdown, getAdjustedCost(alias), getMarginDisplay
  fileExport.ts                       # generateJson/Excel/MethodExcel/TempPdf
  fileNames.ts                        # 파일명 규칙
  calc.ts                             # 소계→공과잡비→기업이윤→절사
  jsonIO.ts                           # JSON 직렬화
lib/excel/
  generateWorkbook.ts                 # 복합+우레탄 결합 워크북 (save-all용)
  generateMethodWorkbook.ts           # Phase 3-A: 공법별 단일 XLSX 주입 엔진
lib/pdf/
  generatePdf.ts                      # HTML→PDF (puppeteer)
templates/
  complex.xlsx                        # 복합방수 엑셀 템플릿 (Phase 3-A)
  urethane.xlsx                       # 우레탄방수 엑셀 템플릿 (Phase 3-A)
hooks/
  useEstimate.ts                      # 견적 상태 관리 훅
  useAutoSave.ts                      # 자동 저장
  useNewItems.ts                      # NewItemEntry
data/
  p-value-lump-templates.csv          # SMALL 프리셋 원본
  acdb-seed.json                      # 공종 자동완성 시드
supabase/migrations/001_initial_schema.sql
```

---

## 2. 데이터 상수 실제 값

### 2.1 P매트릭스 세트 수 (확정)

| 면적대 | 복합 칩 | 우레탄 칩 |
|---|---|---|
| 20평이하 | 48000, 50000 (2세트) | 없음 (fallback [0,0,0]×7) |
| 50평미만 | 38000~44000, 48000, 50000 (9세트) | 35000~37000 (3세트) |
| 50~100평 | 36000~42000 (7세트) | 31000~37000 (7세트) |
| 100~200평 | 32000~35000 (4세트) | 25000~28000 (4세트) |
| 200평이상 | 29000~32000 (4세트) | 23000~26000 (4세트) |
| **합계** | **26세트** | **18세트** |

**면적대 경계** (`lib/estimate/areaRange.ts`):
```ts
AREA_BOUNDARIES = [
  { max: 20,       label: '20평이하' },
  { max: 50,       label: '50평미만' },
  { max: 100,      label: '50~100평' },
  { max: 200,      label: '100~200평' },
  { max: Infinity, label: '200평이상' },
]
```

### 2.2 SMALL_PRESETS

파일: `data/p-value-lump-templates.csv` + `lib/estimate/constants.ts` (3개 프리셋 상수화)
공법: **복합 전용**. 우레탄 소형 프리셋 없음.
방식: 전 항목 `unit='식'` lump. P매트릭스 m² 단가 방식과 다름.
프리셋: 330만/380만/430만 (constants.ts SMALL_PRESETS)

### 2.3 BaseItem 스키마 (`lib/estimate/types.ts`)

```ts
export interface BaseItem {
  name: string
  spec: string
  unit: string
  isArea?: boolean
  isWall?: boolean
  isEquipment?: boolean
  isFixedQty?: boolean
}
```

### 2.4 COMPLEX_BASE (8개) / URETHANE_BASE (7개)

`lib/estimate/constants.ts` 참조. v1 문서와 동일.

### 2.5 원가 상수

- LABOR_COST_PER_PUM = 220,000
- ~~MATERIAL_INCREASE_RATE = 0.20~~ — **3-C에서 제거됨**
- OVERHEAD_RATE = 0.03
- PROFIT_RATE = 0.06
- ROUND_UNIT = 100,000

---

## 3. Supabase `cost_config` JSONB 전체 스키마

v1 문서 §3과 동일. 변경 없음.
> **참고**: DB의 `material_increase_rate` 필드는 그대로 존재. 읽는 코드만 제거. DB 마이그레이션 불필요.

---

## 4. `/settings` 페이지 매핑 (Phase 3-C 갱신)

### 레이아웃 구조 (3-C 신규)
```
page.tsx
  ├─ Header
  ├─ SettingsSummary (칩 스타일 요약 바)
  ├─ SettingsSidebar (iOS 세그먼트 컨트롤 — 3탭)
  └─ 콘텐츠 카드 (rounded-2xl shadow-card)
       ├─ [단가표] PriceMatrixEditor
       │    ├─ 공법 세그먼트 (복합/우레탄)
       │    └─ 면적대 아코디언 ×5
       │         └─ PriceMatrixAccordionItem (신규)
       │              ├─ PriceMatrixChips (마진 미리보기)
       │              └─ PriceMatrixDetailTable
       ├─ [자주 쓰는 공종] FavoriteItemsPage
       │    ├─ FavoritesEditor → FavoriteChipTable
       │    ├─ OtherItemsEditor → OtherItemsTable
       │    └─ NewItemsEditor → NewItemsTable
       └─ [기타 설정] OtherSettingsPage
            ├─ CostEditor (재료비 인상률 제거됨)
            ├─ CalcRulesEditor + EquipmentEditor
            └─ WarrantyEditor
```

### 삭제 후보 컴포넌트
- `PriceMatrixControls.tsx` — PriceMatrixEditor에서 미사용. 다른 곳에서도 미사용.

---

## 5. v1 정정표

v1 문서 §5의 9개 정정 항목 그대로 유효.

---

## 6. 엑셀·PDF 출력 파이프라인

v3 문서 §6과 동일. Phase 3-C에서 출력 관련 변경 없음.

---

## 7. 차기 작업 진입점

### 7.1 v4c → v5 작성 시 반영 필수
- 3-B v4와 통합 병합
- §6 출력 파이프라인 섹션을 Phase 3-B 완료 후 갱신
- PDF 변환 완료 시 FAB PDF 버튼 재활성화 반영

---

## 8. 프로젝트 구조 (Phase 3-C 신설/변경 파일)

| 파일 | 용도 |
|---|---|
| `components/settings/PriceMatrixAccordionItem.tsx` | 면적대별 아코디언 항목 (신규) |

변경된 파일:
| 파일 | 변경 내용 |
|---|---|
| `lib/estimate/constants.ts` | MATERIAL_INCREASE_RATE 삭제 |
| `lib/estimate/costBreakdown.ts` | getAdjustedCost alias, getMarginDisplay 단순화 |
| `components/settings/CostEditor.tsx` | 재료비 인상률 UI 제거 + 디자인 토큰 |
| `components/settings/SettingsSummary.tsx` | materialIncreaseRate 제거 + 칩 스타일 |
| `components/settings/SettingsSidebar.tsx` | iOS 세그먼트 컨트롤 |
| `app/(authenticated)/settings/page.tsx` | 세로 스택 레이아웃 |
| `components/settings/OtherSettingsPage.tsx` | 섹션 설명 + 디자인 토큰 |
| `components/settings/PriceMatrixEditor.tsx` | 세그먼트 + 아코디언 구조 |
| `components/settings/PriceMatrixChips.tsx` | 마진 미리보기 + marginPyeong prop |
| `components/settings/PriceMatrixDetailTable.tsx` | 디자인 토큰 통일 |
| `components/settings/usePriceMatrixEditor.ts` | 외부 제어형 (areaRange, method 파라미터) |
| `app/api/settings/cost-config/route.ts` | 주석 정리 |
| `tests/costBreakdown.test.ts` | 테스트 기대값 갱신 |

---

## 9. v1 정정표 (유지)

v1 문서 §5의 9개 정정 항목 그대로 유효.

---

## 10. 페이즈 로드맵

### 10.1 완료된 페이즈
- Phase 1: 견적 에디터 UI
- Phase 2: 음성 파이프라인
- Phase 3-A: 엑셀 주입 엔진 (XLSX 생성) ✅
- Phase 3-C: /settings UI/UX 리뉴얼 + material_increase_rate 제거 ✅

### 10.2 예정 페이즈

| 페이즈 | 범위 | 상태 |
|---|---|---|
| 3-B | 구글드라이브 이관 + Drive API PDF 변환 | 병렬 진행 중 |
|     | - JSON+XLSX+PDF 3종 저장 | |
|     | - 서비스 계정 인증 | |
|     | - Drive API pdf 변환 | |
|     | - FAB PDF 버튼 재활성화 | |

---

## Phase 3-C 완료 요약

- **커밋 해시**: 95aafe9
- **브랜치**: feature/3c-settings
- **기준 시점**: 2026-04-12
- **변경 파일**: 13개 수정 + 1개 신규
- **검증 결과**:
  - Build 성공
  - 32 test files, 478 tests 전부 통과
  - material_increase_rate 실제 사용 0건
  - 금지 스코프 파일 수정 0건
  - 3-B 충돌 파일 0건
- **미해결 이슈**:
  - PriceMatrixControls.tsx 삭제 후보 (미사용)
  - getAdjustedCost deprecated alias 향후 정리

**END OF PROJECT TRUTH v4c**
