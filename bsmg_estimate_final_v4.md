# BSMG-V4 Project Truth v4

> **v3 → v4 변경사항**: Phase 3-B (구글드라이브 이관 + Drive API PDF 변환) 완료 반영. §6 출력 파이프라인에 드라이브 저장 + PDF 변환 반영, §6.5 FAB PDF 버튼 활성화, §7 저장 구조에 드라이브 이관 반영, §8 신설/변경 파일 반영, §10 페이즈 로드맵 갱신.
> 목적: 실제 repo 코드를 1순위 진실로 삼은 단일 정정 문서.
> 기준 시점: Phase 3-B 완료 직후 (2026-04-12).

---

## §0. 운영 규칙

### CC 측
- 모든 CC 세션은 단발성. 세션 종료 시 클리어.
- md 파일이 유일한 영속 컨텍스트.
- 세션 종료 시 v{N}.md + HANDOFF.md 생성 필수.
- 병렬 실행 원칙: 독립 작업은 단일 메시지에 multiple tool calls로 동시 실행. 순차는 의존성 있을 때만. 불필요 순차는 규칙 위반.
- 범위 외 수정 금지. 모호하면 질문.

### 프롬프트 작성 측
- 모든 프롬프트 자립형(self-contained).
- 페이즈 병렬화 검토 필수 (파일 독립성).

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
  api/estimates/[id]/
    save-all/route.ts                 # 저장 → Google Drive 업로드 + registerNewItems
    export/route.ts                   # Phase 3-A: XLSX + Phase 3-B: PDF 다운로드
    generate/route.ts                 # Excel + PDF 생성
    pdf/route.ts                      # PDF 단일 생성 (puppeteer)
    email/route.ts                    # 이메일 발송
components/settings/                  # 20+ 컴포넌트 (섹션 4 참조)
components/estimate/
  SaveButton.tsx                      # FAB 저장/XLSX/PDF 버튼
  EstimateEditorForm.tsx              # 견적 에디터 메인
lib/estimate/
  constants.ts                        # BASE 상수, COST_TABLE, COST_BREAKPOINTS 등
  types.ts                            # BaseItem, Estimate, EstimateSheet 등
  areaRange.ts                        # getArea(m2)
  syncUrethane.ts                     # URETHANE_MULTIPLIERS
  margin.ts                           # getMargin
  cost.ts                             # getCostPerM2
  costChips.ts                        # getChipMarginPercent
  fileExport.ts                       # generateJson/Excel/MethodExcel/TempPdf
  fileNames.ts                        # 파일명 규칙
  calc.ts                             # 소계→공과잡비→기업이윤→절사
  jsonIO.ts                           # JSON 직렬화
lib/excel/
  generateWorkbook.ts                 # 복합+우레탄 결합 워크북 (save-all용)
  generateMethodWorkbook.ts           # Phase 3-A: 공법별 단일 XLSX 주입 엔진
lib/gdrive/
  client.ts                           # Drive v3 서비스 계정 클라이언트 (upload/upsert)
  convert.ts                          # Phase 3-B: XLSX → PDF 변환 (Drive API)
lib/pdf/
  generatePdf.ts                      # HTML→PDF (puppeteer)
templates/
  complex.xlsx                        # 복합방수 엑셀 템플릿 (Phase 3-A)
  urethane.xlsx                       # 우레탄방수 엑셀 템플릿 (Phase 3-A)
hooks/
  useEstimate.ts                      # 견적 상태 관리 훅
  useAutoSave.ts                      # 자동 저장 (Supabase DB, 실시간 편집용)
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
- MATERIAL_INCREASE_RATE = 0.20
- OVERHEAD_RATE = 0.03
- PROFIT_RATE = 0.06
- ROUND_UNIT = 100,000

---

## 3. Supabase `cost_config` JSONB 전체 스키마

v1 문서 §3과 동일. 변경 없음.

---

## 4. 기존 `/settings` 페이지 완전 매핑

v1 문서 §4와 동일. 변경 없음.

---

## 5. v1 정정표

v1 문서 §5와 동일. 9개 정정 항목 유효.

---

## 6. 엑셀·PDF 출력 파이프라인

### 6.1 출력 아키텍처

