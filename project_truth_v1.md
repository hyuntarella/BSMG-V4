# BSMG-V4 Project Truth v1

> 목적: 실제 repo 코드를 1순위 진실로 삼은 단일 정정 문서.
> 이후 명세서/인수인계 작성 시 이 문서만 참조.
> 기준 시점: CC 덤프 직후.

---

## 1. 실제 Repo 구조

```
app/
  (authenticated)/settings/page.tsx   # 설정 페이지 엔트리
  api/settings/
    cost-config/route.ts              # GET/PUT
    price-matrix/route.ts             # GET/PUT/DELETE
    presets/route.ts                  # GET/POST/PUT/DELETE
    acdb-list/route.ts                # GET
  api/estimates/[id]/save-all/route.ts # 저장 + registerNewItems
components/settings/                  # 20+ 컴포넌트 (섹션 4 참조)
lib/estimate/
  constants.ts                        # BASE 상수, COST_TABLE, COST_BREAKPOINTS 등
  types.ts                            # BaseItem 등
  areaRange.ts                        # getArea(m2)
  syncUrethane.ts                     # URETHANE_MULTIPLIERS
  margin.ts                           # getMargin
  cost.ts                             # getCostPerM2
  costChips.ts                        # getChipMarginPercent
hooks/useNewItems.ts                  # NewItemEntry
data/
  p-value-lump-templates.csv          # SMALL 프리셋 원본 (상수 미존재)
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
// pyeong = m2 / 3.306, 첫 매칭(pyeong < max) 반환
AREA_BOUNDARIES = [
  { max: 20,       label: '20평이하' },   // 0~<66.12 m²
  { max: 50,       label: '50평미만' },   // 66.12~<165.3
  { max: 100,      label: '50~100평' },   // 165.3~<330.6
  { max: 200,      label: '100~200평' },  // 330.6~<661.2
  { max: Infinity, label: '200평이상' },  // 661.2~
]
```

**중요**: 면적대 키는 **한글 라벨**. v3 문서의 `a20/a50/...` 영문 키는 목업 전용. 실제 코드 이관 시 매핑 필요.

---

### 2.2 SMALL_PRESETS (상수 미존재, CSV 원본만)

파일: `data/p-value-lump-templates.csv`
공법: **복합 전용**. 우레탄 소형 프리셋 없음.
방식: 전 항목 `unit='식'` lump. P매트릭스 m² 단가 방식과 다름.

**330만원 프리셋**:
| 공종 | mat | labor | exp | total |
|---|---|---|---|---|
| 바탕정리 | 30,000 | 70,000 | 0 | 100,000 |
| 바탕조정제미장 | 0 | 0 | 0 | 0 |
| 하도 프라이머 | 90,000 | 110,000 | 0 | 200,000 |
| 복합 시트 2.3mm | 800,000 | 450,000 | 50,000 | 1,300,000 |
| 쪼인트 실란트 보강포 부착 | 120,000 | 180,000 | 0 | 300,000 |
| 노출 우레탄 중도 1.5mm(2회) | 650,000 | 400,000 | 50,000 | 1,100,000 |
| 벽체 우레탄 | 0 | 0 | 0 | 0 |
| 우레탄 상도 | 140,000 | 160,000 | 0 | 300,000 |
| 사다리차 | 0 | 0 | 120,000 | 120,000 |
| 폐기물 처리 | 0 | 0 | 0 | 0 |
| 드라이비트 절개 | 0 | 0 | 0 | 0 |
| **방수 소계** | **1,830,000** | **1,370,000** | **100,000** | **3,300,000** |

**380만원 프리셋**:
| 공종 | mat | labor | exp | total |
|---|---|---|---|---|
| 바탕정리 | 50,000 | 100,000 | 0 | 150,000 |
| 바탕조정제미장 | 0 | 0 | 0 | 0 |
| 하도 프라이머 | 90,000 | 110,000 | 0 | 200,000 |
| 복합 시트 2.3mm | 900,000 | 550,000 | 50,000 | 1,500,000 |
| 쪼인트 실란트 보강포 부착 | 180,000 | 220,000 | 0 | 400,000 |
| 노출 우레탄 중도 1.5mm(2회) | 700,000 | 400,000 | 50,000 | 1,150,000 |
| 벽체 우레탄 | 0 | 0 | 0 | 0 |
| 우레탄 상도 | 220,000 | 180,000 | 0 | 400,000 |
| 사다리차 | 0 | 0 | 120,000 | 120,000 |
| **방수 소계** | **2,140,000** | **1,560,000** | **100,000** | **3,800,000** |

