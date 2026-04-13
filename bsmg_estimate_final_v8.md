# BSMG-V4 Project Truth v8

> **v7 → v8**: Phase 4.5 (레이아웃 재구성 + 엑셀 서식 복구 + PDF 가로) — **진행 중 (미완료, 머지 전)**.
> 기준 시점: 2026-04-13 (브랜치 `feature/11-layout-excel-pdf`, 마지막 커밋 `515d47e`).
>
> **상태**: 10개 커밋 원격 푸시됨. Vercel 프리뷰 빌드 **실패** (환경변수 누락). 엑셀 UAT 4건 미해결. 머지 대기.

---

## §0. 운영 규칙

v7 §0 동일. 커밋 규율 (§0.4) 유지.

### 0.5 엔진 통합 규율 (v8 신설)

- 한 기능에 구/신 엔진 공존 발견 시, **UI 경로만 최소 수정**으로 신식 통일 → 구식 파일 제거
- 엔드포인트(라우트)는 살려두고 내부 구현만 교체 (e2e 테스트 영향 최소화)
- 사유: c7 에서 `generateWorkbook` (구) vs `generateMethodWorkbook` (신) 공존 버그 발견. 음성 저장/이메일 발송이 구식 경로로 빠지면서 PM 스크린샷 6건 버그 재현

---

## §1. 실제 Repo 구조 (v8 갱신)

```
components/estimate/
  EstimateEditor.tsx        # Phase 4.5: flex-row, 좌 CompareSidebar + 우 2탭
  EstimateEditorForm.tsx    # Phase 4.5: 동일 레이아웃 적용, 폼 견적서
  CompareSidebar.tsx        # Phase 4.5 신규: 296px 고정, 세로 스택, 읽기 전용
  SidePanel.tsx             # Phase 4.5 신규: DB+런타임 가격 연동, 양 파일 공통
  ExcelLikeTable.tsx        # QuickAddChips 제거됨
  EstimateTableWrapper.tsx  # handleQuickAdd 제거됨
  # 삭제: CompareView.tsx (좌측 사이드바로 이전), QuickAddChips.tsx (SidePanel 로 통합)

lib/excel/
  generateMethodWorkbook.ts # 단일 엔진 (v8): pageSetup landscape, 행 높이 동적,
                            #   이미지 앵커 보정, META 침범 방지, 한글금액 값 주입
  # 삭제: generateWorkbook.ts (c7 엔진 통합)

lib/estimate/
  fileExport.ts             # generateExcel dead wrapper 제거 (c7)

app/api/estimates/[id]/
  generate/route.ts         # c7: generateMethodWorkbook 사용 (sheets[0] 기준)
                            #   Drive 업로드 블록 보존
  save-all/route.ts         # 주 경로: generateMethodWorkbook + convertXlsxToPdf
```

---

## §2. Phase 4.5 산출물 요약

### 2.1 작업 1 — 레이아웃 재구성 (c1~c5)

**전**:
```
외곽 1480px flex-col
├ TOP BAR (3탭: 복합 / 우레탄 / 갑지·검수)
├ META BAR
├ PRICE BAR
└ MAIN (탭 전환, 갑지 탭이면 CompareView, 그 외 테이블+SidePanel 148px)
```

**후**:
```
외곽 1480px flex-row
├ LEFT 296px (20%)
│   CompareSidebar — 상시 노출, 세로 스택, 읽기 전용, 내부 스크롤
│   ├ 금액 카드 2장 (28px 금액, ₩9,600,000 포맷, 한글금액)
│   ├ 차액/차이율/특기사항 세로
│   └ 복합/우레탄 상세표 세로 2장 (공종/단가/금액 3열 컴팩트)
└ RIGHT 1184px (80%) flex-col
    ├ TOP BAR (2탭: 복합 / 우레탄)
    ├ META BAR (상시 노출, cover 분기 제거)
    ├ PRICE BAR
    └ MAIN (테이블 + SidePanel 148px 공통 컴포넌트)
```

**파일 변경**:
- EstimateEditor.tsx, EstimateEditorForm.tsx: flex-col → flex-row, cover 탭 제거
- 신규: CompareSidebar.tsx (296px), SidePanel.tsx (공통)
- 삭제: CompareView.tsx (341줄)

