# BSMG-V4 Project Truth v5

> **v4 + v4c → v5 통합**: Phase 3-B (구글드라이브 이관 + PDF 변환) + Phase 3-C (/settings 리뉴얼 + material_increase_rate 제거) 완료 반영.
> §0 운영 규칙에 병렬 세션 워크트리 규칙 추가.
> 기준 시점: 2026-04-12 (3-B/3-C 병합 후).

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
  (authenticated)/settings/page.tsx   # 설정 페이지 엔트리 (3-C 리뉴얼)
  api/settings/
    cost-config/route.ts              # GET/PUT
    price-matrix/route.ts             # GET/PUT/DELETE
    presets/route.ts                  # GET/POST/PUT/DELETE
    acdb-list/route.ts                # GET
  api/estimates/[id]/
    save-all/route.ts                 # 3-B: Google Drive 업로드
    export/route.ts                   # 3-A: XLSX + 3-B: PDF 다운로드
    generate/route.ts                 # Excel + PDF 생성 (legacy)
    pdf/route.ts                      # PDF 단일 생성 (puppeteer, legacy)
    email/route.ts                    # 이메일 발송
components/settings/                  # 21 컴포넌트 + 1 신규 (3-C 리뉴얼)
components/estimate/
  SaveButton.tsx                      # FAB 저장/XLSX/PDF 버튼
  EstimateEditorForm.tsx              # 견적 에디터 메인
  SettingsPanel.tsx                   # BaseItemsEditor + PresetsEditor 사용
lib/estimate/
  constants.ts                        # BASE 상수, COST_TABLE 등
                                      # MATERIAL_INCREASE_RATE 삭제됨 (3-C)
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

---

## 4. `/settings` 페이지 매핑 (3-C 리뉴얼)

### 레이아웃 구조
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
            ├─ CostEditor (재료비 인상률 UI 제거됨)
            ├─ CalcRulesEditor + EquipmentEditor
            └─ WarrantyEditor
