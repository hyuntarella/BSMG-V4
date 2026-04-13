# Phase 4.5 완료 Handoff — 레이아웃 + 엑셀 서식 + PDF 가로

> Phase 4.5 종료. 브랜치 `feature/11-layout-excel-pdf` 커밋 9건. 머지 전 PM UAT 대기.

## 직전 상태

- **기준 브랜치**: `main` (v7 상태, HEAD `d9172e4`)
- **Phase 4.5 브랜치**: `feature/11-layout-excel-pdf` (**미머지**)
- **최종 커밋**: `a53e893`
- **프로젝트 상태 문서**: `bsmg_estimate_final_v8.md`

## Phase 4.5 커밋 목록 (9건)

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

## 검증 결과 (자동)

- TypeScript: 에러 0
- Lint: 신규 에러 0 (pre-existing 경고 14건만)
- Tests: 477/477 통과
- Build: `/estimate/new` 29.2 kB, 성공
- xlsx 샘플 3종: landscape 적용 검증 완료 (`scripts/verify-landscape.ts`)

## 다음 세션 진입 시 체크리스트

1. **브랜치 확인**: `git status` — 현재 `feature/11-layout-excel-pdf` 인지
2. **UAT 결과 확인**: PM 이 `samples/*.xlsx` 3종 엑셀로 열어봤는지
3. **미해결 피드백 수집**: 6건 이슈 중 어느 것이 여전히 재현되는지 정확히 파악

## PM UAT 절차 (다음 세션 우선순위)

### UAT-1: xlsx 서식 6건 (c6 효과 확인)

`samples/` 폴더의 3개 xlsx 를 엑셀에서 열어 확인:

| # | 이슈 | 확인 방법 |
|---|---|---|
| 1 | META 라벨 침범 | 갑지 Sheet1 의 "관리번호"/"견적일"/"FAX" 라벨 영역에 값이 침범하는지 |
| 2 | 2줄 행 높이 | 을지 Sheet2 의 "줄눈·크랙 실란트 보강포", "중도 1mm(2회)" 행이 잘리지 않는지 |
| 3 | 빈 행 방치 | sample-3-fewrows (3행) 의 을지에 빈 행이 남아있는지 |
| 4 | 로고 이미지 | 방수명가 로고/브랜드 이미지 위치/크기 틀어졌는지 |
| 5 | 좌측 정렬 | 관리번호/견적일 등 값이 좌측 정렬인지 |
| 6 | 한글금액 | E11 셀에 `#NAME?` 대신 "일금 XXX원 정(₩X,XXX,XXX)" 표시되는지 |

### UAT-2: PDF 가로 (c9 효과 확인)

로컬 xlsx 만으로는 Google Drive 변환 결과를 알 수 없음. 다음 중 택1:

- **A. Vercel 프리뷰 배포**: `feature/11-layout-excel-pdf` 푸시 → Vercel 자동 프리뷰 URL → `/estimate/new` 에서 실제 저장 → Google Drive 에 생성된 PDF 가 가로 방향인지
- **B. 수동 GAS/Drive 스크립트**: xlsx 업로드 → Google Sheets 변환 → PDF export

### UAT-3: 레이아웃 2건 (작업 1 효과 확인)

Vercel 프리뷰 배포 후 브라우저에서:

- `/estimate/new` (음성 견적서) + `/estimate/edit` (폼 견적서) 둘 다 확인
- 좌측 296px CompareSidebar 가 상시 노출되며 내부 스크롤 되는지
- 우측 2탭 (복합/우레탄) 만 표시되고 갑지·검수 탭 사라졌는지
- /settings FavoritesEditor 에서 칩 추가 → 견적서 재진입 시 SidePanel 에 반영되는지

## 머지 전 반드시 처리

UAT 전부 통과 후:

1. **samples/ 폴더 삭제**: `git rm -r samples/` (일회성 검증 자료)
2. `feature/11-layout-excel-pdf` → `main` 머지
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
