# Phase 4.5 Handoff — 레이아웃 + 엑셀 서식 + PDF 가로 (**미완료**)

> Phase 4.5 10개 커밋 원격 푸시됨. Vercel 프리뷰 빌드 실패 + 엑셀 UAT 4건 미해결.
> 다음 세션 = **빌드 복구 + 엑셀 재수정 + 재 UAT + 머지**.

## 직전 상태

- **main 브랜치**: `d9172e4` (v7 상태, 변경 없음)
- **작업 브랜치**: `feature/11-layout-excel-pdf` (**원격 푸시됨, 미머지**)
- **최종 커밋**: `515d47e` (docs)
- **프로젝트 상태 문서**: `bsmg_estimate_final_v8.md`
- **Vercel 프리뷰 빌드**: ❌ FAILURE (bsmg-v5), 원인 추정 = 환경변수 누락

## Phase 4.5 커밋 목록 (10건)

| 해시 | 내용 |
|------|------|
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

## 자동 검증 (로컬)

- TypeScript 에러 0, Lint 신규 에러 0, Tests 477/477, Build 성공
- xlsx 샘플 3종 landscape 검증 완료 (`scripts/verify-landscape.ts`)

## Vercel 원격 검증 결과

- 푸시 성공: `515d47e` → `origin/feature/11-layout-excel-pdf`
- **bsmg-v5 프리뷰 빌드 FAILURE**
- 대시보드: https://vercel.com/hyuntarellas-projects/bsmg-v5/2bAYm5MSCxzJznfRXNP9vCGzLs1w
- 추정 원인: Vercel Preview 환경변수 누락 (Supabase 3종)

## PM UAT 결과 (엑셀 samples/*.xlsx)

4건 미해결 — 다음 세션 재작업 대상:

1. **행 높이 자동조정** — `computeRowHeight` 가 충분치 않음
2. **갑지 빈 행 3개 제거** — 갑지(Sheet1)엔 아이템 행 없어야 함. 별도 빈 행 원인 조사
3. **갑지 공사금액 0 원인 조사** — K14/K18 주입 로직 재점검. c6 의 null 초기화가 값 주입도 날려버렸을 가능성
4. **갑지 페이지 분할** — c9 landscape 적용 후 갑지 1페이지 초과 분할. fitToHeight / print area 설정 필요

---

## 다음 세션 첫 작업 (순서대로)

### STEP 1: Vercel Preview 환경변수 추가

- Vercel 대시보드 > bsmg-v5 프로젝트 > Settings > Environment Variables
- **Preview 환경**에 3종 추가:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 값은 로컬 `.env.local` 에서 복사 (또는 Production 환경에 있으면 그걸 복사)
- Google Drive / OpenAI / Anthropic 관련 키도 누락 여부 확인 필요

### STEP 2: 빌드 재시도

- Vercel 대시보드에서 failed deployment 우클릭 > Redeploy (환경변수 적용)
- 또는 브랜치에 빈 커밋 푸시: `git commit --allow-empty -m "chore: trigger rebuild"`
- 빌드 성공 시 프리뷰 URL 확보

### STEP 3: 엑셀 UAT 4건 재작업

`lib/excel/generateMethodWorkbook.ts` 수정:

1. **행 높이 자동조정**: 현재 `computeRowHeight` 는 품명 길이 기준 정적. 실제 해결책은 wrapText + row.height 를 wrapText 기준 재계산. exceljs 한계일 수 있으므로 LibreOffice 변환 결과 확인 후 추가 대응
2. **갑지 빈 행 3개**: 템플릿 원본 (templates/complex.xlsx, templates/urethane.xlsx) Sheet1 구조를 엑셀로 열어 실제 빈 행 위치 파악 → 주입 전 spliceRows 로 제거
3. **갑지 공사금액 0**: `fillCover` 의 K14/K18 주입 재점검. `totalCell.value = null` 뒤 값 주입 순서 재확인. exceljs 의 null 세팅 후 값 세팅이 한 번에 꺼지는 버그 가능성 → `cell.value = cr.totalBeforeRound` 로 직접 세팅 후 확인
4. **갑지 페이지 분할**: `enforceLandscape` 에 `fitToHeight: 1` 추가 or print area 명시. 현재 `fitToHeight: 0` (무제한) 이어서 갑지가 분할됨