**430만원 프리셋**:
| 공종 | mat | labor | exp | total |
|---|---|---|---|---|
| 바탕정리 | 50,000 | 100,000 | 0 | 150,000 |
| 바탕조정제미장 | 0 | 0 | 0 | 0 |
| 하도 프라이머 | 120,000 | 130,000 | 0 | 250,000 |
| 복합 시트 2.3mm | 1,050,000 | 700,000 | 50,000 | 1,800,000 |
| 쪼인트 실란트 보강포 부착 | 200,000 | 250,000 | 0 | 450,000 |
| 노출 우레탄 중도 1.5mm(2회) | 750,000 | 450,000 | 50,000 | 1,250,000 |
| 벽체 우레탄 | 0 | 0 | 0 | 0 |
| 우레탄 상도 | 220,000 | 180,000 | 0 | 400,000 |
| 사다리차 | 0 | 0 | 120,000 | 120,000 |
| **방수 소계** | **2,390,000** | **1,810,000** | **100,000** | **4,300,000** |

**공통 특징**:
- 벽체 우레탄 = 항상 0 (소형평수는 벽체 없음 전제)
- 사다리차 120,000원 고정 포함
- 프리셋 추가/수정 로직 코드에 없음

---

### 2.3 BaseItem 스키마 (`lib/estimate/types.ts:32-44`)

```ts
export interface BaseItem {
  name: string          // 공종명 (한글, 유일 키)
  spec: string          // 규격
  unit: string          // 'm²' | '식'
  isArea?: boolean      // true → qty = m²
  isWall?: boolean      // true → qty = wallM²
  isEquipment?: boolean // 장비류 (BASE에서 미사용, 동적 추가만)
  isFixedQty?: boolean  // 수량 고정
}
```

**중요**: `is_base`, `ure_mul` 필드 **없음**.
- `is_base`는 `buildItems()`에서 하드코딩 `true` 세팅
- `ure_mul`은 `syncUrethane.ts`의 `URETHANE_MULTIPLIERS` 상수에서 관리

---

### 2.4 COMPLEX_BASE (8개) — `lib/estimate/constants.ts:9-18`

```ts
[
  { name: "바탕정리",                   spec: "",                   unit: "m²", isArea: true },
  { name: "바탕조정제미장",             spec: "",                   unit: "식" },
  { name: "하도 프라이머",              spec: "",                   unit: "m²", isArea: true },
  { name: "복합 시트",                  spec: "2.3mm",              unit: "m²", isArea: true },
  { name: "쪼인트 실란트\n보강포 부착", spec: "",                   unit: "m²", isArea: true },
  { name: "노출 우레탄",                spec: "중도 1.5mm(2회)",    unit: "m²", isArea: true },
  { name: "벽체 우레탄",                spec: "중도 1mm(2회)",      unit: "m²", isWall: true },
  { name: "우레탄 상도",                spec: "탑코팅",             unit: "m²", isArea: true }
]
```

### 2.5 URETHANE_BASE (7개) — `lib/estimate/constants.ts:25-33`

```ts
[
  { name: "바탕정리",        spec: "그라인더 연삭",                 unit: "m²", isArea: true },
  { name: "바탕조정제미장",  spec: "",                              unit: "식" },
  { name: "하도 프라이머",   spec: "줄눈·크랙 실란트 보강포 부착",  unit: "m²", isArea: true },
  { name: "노출 우레탄 1차", spec: "중도 1mm",                      unit: "m²", isArea: true },
  { name: "노출 우레탄 2차", spec: "중도 2mm",                      unit: "m²", isArea: true },
  { name: "벽체 우레탄",     spec: "중도 1mm(2회)",                 unit: "m²", isWall: true },
  { name: "우레탄 상도",     spec: "탑코팅",                        unit: "m²", isArea: true }
]
```

---

### 2.6 원가 상수 (`lib/estimate/constants.ts`)

**LABOR_COST_PER_PUM** = 220,000 원/품 (단일 상수, 계단 함수 없음)
**MATERIAL_INCREASE_RATE** = 0.20 (20%)

**COST_TABLE** (면적대별 m² 원가):
| 면적대 | 복합 | 우레탄 |
|---|---|---|
| 20평이하 | 15,000 | 12,000 |
| 50평미만 | 13,000 | 10,500 |
| 50~100평 | 12,000 | 9,500 |
| 100~200평 | 11,000 | 8,500 |
| 200평이상 | 10,000 | 7,500 |

**COST_BREAKPOINTS** (상세 원가, constants.ts:97-101):
```ts
[
  { pyeong: 30,  hado: 80000,  jungdo15: 500000,  sangdo: 120000, sheet: 620000,  misc: 350000, pum: 6 },
  { pyeong: 50,  hado: 170000, jungdo15: 800000,  sangdo: 220000, sheet: 970000,  misc: 450000, pum: 7 },
  { pyeong: 100, hado: 320000, jungdo15: 1500000, sangdo: 350000, sheet: 1940000, misc: 600000, pum: 8 }
]
```