### 2.2 작업 1b — SidePanel 업그레이드 (c3, c4)

**전** (2곳 중복, 82줄씩):
- 하드코딩 9종 버튼
- 하드코딩 단가 (사다리차 120k 등)
- 설정 페이지 변경 무반영
- calc 재계산 누락 (grand_total 갱신 안 됨)
- QuickAddChips (표 하단) 과 동일 항목 중복, 가격 불일치

**후** (단일 파일 68줄):
- `useFavorites()` → `cost_config.favorites` DB 동적 렌더
- `useRuntimeChipPrices().applyPrices` 런타임 오버라이드 적용
- `chipToEstimateItem` 공통 유틸, 양 시트 동시 추가, calc 재계산, 스냅샷
- QuickAddChips (표 하단) 제거 → SidePanel 로 단일화
- FavoritesEditor / EquipmentEditor 편집 즉시 반영

### 2.3 작업 2 — 엑셀 서식 복구 (c6)

`lib/excel/generateMethodWorkbook.ts` 의 6건 수정:

| # | 이슈 | 해결 |
|---|---|---|
| 1 | META 라벨 침범 | 값 셀 alignment 에 `shrinkToFit: true, wrapText: false, horizontal: 'left'` |
| 2 | 2줄 내용 행 높이 | `computeRowHeight` 품명 길이/\n 기준 동적 (20/36/52px) + `wrapText: true` |
| 3 | 빈 행 방치 | `spliceRows` 이미 호출. 추가로 이미지 앵커 보정 헬퍼 |
| 4 | 로고 이미지 틀어짐 | `preserveImagesAcrossSplice` — splice 전후 이미지 range.tl/br.row 보정 |
| 5 | 좌측 정렬 유실 | 메타 셀 (D6~D9, J9, D19) alignment 명시 |
| 6 | 한글금액 #NAME? | E11 + 주변 셀 (5~10열 11행) 수식 null 초기화 후 값 주입 |

### 2.4 작업 2b — 엔진 통합 (c7)

**전**:
- FAB 저장 버튼 → save-all → generateMethodWorkbook (신식)
- 음성 "저장해줘" → /generate → generateWorkbook (구식, 버그)
- 이메일 발송 → /generate → generateWorkbook (구식, 버그)

**후**:
- 모든 경로 → save-all → generateMethodWorkbook (신식, 버그 수정 완료)
- `generateWorkbook.ts` (529줄) 삭제
- `fileExport.ts:generateExcel` dead wrapper 삭제
- `generate/route.ts` 는 엔드포인트 유지 (e2e 호환), 내부 엔진만 교체

**B안 한계 (기록)**:
- `generate` 라우트는 `sheets[0]` 만 처리 (구 동작과 동일)
- 복합+우레탄 동시 시트일 때 generate 라우트는 첫 시트만 처리 — 기존부터 그랬음, 회귀 아님

### 2.5 작업 3 — PDF 가로 변환 (c9)

**원인**: exceljs `readFile/writeBuffer` 가 템플릿 `pageSetup.orientation` 을 유실.

**수정**:
- `generateMethodWorkbook.ts:enforceLandscape()` 헬퍼 — 양 시트에 `orientation='landscape', paperSize=9, fitToPage=true, fitToWidth=1` 명시 강제
- 검증 스크립트 `scripts/verify-landscape.ts` 로 xlsx 속성 확인 완료
- `lib/pdf/generatePdf.ts` puppeteer 경로도 `page.pdf({ landscape: true })` 추가 (e2e 보조)

**Google Drive 변환 경로 동작**:
- xlsx → Google Sheets (pageSetup 존중) → PDF export (landscape 적용)

### 2.6 작업 3b — 샘플 xlsx (c8)

런타임 검증용 `samples/` 폴더 + `scripts/gen-excel-samples.ts`:
- sample-1-basic-8rows.xlsx (기본 8행, 3행 삭제 케이스)
- sample-2-extras-11rows.xlsx (기본+추가 11행, 템플릿 정확 매칭)
- sample-3-fewrows-3rows.xlsx (기본 3행, 8행 삭제 케이스)