```

### 삭제 후보 컴포넌트
- `PriceMatrixControls.tsx` — 미사용 (향후 삭제)

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

### 6.2 템플릿 구조

**Sheet1 (갑지):**
| 셀 | 내용 |
|---|---|
| D6 | 관리번호 (YYMMDD+2자리) |
| D7 | 견적일 |
| D8 | {고객명} 귀하 |
| D9 | 공사명 |
| J9 | 현장주소 (현재 site_name 사용) |
| E11 | 한글금액 (값 주입) |
| K14 | 계 (값 주입) |
| K18 | 합계 (값 주입) |
| D19 | 특기사항 (D19:R22 머지) |
| N6, Q6, J6, J7, N7, N8 | 공급자 고정값 (건드리지 않음) |

**Sheet2 (을지):**
| 영역 | 행 | 내용 |
|---|---|---|
| C3 | 3 | 공사명 |
| 헤더 | 5-6 | 고정 |
| 공종 | 7~(7+N-1) | 동적 |
| 소계 | 7+N | SUM |
| 공과잡비 | 7+N+1 | M소계*0.03 |
| 기업이윤 | 7+N+2 | M소계*0.06 |
| 계 | 7+N+3 | SUM |
| 합계 | 7+N+4 | FLOOR(계, 100000) |

### 6.3 동적 행 처리
- 유효 아이템 < 11: spliceRows로 삭제, 수식 범위 재계산
- 유효 아이템 > 11: 소계 위에 insert_rows, 수식 설정
- 필터: `is_hidden === true` 제외. `is_locked` 포함.
- 수식 보존: 앱이 계산값 직접 쓰지 않음

### 6.4 관리번호
`YYMMDD + COUNT(estimates WHERE date=today AND company_id=cid) + 1` (2자리 zero-pad). Drive upsert로 중복 덮어쓰기.

### 6.5 FAB 버튼 상태
| 버튼 | 상태 | 동작 |
|---|---|---|
| 저장 | 활성 | save-all → Drive 업로드 |
| XLSX | 활성 | export → 공법별 XLSX |
| PDF | 활성 | export → Drive API PDF 변환 |

### 6.6 Drive 파일 저장
```
견적서 1건 = JSON 1 + XLSX 2 + PDF 2 = 최대 5파일
파일명: {customerName}_{siteName}_{YYMMDD}_{mgmtNo}.{ext}
공법 구분: _complex.xlsx, _urethane.pdf 등
동일 estimateId 재저장 시 upsert (덮어쓰기)
```

---

## 7. 저장 구조

### 7.1 실시간 편집 (autoSave)
- Supabase DB 유지. estimates, estimate_sheets, estimate_items.
- useAutoSave 훅 → 디바운스 1초 → upsert.
- 낙관적 락 (updated_at).

### 7.2 최종 저장 (save-all)
- **Google Drive 이관 완료** (3-B).
- JSON + XLSX + PDF → Drive 폴더 업로드.
- 서비스 계정 인증 (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY).
- GOOGLE_DRIVE_FOLDER_ID 환경변수.
- DB estimates 테이블에 Drive URL 저장 (folder_path: `gdrive:{folderId}`).

### 7.3 cost_config
- Supabase 유지. 이관 대상 아님.

### 7.4 마이그레이션
- 컷오프. 구 Supabase Storage 데이터는 읽기 전용.

---

## 8. Phase 3 신설/변경 파일

### 3-A 신설
- `templates/complex.xlsx`, `templates/urethane.xlsx`
- `lib/excel/generateMethodWorkbook.ts`
- `app/api/estimates/[id]/export/route.ts`

### 3-B 신설
- `lib/gdrive/convert.ts`

### 3-B 변경
- `lib/gdrive/client.ts` — upsertToDrive, findFileByName
- `app/api/estimates/[id]/save-all/route.ts` — Drive 업로드
- `app/api/estimates/[id]/export/route.ts` — PDF 분기 구현
- `components/estimate/SaveButton.tsx` — PDF 버튼 활성화

### 3-C 신설
- `components/settings/PriceMatrixAccordionItem.tsx`

### 3-C 변경
- `lib/estimate/constants.ts` — MATERIAL_INCREASE_RATE 삭제
- `lib/estimate/costBreakdown.ts` — getAdjustedCost alias, getMarginDisplay 단순화
- `components/settings/CostEditor.tsx` — 재료비 인상률 UI 제거
- `components/settings/SettingsSummary.tsx` — materialIncreaseRate 제거, 칩 스타일
- `components/settings/SettingsSidebar.tsx` — iOS 세그먼트
- `app/(authenticated)/settings/page.tsx` — 레이아웃
- `components/settings/OtherSettingsPage.tsx`, `PriceMatrixEditor.tsx`, `PriceMatrixChips.tsx`, `PriceMatrixDetailTable.tsx`, `usePriceMatrixEditor.ts`
- `app/api/settings/cost-config/route.ts` — 주석 정리
- `tests/costBreakdown.test.ts` — 기대값 갱신

### 3-A 삭제
- `public/templates/complex-template.xlsx`, `public/templates/urethane-template.xlsx`

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

### 10.2 예정 (우선순위 순)

| 페이즈 | 범위 | 상태 |
|---|---|---|
| 4 | 음성 견적 단가 역산 재검증 (findPriceForMargin 회귀 확인) | 사장 판단 대기 |
| 5 | Estimate에 address 필드 추가 (J9 정확도) | 낮음 |
| 6 | PriceMatrixControls.tsx 등 미사용 컴포넌트 정리 | 낮음 |
| 7 | getAdjustedCost deprecated alias 최종 제거 | 낮음 |
| 8 | 관리번호 경쟁 조건 강화 (UNIQUE 제약 + 재시도) | 낮음 |
| 9 | 모바일/태블릿 반응형 | 낮음 |
| 10 | 기술부채 해소 (useAutoSave id 재할당, stale closure) | 낮음 |

---

## 11. Phase 3-B / 3-C 통합 완료 요약

### 3-B
- 커밋: 2de47b5 (브랜치 feature/3b-gdrive)
- 검증: TS/Lint/Build 클린, save-all Drive 업로드 ✓, export PDF ✓, upsert 덮어쓰기 ✓

### 3-C
- 커밋: 95aafe9 (브랜치 feature/3c-settings)
- 검증: Build 성공, 478 tests 통과, material_increase_rate 실제 사용 0건

### 통합 시 미해결 이슈
1. **findPriceForMargin 숫자 변화**: material_increase_rate 제거로 음성 견적 단가 역산 값이 20% 낮아짐. COST_TABLE이 최신 시세 반영되었으면 정상, 아니면 페이즈 4에서 복구 필요.
2. **J9 현장주소**: Estimate 타입에 address 필드 없음 → site_name 대체 (3-A부터 유지).
3. **관리번호 경쟁 조건**: Supabase COUNT + Drive upsert로 덮어쓰기 보장. 동시 저장 시 이론적 위험 남음.
4. **PriceMatrixControls / BaseItemsEditor / PresetsEditor**: 미사용 또는 제한적 사용. 향후 정리.
5. **getAdjustedCost**: deprecated alias로 유지 중. 금지 스코프(useVoiceFlow.ts) 해제 시 제거.

**END OF PROJECT TRUTH v5**