**장비 원가** (`EquipmentEditor.tsx:23-29`):
| 키 | 장비 | mat | labor | exp |
|---|---|---|---|---|
| ladder | 사다리차 | 0 | 0 | 120,000 |
| sky | 스카이차 | 0 | 0 | 350,000 |
| waste | 폐기물처리비 | 0 | 0 | 200,000 |
| forklift | 포크레인 | 0 | 0 | 700,000 |
| crane | 크레인 | 0 | 0 | 1,500,000 |
| ropeman | 로프공 | 0 | 450,000 | 600,000 |

**마진 공식** (`lib/estimate/margin.ts`, `costChips.ts`):
```ts
margin% = ((grandTotal - costPerM2*m2) / grandTotal) * 100
chipMargin% = ((price*1.09 - cost) / (price*1.09)) * 100   // 1.09 = 1 + ov0.03 + pr0.06
```

---

## 3. Supabase `cost_config` JSONB 전체 스키마

```ts
{
  // CostEditor
  labor_cost_per_pum: number,         // 기본 220,000
  material_increase_rate: number,     // 기본 0.20
  cost_breakpoints: CostBreakpoint[],

  // CalcRulesEditor
  calc_rules: {
    overhead_rate: number,            // 기본 0.03
    profit_rate: number,              // 기본 0.06
    round_unit: number,               // 기본 100,000 (10만원 절사)
  },

  // EquipmentEditor
  equipment_prices: {
    ladder:   { mat, labor, exp },
    sky:      { mat, labor, exp },
    waste:    { mat, labor, exp },
    forklift: { mat, labor, exp },
    crane:    { mat, labor, exp },
    ropeman:  { mat, labor, exp },
  },

  // WarrantyEditor
  warranty: {
    complex:  '8/5' | '5/3' | '3/3',
    urethane: '8/5' | '5/3' | '3/3',
  },

  // FavoritesEditor
  favorites: QuickChipCategory[],

  // OtherItemsEditor
  other_items: Record<string, { unit, mat, labor, exp }>,

  // NewItemsEditor (자동 등록)
  new_items: Record<string, {
    unit: string,
    mat: number,
    labor: number,
    exp: number,
    registered_at: string,  // ISO8601
  }>,
}
```

**registerNewItems 경로** (`app/api/estimates/[id]/save-all/route.ts:28-98`):
저장 트리거 → estimate.sheets 순회 → `is_base=false` 필터 → name이 favorites/other_items/new_items 중 어디에도 없으면 → `cost_config.new_items[name]` upsert.

**승격 경로** (UI): 신규 → 즐겨찾기/기타 또는 삭제.

---

## 4. 기존 `/settings` 페이지 완전 매핑

라우트: `/settings` → `app/(authenticated)/settings/page.tsx`

### 4.1 사이드바 3탭 (`SettingsSidebar.tsx`)
1. 단가표
2. 자주 쓰는 공종
3. 기타 설정

### 4.2 탭 1: 단가표 (P매트릭스 편집)
| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| PriceMatrixEditor | `components/settings/PriceMatrixEditor.tsx` | 메인 오케스트레이터 |
| PriceMatrixControls | `PriceMatrixControls.tsx` | 면적대/공법 드롭다운 |
| PriceMatrixChips | `PriceMatrixChips.tsx` | 칩 선택/추가/삭제 |
| PriceMatrixDetailTable | `PriceMatrixDetailTable.tsx` | 공종별 [mat,labor,exp] 편집 |
| usePriceMatrixEditor | `usePriceMatrixEditor.ts` | 상태 훅 |

### 4.3 탭 2: 자주 쓰는 공종
| 컴포넌트 | 역할 |
|---|---|
| FavoritesEditor / FavoriteChipTable | 즐겨찾기 CRUD |
| OtherItemsEditor / OtherItemsTable | 기타 공종 CRUD |
| NewItemsEditor / NewItemsTable | 신규 공종 관리 (승격/삭제) |

### 4.4 탭 3: 기타 설정 (`OtherSettingsPage.tsx`)
| 섹션 | 컴포넌트 | 편집 필드 |
|---|---|---|
| 원가 기준 | CostEditor (278L) | 1품 단가, 재료비 인상률, COST_BREAKPOINTS |
| 견적 규칙 | CalcRulesEditor (199L) | 공과잡비%, 기업이윤%, 절사 단위 |
| 장비 단가 | EquipmentEditor (180L) | 6종 장비 mat/labor/exp |
| 보증 | WarrantyEditor (191L) | 복합/우레탄 각 8/5·5/3·3/3 |