### STEP 4: 재작업 후 샘플 재생성 + 재 UAT

```bash
npx tsx scripts/gen-excel-samples.ts
npx tsx scripts/verify-landscape.ts
git add samples/ && git commit -m "test: 재생성 샘플"
git push
```

PM 이 다시 samples/*.xlsx 열어 4건 재확인.

### STEP 5: 머지 전 정리

UAT 4건 모두 통과 시:

1. **samples/ 폴더 삭제**: `git rm -r samples/ scripts/gen-excel-samples.ts scripts/verify-landscape.ts`
2. `feature/11-layout-excel-pdf` → `main` 머지 (PR 생성: https://github.com/hyuntarella/BSMG-V4/pull/new/feature/11-layout-excel-pdf)
3. main 배포 후 Ctrl+F5 강제 새로고침으로 프로덕션 UAT

## 남은 기술부채 (v8 §6)

v7 §13 기존:
1. TextInputBar.tsx 파일 잔존 (사용처 0)
2. useEstimateVoice.handleText* 죽은 반환
3. getAdjustedCost alias
4. useAutoSave stale closure
5. EstimateTableWrapper.tsx useCallback 경고 4건
6. ProposalEditor.tsx img 태그 7건
7. vadLogic.test.ts:97 TS 에러
8. estimate/SettingsPanel.tsx 구 에디터

Phase 4.5 신규:
9. **PM UAT 미완료** (6건 이슈 해결 여부) → UAT 후 samples/ 삭제
10. **Vercel 프리뷰 PDF UAT** — 실제 Google Drive 변환 결과 확인 필요
11. **generate 라우트 sheets[0] 제약** (c7 B안 부산물) — 다중 을지 필요 시 별건
12. **e2e 테스트 2건 /generate POST** — save-all 로 마이그레이션 고려
13. **samples/ 폴더 삭제** (UAT 완료 후)

## 차기 페이즈 후보 (v8 §7)

| 페이즈 | 범위 | 트리거 |
|---|---|---|
| **4.7** | 불러오기 UI 개선 (LoadEstimateModal) | 사장 피드백 |
| **5** | 3프리셋 UI 확장 (면적대·우레탄 포함) | 프리셋 사용 긍정 피드백 |
| **6** | findPriceForMargin 음성 단가 역산 재검증 | 회귀 확인 필요 시 |
| **7** | Estimate.address 필드 추가 | J9 정확도 이슈 시 |
| **8** | 다중 을지 generate 라우트 (c7 B안 한계 해소) | 이메일 발송에 우레탄 누락 이슈 시 |
| **9** | 관리번호 경쟁 조건 강화 | 동시 생성 충돌 시 |
| **10** | 모바일/태블릿 반응형 | 현장 태블릿 도입 시 |
| **11** | TextInputBar 삭제 + useEstimateVoice 정리 | Phase 10 과 함께 |

## 범위 밖 (Phase 4.5 에서 건드리지 않음)

- `/api/stt`, `/api/tts`, `/api/llm`
- Google Drive 인증 (lib/gdrive/client.ts)
- Supabase RLS 정책
- lib/voice/** 파싱 로직
- 불러오기 UI (LoadEstimateModal)
- 3프리셋 UI
- 바탕조정제 미장 단가 0원 (PM 직접 입력 대상)

## 교훈 (Phase 4.5)

### 조사 우선
- "SidePanel 제거" 를 CC 가 성급히 판단했으나 PM 이 UX 우위로 반려 → 통합 판단으로 재구성. 향후 기능 중복은 삭제 전 UX/기능 우위 비교 필수.

### 엔진 이중화 리스크
- 구/신 경로 공존 시 UI 진입점 따라 품질 불균일. Phase 3-A 에서 `generateMethodWorkbook` 새로 만들며 `generateWorkbook` 를 삭제하지 않아 음성/이메일 저장이 구식 경로로 빠짐. 새 기능 도입 시 구 파일 삭제까지 같은 페이즈에 포함 권장.

### 모호 지시의 구체화
- "건드리지 말라" 같은 포괄 지시는 의도 부연 (Drive 업로드 로직 보존) 으로 구체화. import 교체는 보호 범위 밖으로 해석 가능. CC 가 해석을 제시하고 PM 확정.

---

**END OF HANDOFF — Phase 4.5 COMPLETE (머지 대기)**
