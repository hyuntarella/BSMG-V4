# BSMG-V4 Project Truth v6

> **v5 → v6**: Phase 5 (/settings 단가표 재구조 + 즉시 반응 UX) 완료 반영.
> 기준 시점: 2026-04-12 (Phase 5 완료 후).

---

## §0. 운영 규칙

### 0.1 CC(코딩 에이전트) 측
- 모든 CC 세션은 단발성. 세션 종료 시 히스토리 클리어.
- 이 md 파일이 유일한 영속 컨텍스트. 다음 세션은 이 파일과 HANDOFF.md만 보고 시작.
- 매 세션 종료 시 필수:
  1. 이 md를 `v{N+1}`로 갱신
  2. `NEXT_SESSION_HANDOFF.md` 생성
  3. 커밋 해시·배포 URL·변경 파일·미해결 이슈 보고
- 범위 외 수정 금지. 모호하면 질문.
- **병렬 실행 원칙 (필수)**:
  - 작업 전 의존성 그래프 그리기.
  - 독립 작업은 단일 메시지에 multiple tool calls로 동시 실행 (Read/Grep/Write/Bash).
  - 순차는 A 결과가 B 입력일 때만.
  - 불필요 순차 = 규칙 위반.

### 0.2 프롬프트 작성·전달 측 (PM 세션)
- 모든 CC 세션은 빈 컨텍스트에서 시작한다고 가정. 이전 대화 전제 금지.
- 프롬프트는 자립형(self-contained): 세션 독립성 명시, 첨부 파일 명시, 배경·이유 포함, 금지 스코프·검증 기준·산출물 명시.
- 작성 후 자가 점검: "이 프롬프트만 복붙해도 독립 실행 가능한가?" NO면 재작성.
- **페이즈 병렬화 검토 필수**:
  - 페이즈 기획 시 의존성 그래프 먼저.
  - 독립 페이즈는 별도 CC 세션 병렬 실행.
  - 파일 교집합 0 확인 후 진행.
- PM 세션도 단발성 가정. 모든 결정은 md에 기록.

### 0.3 병렬 세션 워크트리 규칙 (v5 신설)
- 두 CC 세션을 병렬 실행할 때, **같은 워킹 디렉토리 공유 금지**.
- 사유: 세션 A 작업 중 세션 B가 브랜치 스위치 → 세션 A 파일 유실 위험.
- 필수 절차:
  ```
  # 첫 세션은 메인 레포에서 작업
  세션 A: cd /path/to/repo && git checkout -b feature/XX
  
  # 두 번째 세션은 worktree로 별도 폴더 생성
  세션 B: cd /path/to/repo && git worktree add ../repo-YY feature/YY
          cd ../repo-YY
  ```
- 프롬프트에 "브랜치 생성 전 worktree 사용 여부 확인" 지시 포함.
- 병렬 종료 후 worktree 제거: `git worktree remove ../repo-YY`.

---

## 1. 실제 Repo 구조