### 4.5 기타
- `PresetsEditor.tsx` (349L) — 프리셋 CRUD
- `BaseItemsEditor.tsx`
- `SettingsSummary.tsx`

### 4.6 API 엔드포인트
| 엔드포인트 | 메서드 | 기능 |
|---|---|---|
| `/api/settings/cost-config` | GET/PUT | cost_config 전체/부분 |
| `/api/settings/price-matrix` | GET/PUT/DELETE | P매트릭스 행 단위 CRUD |
| `/api/settings/presets` | GET/POST/PUT/DELETE | 프리셋 CRUD |
| `/api/settings/acdb-list` | GET | 자동완성 시드 |

---

## 5. v3 인수인계 문서 오류 정정표

| # | v3 기재 | 실제 코드 | 근거 |
|---|---|---|---|
| 1 | P매트릭스 복합 44세트 + 우레탄 18세트 | **복합 26세트 + 우레탄 18세트** | CC 덤프 면적대별 칩 분포 |
| 2 | 규칙서 페이지 **신설** 필요 | **이미 구현됨** (`/settings`, 20+ 컴포넌트) | `app/(authenticated)/settings/page.tsx` |
| 3 | BaseItem에 `is_base`, `ure_mul` 포함 | **없음.** is_base는 buildItems() 하드코딩, ure_mul은 URETHANE_MULTIPLIERS 별도 상수 | `lib/estimate/types.ts:32-44` |
| 4 | 면적대 키 `a20/a50/a100/a200/aOver` | **한글 라벨** `'20평이하'` 등. 영문 키는 목업 전용 | `areaRange.ts:8-14` |
| 5 | SMALL_PRESETS JS 상수 | **상수 없음.** CSV 원본만 (`data/p-value-lump-templates.csv`) | CC 덤프 |
| 6 | KCC CSV 업로드 방식(B안) | **없음.** 단일 공종 spec에 문자열로만 존재 | `data/acdb-seed.json` |
| 7 | 인건비 계단 함수 | **없음.** 단일 상수 LABOR_COST_PER_PUM=220,000 | `constants.ts:81` |
| 8 | `custom_items` 별도 테이블 | **별도 테이블 없음.** `cost_config.new_items` JSONB 경로 | `useNewItems.ts`, save-all route |
| 9 | P매트릭스 `area_50_100` 단일 키만 존재 | **전 면적대 주입 완료.** 26+18 세트 실데이터 존재 | CC 덤프 |

---

## 6. v2 명세서 검토 B 논점 요약 (C-N1~C-N10)

차기 v3 명세서 작성 시 반드시 해결해야 할 10개 논점.

### 🔴 치명
- **C-N1** 한글금액 포맷: "일금 ○○○원정" 형식 필수 (위변조 방지)
- **C-N2** saveToSupabase 경쟁 조건: updated_at 낙관적 락 + version 컬럼 필요

### 🟠 중대
- **C-N3** 빈 슬롯 복구 시 qty 자동 산출 규칙 명시 누락
- **C-N4** nextAddedOrder 영속화 페이로드 미포함
- **C-N5** AREA_THRESHOLDS 상수만 정의, getArea() 참조 강제 누락

### 🟡 경미
- **C-N6** T17이 C5 결정 대기 → CC 진행 데드락. skip 허용 조항 필요
- **C-N7** 4.4에 step=100 명시 누락 (4.8에만 있음)
- **C-N8** Unit 타입 `| string` 포함으로 리터럴 보장 소멸
- **C-N9** custom_items PK=name → 동음이의 구분 불가. uuid PK + name unique 필요
- **C-N10** M6(색상 동기화)와 C3(배열 순서 동기화) 구분 설명 누락

---

## 7. 차기 작업 진입점

### 7.1 v3 명세서 작성 시 반영 필수
- 본 문서 §2~§5를 1순위 진실로 사용
- §6의 10개 논점 전부 해결
- v2 명세서 11개 반영 항목(E1~I5)은 본 문서 구조에 맞춰 재번역
- 기존 `/settings` 페이지는 **범위 외** 명시

### 7.2 v4 인수인계 작성 시 반영 필수
- §5 정정표를 v3 문서에 반영
- 섹션 7.2 "규칙서 신설" → "`/settings` 개선/리뉴얼"
- 새 섹션: 기존 `/settings` 구조 요약 (본 문서 §4)
- 변경 이력 섹션 추가

### 7.3 2번 작업(규칙서 리뉴얼, A안)
- 기존 20+ 컴포넌트가 DNA 추출 대상
- 레퍼런스 수집 후 UX/UI 재설계
- 데이터/API는 유지

---

**END OF PROJECT TRUTH v1**
