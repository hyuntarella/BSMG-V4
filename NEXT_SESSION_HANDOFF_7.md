# Phase 4.5 Handoff — 레이아웃 + 엑셀 서식 + PDF 가로 (**COMPLETE + MERGED**)

> Phase 4.5 전체 작업 + UAT + 머지 + 프로덕션 배포 완료 (2026-04-13).
> 이 문서는 다음 세션을 위한 인계 + TEST_MODE 추적 조사 미결 항목.

## 머지 완료 상태

- **main 브랜치 squash commit**: `903a9b5` (`Phase 4.5: 레이아웃 재구성 + 엑셀 서식 복구 + PDF 가로 (#1)`)
- **Production deployment**: `dpl_7QMdzDKLPJrtccHL1WbyeiMZHFG7` (READY, 2026-04-13 20:27)
- **Production URL**: https://bsmg-v5.vercel.app
- **작업 브랜치**: `feature/11-layout-excel-pdf` — 로컬+origin 삭제 완료
- **PR**: https://github.com/hyuntarella/BSMG-V4/pull/1 (merged)
- **프로젝트 상태 문서**: `bsmg_estimate_final_v8.md` — COMPLETE 마킹

## Phase 4.5 작업 요약 (squash 전 24 커밋 → main 1 커밋)

| 상 | 범위 |
|------|------|
| c1~c5 | 레이아웃 재구성: 좌 20% 갑지 사이드바 + 우 80% 2탭 + SidePanel 공통화 + dead code 삭제 |
| c6~c9 | 엑셀 엔진 통합 + 서식 6건 복구 + PDF 가로 |
| c10~c15 | PM UAT 4건 + 2건 재수정: 갑지 공사금액/빈 행/페이지 분할/행 높이/한글 폭/scale |
| UAT | 프로덕션 Google Drive 경로 통과 (2페이지, 짤림 없음) |

## 자동 검증 (로컬) — 머지 직전 상태

- TypeScript 에러 0, Lint 신규 에러 0, Build 성공
- 회귀 가드: `tests/excel/generateMethodWorkbook.test.ts` (K14/K15/E11 grandTotal 반영, B15='합 계', splice rowCount 24)

## 프로덕션 UAT 결과 (통과)

`scripts/production-uat.ts` (머지 전 삭제됨) 로 프로덕션 save-all 경로 실측:
- 갑지 공사금액 정상 (K14=24,888,700, K15=24,800,000, E11 한글금액)
- 갑지 빈 행 없음, 1페이지 수렴 (fitToHeight=1)
- 을지 2페이지 내 수렴 (fitToHeight=2, scale=61), 11행 전부 표시
- 2줄/3줄 품명 전부 짤림 없음
- cleanup: Drive 3 파일 + Supabase row 전부 삭제, orphan 0

---

## 🚨 미결 조사: Production TEST_MODE 우회 취약 (Apr 9 → Apr 13)

Phase 4.5 UAT 준비 중 **Production 환경에 `TEST_MODE=true` 가 설정되어 있음** 발견. Apr 9 부터 설정된 것으로 PM 이 확인. Apr 13 즉시 삭제 + 재배포 완료.

### 현재 상태 (복구 완료)

- Production env `TEST_MODE` 삭제 + main 빈 커밋 (`edb5758`) → 재배포 (`dpl_Cuiuo1bHuNXVVdahrjNcqSBwUL2w`)
- 검증 완료:
  - `POST https://bsmg-v5.vercel.app/api/estimates/*/save-all` (쿠키 없이) → **307 /login**
  - main branch alias → **401** (Vercel auth)
- **Preview 환경의 `TEST_MODE=true` 는 유지** (UAT 재사용). 차기 페이즈 때 별도 UAT 토큰/IP allowlist 도입 검토.

### 미결 조사 항목 (다음 세션 후보)

1. **언제/왜 Apr 9 에 TEST_MODE=true 가 Production 에 설정되었는지 추적** — git log / Vercel audit log 확인
2. **노출 기간 동안 실제 무단 접근 이력 있는지** — Supabase 접근 로그 / Drive audit log 점검
3. **재발 방지 — 프로덕션 env 가 인증 우회 flag 를 가지지 않도록 런타임 guard 추가 검토** (`middleware.ts` 에서 `NODE_ENV==='production' && TEST_MODE==='true'` 감지 시 throw)
4. **대체 UAT 경로** — `VERCEL_AUTOMATION_BYPASS_SECRET` + `x-vercel-protection-bypass` 헤더 방식으로 Preview 접근 (TEST_MODE 의존성 제거)

---

## 프로덕션 UAT 확인 (PM)

머지 직후 Ctrl+F5 강제 새로고침 후 음성/폼 견적서 작성 → save-all → 생성된 PDF 가 UAT 샘플과 동일 품질인지 확인 권장.

## 남은 기술부채 (v8 §6)

v7 §13 기존 (미해결 유지):
1. TextInputBar.tsx 파일 잔존 (사용처 0)
2. useEstimateVoice.handleText* 죽은 반환
3. getAdjustedCost alias
4. useAutoSave stale closure
5. EstimateTableWrapper.tsx useCallback 경고 4건
6. ProposalEditor.tsx img 태그 7건
7. vadLogic.test.ts:97 TS 에러
8. estimate/SettingsPanel.tsx 구 에디터

Phase 4.5 완료 후 잔존:
9. **generate 라우트 sheets[0] 제약** (c7 B안 부산물) — 다중 을지 필요 시 별건
10. **e2e 테스트 2건 /generate POST** — save-all 로 마이그레이션 고려
11. **Production TEST_MODE 취약 Apr 9 추적** (상단 🚨 섹션) — Vercel audit + Supabase 접근 로그 점검 필요
12. **middleware 런타임 guard** — NODE_ENV=production 시 TEST_MODE 감지 throw 추가 검토

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

**END OF HANDOFF — Phase 4.5 COMPLETE + MERGED (main `903a9b5`, prod `dpl_7QMdzDKLPJrtccHL1WbyeiMZHFG7`)**