```
app/
  (authenticated)/settings/page.tsx   # 설정 페이지 (Phase 5 재구성)
  api/settings/
    cost-config/route.ts              # GET/PUT
    price-matrix/route.ts             # GET/PUT/DELETE
    price-matrix/bulk/route.ts        # GET (Phase 5 신설 — 전체 일괄 조회)
    presets/route.ts                  # GET/POST/PUT/DELETE
    acdb-list/route.ts                # GET
  api/estimates/[id]/
    save-all/route.ts                 # 3-B: Google Drive 업로드
    export/route.ts                   # 3-A: XLSX + 3-B: PDF 다운로드
    generate/route.ts                 # Excel + PDF 생성 (legacy)
    pdf/route.ts                      # PDF 단일 생성 (puppeteer, legacy)
    email/route.ts                    # 이메일 발송
components/settings/                  # Phase 5 재구성
  PriceMatrixEditor.tsx               # 세그먼트+탭 UI (store 옵션)
  AreaRangeTabPanel.tsx               # 면적대 탭 패널 (memo)
  PriceMatrixDetailTable.tsx          # 5열 표 (공종/재료/인건/경비/합) + 평단가 비교 (memo)
  PriceMatrixChips.tsx                # 평단가 칩 (memo)
  SmallPresetEditor.tsx               # 20평이하 프리셋 편집기 (memo)
  usePriceMatrixStore.ts              # 전체 P매트릭스 bulk 관리 훅
  OtherSettingsPage.tsx               # 2×2 카드 그리드
  CostEditorCard.tsx                  # 원가 카드
  CalcRulesCard.tsx                   # 계산규칙+장비 카드
  WarrantyCard.tsx                    # 보증 카드
  useOtherSettingsStore.ts            # 기타설정 통합 상태 훅
  SettingsSidebar.tsx                 # iOS 세그먼트 (변경 없음)
  SettingsSummary.tsx                 # 요약 바 (변경 없음)
  FavoriteItemsPage.tsx               # 자주 쓰는 공종 (변경 없음)
  # 구 에디터 (estimate SettingsPanel에서 사용)
  CostEditor.tsx / CalcRulesEditor.tsx / EquipmentEditor.tsx / WarrantyEditor.tsx
  BaseItemsEditor.tsx / PresetsEditor.tsx
  FavoriteChipTable.tsx / FavoritesEditor.tsx
  OtherItemsTable.tsx / OtherItemsEditor.tsx
  NewItemsTable.tsx / NewItemsEditor.tsx
components/estimate/
  SaveButton.tsx                      # FAB 저장/XLSX/PDF 버튼
  EstimateEditorForm.tsx              # 견적 에디터 메인
  SettingsPanel.tsx                   # BaseItemsEditor + PresetsEditor 사용
lib/estimate/
  constants.ts                        # BASE 상수, COST_TABLE, SMALL_PRESETS 등
  types.ts
  areaRange.ts / syncUrethane.ts / margin.ts / cost.ts / costChips.ts
  costBreakdown.ts                    # getCostBreakdown, getAdjustedCost(alias)
  fileExport.ts / fileNames.ts / calc.ts / jsonIO.ts
lib/excel/
  generateWorkbook.ts                 # 결합 워크북 (save-all용)
  generateMethodWorkbook.ts           # 3-A: 공법별 단일 XLSX
lib/gdrive/                           # 3-B 신설
  client.ts                           # Drive v3 서비스 계정 (upsert, findFileByName)
  convert.ts                          # XLSX → PDF (Drive API)
lib/pdf/
  generatePdf.ts                      # HTML→PDF (puppeteer, legacy)
templates/                            # 3-A 신설
  complex.xlsx / urethane.xlsx
hooks/
  useEstimate.ts / useAutoSave.ts / useNewItems.ts
data/
  p-value-lump-templates.csv
  acdb-seed.json
supabase/migrations/001_initial_schema.sql
```

---

## 2. 데이터 상수 실제 값

### 2.1 P매트릭스 세트 수

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
복합 전용. 330만/380만/430만 (constants.ts).
**Phase 5**: DB 저장 (cost_config.small_presets) 지원. 우레탄 20평이하 빈 폼 노출 (데이터 입력 시 활성화).

### 2.3 BaseItem 스키마
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
`lib/estimate/constants.ts` 참조.

### 2.5 원가 상수
- LABOR_COST_PER_PUM = 220,000
- ~~MATERIAL_INCREASE_RATE = 0.20~~ **3-C에서 제거됨**
- OVERHEAD_RATE = 0.03
- PROFIT_RATE = 0.06
- ROUND_UNIT = 100,000

> **중요**: 재료비 인상분은 이제 COST_TABLE 원본 값에 직접 반영되어야 함. 사장이 /settings에서 원가 테이블을 최신 시세로 유지할 것.

---

## 3. Supabase `cost_config` JSONB 스키마
v1 §3 동일. DB의 `material_increase_rate` 필드는 존재하나 읽는 코드 없음. DB 마이그레이션 불필요.
**Phase 5 추가**: `small_presets` 섹션 — `{ complex: Record<string, [mat,labor,exp][]>, urethane: Record<string, [mat,labor,exp][]> }`.