**PM UAT 절차**: git pull → samples/*.xlsx 를 엑셀에서 열어 PM 스크린샷 이슈 6건 해결 확인.
UAT 완료 후 samples/ 삭제 예정 (일회성 검증 자료).

---

## §3. 커밋 목록 (Phase 4.5)

| 해시 | 내용 |
|---|---|
| `5df6a34` | c1: 좌 20% 갑지 사이드바 + 우 80% 2탭 — 폼 견적서 |
| `c5e644e` | c2: 동일 적용 — 음성 견적서 |
| `f033f81` | c3: QuickAddChips 제거 + SidePanel DB+런타임 가격 연동 |
| `77c82f1` | c4: SidePanel 공통 컴포넌트 추출 |
| `61d66bb` | c5: CompareView.tsx 삭제 (DEAD CODE) |
| `c367761` | c6: 엑셀 서식 6건 복구 — generateMethodWorkbook |
| `65c80b2` | c7: 엔진 통합 — generateWorkbook 제거, 단일 경로 통일 (B안) |
| `3d70d93` | c8: 런타임 검증 샘플 xlsx 3종 + 생성 스크립트 |
| `a53e893` | c9: PDF 가로 방향 강제 — 작업 3 |
| `515d47e` | docs: v8 프로젝트 상태 + HANDOFF_7 작성 |

(총 10개 커밋, 원격 `origin/feature/11-layout-excel-pdf` 에 푸시됨.)

---

## §4. 검증 결과

### 자동 검증 (로컬 기준)

| 항목 | 결과 |
|---|---|
| TypeScript | 에러 0 |
| Lint | 신규 에러 0 (pre-existing 14건) |
| Tests | 477/477 통과 |
| Build | `/estimate/new` 29.2 kB, 성공 |
| xlsx 샘플 | 3종 생성, landscape 적용 확인 (verify-landscape.ts) |

### 원격 검증 (Vercel 프리뷰)

| 항목 | 결과 |
|---|---|
| 푸시 | `515d47e` → `origin/feature/11-layout-excel-pdf` (성공) |
| **bsmg-v5 프리뷰 빌드** | ❌ **FAILURE** |
| bsmg-v4 프리뷰 빌드 | success (구 프로젝트, 대상 아님) |
| 프리뷰 URL | **미생성** (빌드 실패로) |
| 실패 대시보드 | https://vercel.com/hyuntarellas-projects/bsmg-v5/2bAYm5MSCxzJznfRXNP9vCGzLs1w |
| 추정 원인 | **Vercel Preview 환경변수 누락 (Supabase 3종)** |

### 엑셀 UAT (PM 확인, samples/*.xlsx 대상)

| # | c6 대상 이슈 | 해결? |
|---|---|---|
| 1 | META 라벨 침범 | — (UAT 미전달) |
| 2 | 2줄 내용 행 높이 | ❌ **미해결** (자동 조정 안 됨) |
| 3 | 빈 행 방치 | ❌ **미해결** (갑지 빈 행 3개 잔존) |
| 4 | 로고 이미지 틀어짐 | — |
| 5 | 좌측 정렬 유실 | — |
| 6 | 한글금액 #NAME? | — |
| 신규 | **갑지 공사금액 0 표시** | ❌ 신규 발견, 원인 조사 필요 |
| 신규 | **갑지 페이지 분할** | ❌ 신규 발견, landscape 적용 후 분할 문제 |

**결론**: c6 으로 일부 해결되었으나 4건 미해결. c9 의 landscape 적용으로 새 이슈 유발 가능성 (갑지 페이지 분할).

---

## §5. 절대 유지 (Phase 4.5 내 건드리지 않음)

- `/api/stt`, `/api/tts`, `/api/llm`
- Google Drive 인증 로직 (`lib/gdrive/client.ts`)
- Supabase RLS 정책
- `lib/voice/**` 파싱 로직
- 불러오기 UI (`LoadEstimateModal`) — 페이즈 4.7 별건
- 3프리셋 UI — 페이즈 5 별건

---

## §6. 남은 기술부채 (v7 §13 + Phase 4.5 신규)

기존 (v7 §13):
1. TextInputBar.tsx 파일 잔존 (사용처 0) — 삭제 대상
2. useEstimateVoice.handleText* 죽은 반환 (line 760~920) — 파서 공유 여부 확인 후 제거
3. getAdjustedCost alias — getCostBreakdown 로 교체 후 제거
4. useAutoSave stale closure — ref 재작성
5. EstimateTableWrapper.tsx useCallback 경고 4건 — useMemo 래핑
6. ProposalEditor.tsx img 태그 7건 — next/image 교체
7. vadLogic.test.ts:97 TS 에러 — pre-existing
8. estimate/SettingsPanel.tsx 구 에디터 사용 — 새 카드 에디터로 재배선

Phase 4.5 신규 — **미해결 (다음 세션 재작업 대상)**:
9. **Vercel Preview 환경변수 누락**: bsmg-v5 프리뷰 빌드 FAILURE. Supabase 3종 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) 을 Vercel 프로젝트 > Settings > Environment Variables > Preview 환경에 추가 필요
10. **엑셀 UAT 4건 미해결** (c6/c9 적용 후 PM 확인):
    - 행 높이 자동조정 — `computeRowHeight` 가 충분치 않음. wrapText + 실제 렌더 높이 재산정 필요
    - 갑지 빈 행 3개 제거 — 갑지(Sheet1)엔 아이템 행 없음. 별도 빈 행이 있다는 뜻 — 템플릿 조사 필요
    - 갑지 공사금액 0 원인 조사 — K14/K18 주입 로직 재점검 (c6 의 null 초기화가 값 주입도 날려버렸을 가능성)
    - 갑지 페이지 분할 — c9 landscape 적용 후 갑지 1페이지 초과해 분할되는 이슈. fitToHeight 또는 print area 설정 필요
11. **generate 라우트 sheets[0] 제약**: c7 B안의 부산물. 복합+우레탄 동시일 때 첫 시트만 처리. 별건 페이즈 후보
12. **e2e 테스트 2건**: `/generate` POST 호출. save-all 경로와 중복 테스트 가능성. 정리 필요 (v7 §13 와 함께)
13. **samples/ 폴더**: UAT 완료 후 삭제

---

## §7. 차기 페이즈 후보

v7 §14 기반 + Phase 4.5 효과 반영:

| 페이즈 | 범위 | 우선순위 |
|---|---|---|
| **4.7** | 불러오기 UI 개선 (LoadEstimateModal) | 사장 피드백 확인 후 |
| **5** | 3프리셋 UI 확장 (면적대·우레탄 포함) | 사장 프리셋 사용 긍정 피드백 |
| **6** | findPriceForMargin 음성 견적 단가 역산 재검증 | material_increase_rate 제거 후 |
| **7** | Estimate.address 필드 추가 (J9 현장주소 개선) | J9 정확도 요청 시 |
| **8** | 다중 을지 (복합+우레탄 동시 시트 generate 라우트 처리) | c7 B안 한계 해소 |
| **9** | 관리번호 경쟁 조건 강화 (UNIQUE + 재시도) | 동시 생성 충돌 발생 시 |
| **10** | 모바일/태블릿 반응형 | 현장 태블릿 도입 시 |
| **11** | TextInputBar.tsx 삭제 + useEstimateVoice 죽은 반환 정리 | Phase 10 과 함께 |

---

## §8. 교훈 (Phase 4.5)

### 조사 우선
- "SidePanel 제거" 를 성급히 판단했으나 PM 이 "시각적 UX 우위" 로 반려. 구/신 경로 분석을 **제거 판단 대신 통합 판단** 으로 재구성.
- 향후 기능 중복 발견 시 삭제 전 UX/기능 우위 먼저 비교.

### 엔진 이중화 리스크
- 같은 기능에 구/신 2개 엔진이 공존하면 UI 경로 따라 품질 불균일. 구 경로로 빠진 산출물이 "회귀"로 오인.
- 해결: UI fetch 경로 통일 + 구 엔진 파일 삭제 + 호환용 라우트는 내부 엔진만 교체 (B안).

### 리스크 최소 교체
- generate 라우트를 "건드리지 말라" 는 PM 지시를 "Drive 업로드 블록 보존" 으로 구체화.
- import 2줄 + 호출부 1곳 만 수정, 업로드 로직 블록은 미변경 → 리스크 최소화하며 통합 달성.

---

**END v8**