```
견적 데이터 (useEstimate)
  ├─ save-all API → JSON + XLSX 2종 + PDF 2종 → Google Drive 업로드
  │   ├─ XLSX: generateMethodWorkbook (공법별 단일)
  │   └─ PDF: Drive API (XLSX 업로드 → Google Sheets 변환 → PDF export)
  └─ export API
      ├─ format=xlsx → 공법별 단일 XLSX → 클라이언트 직접 다운로드
      └─ format=pdf  → Drive API 변환 → PDF → 클라이언트 직접 다운로드
```

### 6.2 템플릿 구조

위치: `templates/complex.xlsx`, `templates/urethane.xlsx`
시트 구성: Sheet1 (갑지/표지) + Sheet2 (을지/상세) + Config (무시)

**Sheet1 (갑지):**
| 셀 | 내용 | 주입 여부 |
|---|---|---|
| D6 | 관리번호 (YYMMDD+2자리) | ✓ 주입 |
| D7 | 견적일 | ✓ 주입 |
| D8 | {고객명} 귀하 | ✓ 주입 |
| D9 | 공사명 | ✓ 주입 |
| J9 | 현장주소 (현재 site_name 사용) | ✓ 주입 |
| E11 | 한글금액 (toKoreanAmount) | ✓ 값 주입 (NUMBERSTRING 대체) |
| K14 | 계 (totalBeforeRound) | ✓ 값 주입 (Sheet2 참조 대체) |
| K18 | 합계 (grandTotal) | ✓ 값 주입 |
| D19 | 특기사항 (하자보증/이행 + 메모) | ✓ 주입 (D19:R22 머지 셀) |
| N6, Q6, J6, J7, N7, N8 | 공급자 고정값 | ✗ 건드리지 않음 |

> **J9 주소**: 현재 Estimate 타입에 address 필드 없음. site_name으로 대체. 향후 address 필드 추가 시 J9 대상 변경.

**Sheet2 (을지):**
| 영역 | 행 | 내용 |
|---|---|---|
| C3 | 3 | 공사명 (공법명 포함) |
| 헤더 | 5-6 | 고정 (건드리지 않음) |
| 공종 | 7~(7+N-1) | 동적: 유효 아이템 수만큼 |
| 소계 | 7+N | SUM(G/I/K/M 열) |
| 공과잡비 | 7+N+1 | M소계*0.03 |
| 기업이윤 | 7+N+2 | M소계*0.06 |
| 계 | 7+N+3 | SUM(소계:이윤) |
| 합계 | 7+N+4 | FLOOR(계, 100000) |

### 6.3 동적 행 처리

- **유효 아이템 < 11**: 남는 행 삭제 (spliceRows), 합계 수식 범위 재계산
- **유효 아이템 > 11**: 소계 행 위에 행 삽입, 수식 설정
- **필터**: `is_hidden === true` 제외. `is_locked`는 출력 포함 (단가 잠금일 뿐).
- **수식 보존**: G(=E*F), I(=E*H), K(=E*J), L(=F+H+J), M(=G+I+K) — 앱이 계산값 직접 쓰지 않음

### 6.4 관리번호 생성

```
YYMMDD + 2자리 일련번호
일련번호 = COUNT(estimates WHERE date=today AND company_id=cid) + 1
기존 mgmt_no 컬럼 재사용. 스키마 변경 없음.
```

### 6.5 FAB 버튼 상태 (Phase 3-B)

| 버튼 | 상태 | 동작 |
|---|---|---|
| 저장 | 활성 | save-all API → Drive 업로드 |
| XLSX | 활성 | export API → 공법별 XLSX 다운로드 |
| PDF | **활성** | export API → Drive API PDF 변환 → 다운로드 |

### 6.6 파일 생성 상태

- **XLSX 생성**: ✅ 완료 (Phase 3-A)
  - 엔진: `lib/excel/generateMethodWorkbook.ts`
  - API: `POST /api/estimates/[id]/export` (body: `{format:'xlsx', method:'complex'|'urethane'}`)
- **PDF 변환**: ✅ 완료 (Phase 3-B)
  - 엔진: `lib/gdrive/convert.ts` (Drive API)
  - 흐름: XLSX 업로드 → Google Sheets 자동 변환 → PDF export → 중간 시트 삭제
  - API: `POST /api/estimates/[id]/export` (body: `{format:'pdf', method:'complex'|'urethane'}`)

### 6.7 Drive 파일 저장 (Phase 3-B)