---

## 4. `/settings` 페이지 매핑 (Phase 5 재구성)

### 레이아웃 구조
```
page.tsx (통합 저장 버튼 + dirty 추적 + 탭 전환 확인)
  ├─ Header
  ├─ 저장 버튼 (탭별 dirty 플래그)
  ├─ SettingsSummary
  ├─ SettingsSidebar (iOS 세그먼트 — 3탭)
  └─ 콘텐츠 카드
       ├─ [단가표] PriceMatrixEditor
       │    ├─ 공법 세그먼트 (복합/우레탄)
       │    └─ 면적대 탭 (5개 — 동시 1개만 렌더)
       │         ├─ [20평이하] SmallPresetEditor
       │         │    ├─ 복합: 3개 프리셋 카드 (공종별 재료/인건/경비 편집)
       │         │    └─ 우레탄: 빈 폼 + "현재 미사용 규모" 안내
       │         └─ [기타] AreaRangeTabPanel (memo)
       │              ├─ PriceMatrixChips (memo)
       │              └─ PriceMatrixDetailTable (memo)
       │                   ├─ 5열 표 (공종/재료/인건/경비/합)
       │                   └─ 하단 평단가 비교 (현재 → 수정값)
       ├─ [자주 쓰는 공종] FavoriteItemsPage
       └─ [기타 설정] OtherSettingsPage (2×2 그리드)
            ├─ 원가 기준 카드 (CostEditorCard)
            ├─ 계산 규칙·장비 카드 (CalcRulesCard)
            ├─ 보증 카드 (WarrantyCard)
            └─ 미리보기 카드 (CalcPreview)
```

### Phase 5 삭제 컴포넌트
- `PriceMatrixControls.tsx` — 미사용 확인 후 삭제
- `PriceMatrixAccordionItem.tsx` — AreaRangeTabPanel로 대체
- `usePriceMatrixEditor.ts` — usePriceMatrixStore로 대체

### API 호출 변화
| 시점 | v5 (이전) | v6 (Phase 5) |
|------|-----------|-------------|
| 진입 시 | 7회 (summary 2 + 아코디언 5) | 3회 (bulk + cost-config + presets) |
| 공법/면적대 전환 | +5회 | 0회 |
| 저장 | per-accordion | 탭별 1회 (변경분만) |

---

## 5. v1 정정표
v1 §5의 9개 정정 항목 유효.

---

## 6. 엑셀·PDF 출력 파이프라인

### 6.1 출력 아키텍처

```
견적 데이터 (useEstimate)
  ├─ save-all API → JSON + XLSX 2종 + PDF 2종 → Google Drive 업로드
  │   ├─ XLSX: generateMethodWorkbook (공법별 단일)
  │   └─ PDF: Drive API (XLSX 업로드 → Google Sheets 변환 → PDF export)
  └─ export API
      ├─ format=xlsx → 공법별 XLSX → 클라이언트 다운로드
      └─ format=pdf  → Drive API 변환 → PDF → 클라이언트 다운로드
```

### 6.2~6.6
v5와 동일.

---

## 7. 저장 구조

### 7.1~7.4
v5와 동일.

---

## 8. Phase 신설/변경 파일

### Phase 5 신설
- `app/api/settings/price-matrix/bulk/route.ts` — 전체 P매트릭스 일괄 GET
- `components/settings/AreaRangeTabPanel.tsx` — 면적대 탭 패널 (memo)
- `components/settings/SmallPresetEditor.tsx` — 20평이하 프리셋 편집기
- `components/settings/usePriceMatrixStore.ts` — 전체 P매트릭스 상태 훅
- `components/settings/useOtherSettingsStore.ts` — 기타설정 통합 상태 훅
- `components/settings/CostEditorCard.tsx` — 원가 카드
- `components/settings/CalcRulesCard.tsx` — 계산규칙+장비 카드
- `components/settings/WarrantyCard.tsx` — 보증 카드

