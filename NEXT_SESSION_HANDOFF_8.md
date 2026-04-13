# Phase 5 Handoff — Google Sheets 엔진 전환 (**COMPLETE + MERGED**)

> Phase 4.5 머지 후 프로덕션 회귀 3건을 hotfix + Phase 5 (구글시트 전환) 로 일괄 해소 (2026-04-13).
> 이 문서는 다음 세션을 위한 인계 + 남아있는 조사/부채 항목.

## 머지 완료 상태

- **main squash commits (2건)**:
  - `d55bce1` — Hotfix/pdf landscape permission (#2)
  - `c2b45f7` — Phase 5: Google Sheets 네이티브 템플릿 엔진 — save-all 전환 (#3)
- **Production deployment**: `dpl_4porXuChkHErcZPGP1WfvqGcULS3` (READY, 2026-04-13)
- **Production URL**: https://bsmg-v5.vercel.app
- **작업 브랜치**: `hotfix/pdf-landscape-permission`, `feature/12-gsheets-template` — origin 잔존 (필요 시 삭제)

## Phase 4.5 머지 후 프로덕션 회귀 3건

| # | 증상 | 해결 경로 |
|---|------|----------|
| [1] | PDF 세로 방향 (A4 landscape 실패) | hotfix c1 (`d55bce1`) — `docs.google.com/spreadsheets/export?portrait=false&scale=4` URL 전환 |
| [2] | 엑셀 서식 이상 (행 높이 튀김, 열 너비 불일치, 특기사항 빨간 볼드 유실, #NAME? 등) | Phase 5 (`c2b45f7`) — 엔진 자체 교체로 일괄 해소 |
| [3] | PDF 볼 때 구글 로그인 요구 | hotfix c2 (`d55bce1`) — `ensureAnyoneReader` 헬퍼, `permissions.create(anyone reader)` |

## Phase 5 작업 요약

### 엔진 전환
- `save-all/route.ts`: ExcelJS 기반 `generateMethodExcel` + `convertXlsxToPdf` → Google Sheets 기반 `generateGSheetEstimate`
- 흐름: `drive.files.copy(템플릿)` → `spreadsheets.batchUpdate(구조+서식)` → `spreadsheets.values.batchUpdate(값)` → PDF + xlsx export → 사본 삭제
- 응답 contract 동일 (`compositePdfUrl` 등), DB 컬럼 변화 없음

### 신규 모듈
- `lib/gsheets/client.ts`, `lib/gsheets/generate.ts`
- `tests/gsheets/generate.test.ts` — 4 케이스 mock 단위 테스트
- `scripts/gsheets-uat.ts` — production-uat 패턴 통합 UAT

### 환경변수 (PM Vercel 3환경 추가 완료)
- `GOOGLE_SHEETS_TEMPLATE_COMPLEX_ID=1pJ7bV_vp8iudqRl6nxFn3LJ_MwVTxGKef4FKBsQTqUM`
- `GOOGLE_SHEETS_TEMPLATE_URETHANE_ID=1j7jNkPZWqTx12ZtYxUi6ONMifar4N3ZlExS6CqWEdoM`

### UAT 4회 반복 + 회귀 4건 즉시 fix
| UAT | 결과 | 회귀 | 조치 커밋 |
|-----|------|------|----------|
| 1 | 자동 PASS, PM 검증 → 회귀 3건 | [1] 품명 wrap, [2] #NAME?, [3] 빨간 볼드 유실 | `bef7f05` |
| 2 | 자동 PASS, PM 검증 → 회귀 1건 | [4] 한글금액 vs 합계 100K 차이 | `d71526c` |
| 3 | 자동 PASS, PM 검증 PASS | — | — |

### 해결 기법 (Phase 5 내부 fix)
- [1] `repeatCell` 로 B7..B(7+N-1) `wrapStrategy=WRAP` 강제
- [2] `NUMBERSTRING` 이 Google Sheets 미지원 (Excel 한국어판 전용) — `toKoreanAmount` 직접 주입
- [3] `values.batchUpdate` 가 `textFormatRuns` 미보존 — D19 는 별도 `updateCells` 로 RichText 명시
- [4] JS `calc()` (장비 제외 base) vs Sheet 수식 (장비 포함 base) — M19/M20 만 `cr.overhead`/`cr.profit` 정적 주입

### 자동 검증 (로컬)
- TypeScript 에러 0, Lint 신규 에러 0, Build 성공
- 회귀 가드: `tests/gsheets/generate.test.ts` (repeatCell, E11 한글금액, D19 미포함, insertDimension, 사본 정리)

## 보존된 xlsx 엔진 (별 경로 사용)

Phase 5 는 `save-all/route.ts` 만 교체. 아래 경로는 xlsx 엔진 계속 사용:

- `app/api/estimates/[id]/export/route.ts` — 공법별 XLSX/PDF 다운로드 버튼
- `lib/excel/generateMethodWorkbook.ts` — xlsx 생성 엔진 (보존)
- `lib/gdrive/convert.ts` — xlsx → PDF Drive export (보존)

**차기 정리 후보**:
- `/export` 경로도 `lib/gsheets/generate.ts` 로 통합 (엔진 단일화, xlsx 코드 제거) — Phase 5.1 후보
- 또는 `/export` 경로를 제거 (SaveButton 에서 Drive URL 로 직접 다운로드 이미 가능)

## 🚨 미결 항목 (Phase 4.5 에서 인계된 조사)

### Production TEST_MODE 우회 취약 (Apr 9 → Apr 13)

`NEXT_SESSION_HANDOFF_7.md` 참조. 복구는 완료됐지만 추적 조사 4건 미결:

1. 언제/왜 Apr 9 에 TEST_MODE=true 가 Production 에 설정되었는지
2. 노출 기간 동안 실제 무단 접근 이력 (Supabase 로그 / Drive audit)
3. 재발 방지 — `middleware.ts` 에 런타임 guard 추가 (`NODE_ENV==='production' && TEST_MODE==='true'` 감지 시 throw)
4. 대체 UAT 경로 — `VERCEL_AUTOMATION_BYPASS_SECRET` 헤더 방식으로 Preview 접근 (TEST_MODE 의존성 제거)

### Preview 환경의 TEST_MODE=true 유지

- Phase 5 UAT 에서도 `VERCEL_SHARE` + `_vercel_share` 쿼리 방식으로 인증 우회 (bypass secret 아님)
- 차기 페이즈에서 bypass secret 으로 전환하면 Preview 의 TEST_MODE 도 제거 가능

## 🧭 다음 세션 진입점

### Phase 6 후보 (우선순위 미확정)

| 후보 | 범위 | 추정 |
|------|------|------|
| **TEST_MODE 추적 + guard** | Apr 9 원인 규명 + production 런타임 guard + bypass secret 도입 | 0.5~1일 |
| **xlsx 엔진 통합 (5.1)** | `/export` 도 Sheets 로 전환 → xlsx 코드 완전 제거 | 0.5일 |
| **PDF buffer stream** | Drive anyone reader 보안 절충을 완전 해결 — Drive 에는 보관만, 클라이언트에는 buffer stream | 1~2일 |
| **CRM / 다음 비즈니스 기능** | PM 로드맵 참조 | — |

### 운영 상태 (2026-04-13 머지 시점)
- Phase 4.5 의 3건 회귀 모두 해결
- Google Sheets 엔진이 save-all 유일 경로 — xlsx 부채 청산
- 일 견적서 10-30건 (quota 여유 충분)
- Drive 폴더 정리 완료 (UAT 잔재 13 파일 + Supabase 3 estimate 삭제됨)

### 현재 살아있는 브랜치 (정리 후보)
```
origin/hotfix/pdf-landscape-permission  # 머지됨
origin/feature/12-gsheets-template      # 머지됨
```
필요시 로컬+origin 삭제:
```
git branch -d hotfix/pdf-landscape-permission feature/12-gsheets-template
git push origin --delete hotfix/pdf-landscape-permission feature/12-gsheets-template
```

## 참조 문서

- `NEXT_SESSION_HANDOFF_7.md` — Phase 4.5 완료 + TEST_MODE 미결 조사
- `bsmg_estimate_final_v8.md` — 프로젝트 스냅샷 (Phase 4.5 기준)
- `CLAUDE.md` §3 — 검증 프로토콜 (구체 증거 기반, 자가 평가 금지)

---

🤖 Generated with Claude Code