save-all 호출 시 Google Drive에 저장되는 파일:
```
견적서 1건 = JSON 1 + XLSX 2(복합/우레탄) + PDF 2(복합/우레탄) = 최대 5파일
파일명: {customerName}_{siteName}_{YYMMDD}_{mgmtNo}.{json|xlsx|pdf}
XLSX/PDF 공법 구분: ..._complex.xlsx, ..._urethane.pdf 등
```

동일 estimateId 재저장 시 기존 파일 덮어쓰기 (upsertToDrive).

---

## 7. 저장 구조

### 7.1 실시간 편집 (autoSave)
- **Supabase DB 유지**: estimates, estimate_sheets, estimate_items 테이블
- useAutoSave 훅 → 디바운스 1초 → Supabase upsert
- 낙관적 락 (updated_at 기반 충돌 감지)

### 7.2 최종 저장 (save-all) — Phase 3-B 변경
- **Google Drive로 이관**: JSON + XLSX + PDF 파일 → Drive 폴더 업로드
- **Supabase Storage 미사용**: 새 견적서부터 Drive 저장. Supabase Storage 히트 0.
- 서비스 계정 인증 (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)
- 환경변수: GOOGLE_DRIVE_FOLDER_ID (견적서 폴더)
- DB 메타데이터 업데이트: estimates 테이블에 Drive URL 저장 (folder_path: `gdrive:{folderId}`)

### 7.3 cost_config
- **Supabase 유지**: 이관 대상 아님.

### 7.4 마이그레이션 정책
- 컷오프. 기존 Supabase Storage의 구 데이터는 읽기 전용으로 남김.
- 새 견적서부터 Drive 저장.

---

## 8. 프로젝트 구조 (Phase 3-B 신설/변경 파일)

| 파일 | 용도 |
|---|---|
| `lib/gdrive/convert.ts` | XLSX → PDF 변환 (Drive API) |

변경된 파일:
| 파일 | 변경 내용 |
|---|---|
| `lib/gdrive/client.ts` | upsertToDrive 추가, getAuth export, findFileByName 추가 |
| `app/api/estimates/[id]/save-all/route.ts` | Supabase Storage → Drive 업로드, 공법별 XLSX+PDF 생성 |
| `app/api/estimates/[id]/export/route.ts` | PDF format 501 → Drive API 변환 구현 |
| `components/estimate/SaveButton.tsx` | PDF 버튼 활성화, handlePdfDownload 추가 |

---

## 9. v1 정정표 (유지)

v1 문서 §5의 9개 정정 항목 그대로 유효.

---

## 10. 페이즈 로드맵

### 10.1 완료된 페이즈
- Phase 1: 견적 에디터 UI
- Phase 2: 음성 파이프라인
- Phase 3-A: 엑셀 주입 엔진 (XLSX 생성) ✅
- Phase 3-B: 구글드라이브 이관 + Drive API PDF 변환 ✅

### 10.2 예정 페이즈

| 페이즈 | 범위 | 상태 |
|---|---|---|
| 3-C | /settings UI/UX 리뉴얼 + material_increase_rate 완전 제거 | 진행 중 (병렬) |

---

## Phase 3-B 완료 요약

- **커밋 해시**: 2de47b5
- **기준 시점**: 2026-04-12
- **변경 파일**:
  - 신규: `lib/gdrive/convert.ts`
  - 변경: `lib/gdrive/client.ts`, `app/api/estimates/[id]/save-all/route.ts`, `app/api/estimates/[id]/export/route.ts`, `components/estimate/SaveButton.tsx`
  - 삭제: 없음
- **검증 결과**:
  - TypeScript 0 errors (신규 코드 관련)
  - Lint 0 new errors
  - Build 컴파일 성공
  - save-all: JSON + XLSX 2종 + PDF 2종 → Drive 업로드 ✓
  - export: format=pdf → Drive API 변환 → binary stream ✓
  - upsert: 동일 파일명 재저장 → 덮어쓰기 ✓
  - FAB PDF 버튼 활성화 ✓
  - autoSave, undo/redo 회귀 없음 (코드 미변경)
- **미해결 이슈**:
  - J9 현장주소: Estimate 타입에 address 필드 없음 → site_name으로 대체 (3-A부터 유지)
  - 관리번호 경쟁 조건: Supabase COUNT 기반 유지 + Drive upsert로 덮어쓰기 보장

**END OF PROJECT TRUTH v4**