### Phase 5 변경
- `app/(authenticated)/settings/page.tsx` — 통합 저장 + dirty + 초기 로딩
- `components/settings/PriceMatrixEditor.tsx` — 세그먼트+탭 UI, store 옵션
- `components/settings/PriceMatrixDetailTable.tsx` — 5열(합 추가) + 평단가 비교
- `components/settings/PriceMatrixChips.tsx` — memo 래핑
- `components/settings/OtherSettingsPage.tsx` — 2×2 카드 그리드

### Phase 5 삭제
- `components/settings/PriceMatrixControls.tsx`
- `components/settings/PriceMatrixAccordionItem.tsx`
- `components/settings/usePriceMatrixEditor.ts`

### 3-A~3-C 파일
v5 §8 동일.

---

## 9. v1 정정표 (유지)

---

## 10. 페이즈 로드맵

### 10.1 완료
- Phase 1: 견적 에디터 UI
- Phase 2: 음성 파이프라인
- Phase 3-A: 엑셀 주입 엔진 ✅
- Phase 3-B: 구글드라이브 이관 + Drive API PDF 변환 ✅
- Phase 3-C: /settings 리뉴얼 + material_increase_rate 제거 ✅
- Phase 5: /settings 단가표 재구조 + 즉시 반응 UX ✅

### 10.2 예정 (우선순위 순)

| 페이즈 | 범위 | 상태 |
|---|---|---|
| 4 | 음성 견적 단가 역산 재검증 (findPriceForMargin 회귀 확인) | 사장 판단 대기 |
| 6 | Estimate에 address 필드 추가 (J9 정확도) | 낮음 |
| 7 | getAdjustedCost deprecated alias 최종 제거 | 낮음 |
| 8 | 관리번호 경쟁 조건 강화 (UNIQUE 제약 + 재시도) | 낮음 |
| 9 | 모바일/태블릿 반응형 | 낮음 |
| 10 | 기술부채 해소 (useAutoSave id 재할당, stale closure) | 낮음 |

---

## 11. Phase 5 완료 요약

### 커밋
- 브랜치: feature/5-settings-ux
- 검증: TS 에러 0 (pre-existing test file 제외), Lint 에러 0, Build 성공, 478 tests 통과

### 주요 변경
1. **단가표 재구조**: 아코디언 → 세그먼트(공법) + 탭(면적대) + 칩(평단가) + 5열 테이블(합 컬럼 추가)
2. **즉시 반응**: bulk API로 진입 1회 로드 → 모든 탐색 클라이언트 메모리 (API 호출 7회→3회, 전환 시 0회)
3. **20평이하 전용 UI**: 복합 3개 프리셋 카드 (공종별 편집 가능, 총액 자동 갱신), 우레탄 빈 폼 + "현재 미사용 규모" 안내
4. **기타설정 2×2 그리드**: 원가/계산규칙+장비/보증/미리보기 4카드, 한 화면 스크롤 최소화
5. **통합 저장**: 탭별 단일 저장 버튼, dirty 플래그, 탭 전환 시 미저장 확인
6. **dirty 추적**: 단가표(P매트릭스 + SMALL_PRESETS) / 기타설정 독립 2개
7. **리렌더 방어**: memo + key 기반 mount/unmount → 편집 중인 탭만 리렌더
8. **미사용 정리**: PriceMatrixControls, PriceMatrixAccordionItem, usePriceMatrixEditor 삭제

### 미해결 이슈
1. **findPriceForMargin 숫자 변화**: material_increase_rate 제거로 음성 견적 단가 역산 값이 변경됨. Phase 4 검증 대상.
2. **J9 현장주소**: Estimate 타입에 address 필드 없음 → site_name 대체 유지.
3. **관리번호 경쟁 조건**: 이론적 위험 남음.
4. **getAdjustedCost**: deprecated alias 유지 중.
5. **SettingsPanel(estimate 측)**: 구 에디터 사용 중. /settings와 이중 구조이나 금지 스코프로 미수정.

**END OF PROJECT TRUTH v6**
