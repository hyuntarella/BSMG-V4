# HANDOFF_TO_NEXT_CHAT_v5.md — 채팅 세션 인계서

> 새 Claude: 이 문서 먼저 흡수. v4 폐기. §14 양식대로 "인수 완료" 보고 후 사장 메시지 대응.
> v4의 §0~§7, §10~§12 전제는 그대로 유지. v5는 H4 종료 시점부터의 차이를 기록한다.
> **2026-04-11 갱신**: H5-1 / 장비exp / H6 / H7 / H7-DEBUG-CLEANUP 반영.

---

## 0. 역할 (v4 §0 유지)
방수명가 bsmg-v5 견적서 시스템 PM. CC(Claude Code)가 실행자. 사장은 복붙 왕복.

## 1. 사용자 (v4 §1 유지)
방수명가 (주)부성에이티 사장. 인간 심리학 전문가, 빠른 학습자, **개발자 아님**. 평균 견적 1,230만원. 한국어. userPreferences: 간결/데이터로 도전/이모지 없음/인건비(노무비 아님).

## 2. 프로젝트 (v4 §2 유지)
Next.js 14 + Supabase + Tailwind. v4 fork. feature/lens-integration 작업 → main merge → Vercel 자동배포. **저장소명 `hyuntarella/BSMG-V4` Public** (저장소 이름만 v4, 내용물은 v5).

Figma: `OLxyy4grM15JV5dvQcuHF6`. 갑지 542:151, **을지 542:744** (-90도 회전).

## 3. 결정 이력 (v4 §3 그대로 + H4 추가분)

v4 §3.1~§3.11 유지. v5 추가:

### 3.12 평단가 현황 — 선택 vs 실제 비교 (확정)
- 표시: "선택 {price_per_pyeong} → 실제 {직접합산} (±{diff}원/m²)"
- **실제 평단가 계산식**: 시트 items 중 필터 통과 항목의 단가합(mat+labor+exp) **직접 합산**
  - 필터: `!is_hidden && !is_equipment && unit !== '식'`
  - **벽체 우레탄(name==='벽체 우레탄')은 제외** — qty=wallM² 별도 항목이라 바닥 평단가 구성에서 빠져야 함
- grand_total/m2 역산 **폐기** (장비·lump·경비가 왜곡)
- 검증: price_matrix_pvalue_seed.json 42조합 전체에서 단가합 == price_per_pyeong 일치
- 위치: detail 탭(복합/우레탄)만. cover/compare 탭 미표시
- 배포 경로: /estimate/edit(V5) + /estimate/new + /estimate/[id](구버전) 세 경로 전부

### 3.13 비교 탭 공종별 단가 테이블 (확정)
- CompareTable 컴포넌트: name 기준 복합↔우레탄 매칭, 한쪽만 있으면 '-'
- 차이 = 우레탄 - 복합. 양수 빨강 / 음수 파랑 / 0 회색
- 필터: `!is_equipment && !is_hidden` (식 항목 포함)
- 기존 CompareCard 요약 카드 **유지**, 그 아래에 테이블 추가 배치
- V5 + 구버전 EstimateEditor 양쪽에 부착

### 3.14 Ctrl+Z 전역 선점 (확정)
- EstimateEditorV5에 window 레벨 keydown 리스너(capture 단계) 설치 — 포커스가 `<input type="number">`여도 네이티브 input undo보다 먼저 선점
- 커스텀 undo는 sheets만 복원, m2 포함 메타 필드는 현재값 유지

### 3.15 폐기물 muted 컬럼 (H5-1 + 장비exp이전 이후, 확정)
- 폐기물처리/드라이비트하부절개/사다리차/스카이차 장비 4종은 구조적으로 **경비(exp) 컬럼** 항목
- 과거 buildItems/applyOverrides fallback 이 labor 에 쓰던 버그는 e0fe46a 에서 전면 수정
- 폐기물처리 기본값 반투명 표시는 **exp 컬럼** 에서만 (isWasteDefaultExp, original_exp 기준)
- 이름 fallback Set (`EQUIPMENT_NAMES`) 으로 is_equipment 플래그 누락 구 데이터 커버

### 3.16 우레탄 0.5mm 기준 단가 맞춤 (H6, 확정)
- CustomerInfoCard 체크박스 제거 → 탭 바 아래 **UrethaneBase05Control** 컴포넌트로 이동
- syncUrethane 재설계: 노출 우레탄 3종 = base05 × {2, 3, 4} 비율
  - 우레탄 1차 = base05 × 2 / 노출우레탄(복합) = base05 × 3 / 우레탄 2차 = base05 × 4
- 벽체/상도는 기존 1:1 복사 유지
- 양쪽 시트 (복합/우레탄) 어느 쪽에서 편집해도 동기화 (EstimateTableWrapper 이벤트 핸들러)
- 두 견적서 나란히 볼 때 두께 대비 단가 3:4:2 비율이 수식으로 보장됨 (사장 신뢰도 목적)

### 3.17 셀 편집 UX (H7, 확정)
- Bug 1: 숫자 셀 편집 진입 시 기존 값 전체선택 — input onFocus select() + useEffect rAF select() 이중 안전장치
- Bug 2: 숫자 입력 시 실시간 천단위 콤마 — lib/utils/format.ts formatNumericEdit
- 저장값은 항상 parseFloat(콤마 제거) 유지

### 3.18 셀 편집 race 오픈 이슈 (H7-DEBUG 이후 재조사 대기)
- 증상 (작성자 보고): 첫 셀 편집 직후 다음 셀 먹통
- d8c6dc5 WIP 에서 시도한 fix 는 브라우저 실측 실패
- H7-DEBUG-CLEANUP 에서 로그 9개만 제거. 방어적 코드(커서 복원, pendingValueRef.row, 단일 클릭 편집)는 유지
- **정적 분석**: 코드 경로상 재현 불가. 이벤트 순서/React 18 batching 모두 정상
- 다음 조사: 브라우저 devtools 로 실제 이벤트 타임라인 수집

## 4. Phase 4I-H4 종료 (완료)

### 4.1 H4 세부 커밋 (main HEAD 6deab19)
| 단계 | 커밋 | 내용 |
|---|---|---|
| H4-1 | 6a345b5 | 표 읽기전용 4열→2열 압축 |
| H4-2 | 164ea57 | useUndoRedo(items) 폐기 → useEstimate.saveSnapshot/undo 통합 |
| H4-2-FIX | 754eeae | undo가 sheets만 복원 (메타 유지) |
| H4-2-CHIP | 6a629d9 | 칩 useEffect 2개 제거, onPriceChange 콜백 경로로 일원화 |
| H4-2-KEYBIND | 697d80b | 전역 Ctrl+Z 인터셉트 (capture) — 진짜 범인 해결 |
| H4-3 ① | dab9f94 | BasePriceBar 신규 (is_base 필터 — 실패) |
| H4-3 ② | 755b70e | is_base 필터 폐기 → m² 주요 공종 필터로 전환 |
| H4-3 ③ | 5b18f29 | /estimate/new, /estimate/[id] 구버전 경로에도 부착 |
| H4-3 ④ | 492d0e8 | 바 재설계 — 선택 vs 실제 비교 형태로 전환 |
| H4-3 ⑤ | ce6601b | 실제 평단가 = items 단가합 직접 합산으로 계산식 교체 |
| H4-3 ⑥ | c31e1c9 | 벽체 우레탄 제외 — 42조합 검증 통과 |
| H4-4 | 637e0f0 | CompareTable 신규 — 공종별 단가 나란히 |
| **merge** | **6deab19** | **main HEAD** (H4-4 Merge feature/lens-integration) |

### 4.2 13개 지적 잔여 (2026-04-11 갱신)
| # | 지적 | 우선 | 단계 |
|---|---|---|---|
| ~~4~~ | ~~편집 원복~~ | ~~P0~~ | ✅ H3 종료 |
| ~~3~~ | ~~단위 1-클릭~~ | ~~P1~~ | ✅ H3 종료 |
| ~~13~~ | ~~표 구조 재설계 (5열)~~ | ~~P1~~ | ✅ H4-1 종료 |
| ~~11~~ | ~~평단가 현황~~ | ~~P1~~ | ✅ H4-3 종료 (6차 수정) |
| ~~12~~ | ~~비교 탭 공종별 단가~~ | ~~P2~~ | ✅ H4-4 종료 |
| ~~Undo~~ | ~~표 셀 undo~~ | ~~P2~~ | ✅ H4-2 KEYBIND 종료 |
| ~~console.log 19개~~ | ~~H3-DEBUG 로그~~ | ~~P0~~ | ✅ **H5-LOGS 종료** (d9cbdbc) |
| ~~1~~ | ~~폐기물 인건비 반투명~~ | ~~P0~~ | ✅ **H5-1 종료** (2f2057b + a9fb5ee + 6109785 + e0fe46a 이후 exp 컬럼 기준) |
| ~~6~~ | ~~우레탄 0.5mm 재설계~~ | ~~P1~~ | ✅ **H6 종료** (cff0dec) |
| ~~셀 편집 UX 2종~~ | ~~전체선택 + 실시간 콤마~~ | ~~P0~~ | ✅ **H7 종료** (f90acf4) |
| ~~[H7-DEBUG] 로그 9개~~ | ~~d8c6dc5 WIP 로그~~ | ~~P0~~ | ✅ **H7-DEBUG-CLEANUP 종료** |
| 10 | 빠른공종추가 칩 | P2 | **잔여** |
| 2 | acdb_entries seed | P2 | **잔여** |
| 5 | Ctrl+F 행 스크롤 제거 | P3 | **잔여** |
| (신규) | 셀 편집 race 브라우저 재조사 | P1 | **잔여** (d8c6dc5 오픈 이슈) |
| 8 | 규칙서 UI | P4 | Phase 5+ |

### 4.3 이 세션 핵심 교훈 (H4 종료)
| 문제 | 해결책 (영구) |
|---|---|
| 평단가 1차 설계가 6번 뒤집힘 (is_base 플래그 기반 설계 → 빈 배열 → 재설계 반복) | **데이터 계층 플래그에 의존하는 설계는 먼저 grep으로 실제 값이 존재하는지 확인** |
| grand_total/m2 역산이 장비/lump/경비에 의해 왜곡 | **"합계/면적" 역산 금지. 의도한 항목만 직접 합산** |
| 벽체 우레탄을 바닥 평단가에 섞어 +9800원 오류 | **price_matrix seed 구조부터 확인 후 합산 필터 설계 (P매트릭스가 진실)** |
| 칩 useEffect + undo 피드백 루프 | **파생 상태는 effect로 동기화하지 말고 사용자 이벤트 경로에서 콜백 1회만** |
| Ctrl+Z가 input 네이티브 undo에 먼저 먹힘 | **전역 단축키는 window capture 단계에서 선점** |

## 5. 박스 양식 v2 (v4 §5 그대로 유지)

```
docs/SESSION_STATE.md 읽고 현재 상태 파악. [Phase명]

━━━ [Phase명] ━━━

━━━ 실행 규칙 ━━━
하네스(bsmg-orchestrator) 강제. 하네스 Phase 4 빌드 검증 후:
1. npm test, 신규 실패 0 (INFER-004 제외)
2. git checkout feature/lens-integration → commit → push
3. git checkout main → git merge feature/lens-integration --no-ff → push origin main
   (**필수. 이거 빼먹으면 프로덕션 반영 안 됨**)
4. sleep 120 → curl -I https://bsmg-v5.vercel.app/estimate/edit
5. curl HTML에서 page-*.js 청크 해시 추출 → 이전과 다른지 확인

━━━ 작업 ━━━
목적: ...
원하는 결과: ...
판단 기준: ...

━━━ 절대 원칙 ━━━
- lib/estimate/buildItems.ts, priceData.ts, calc.ts 로직 변경 금지
- CLAUDE.md, lens 인터페이스 수정 금지

━━━ 보고 양식 ━━━
1~10. 하네스 사이클 + git + Vercel + curl
11. **main HEAD 해시 (필수)**
12. **새 청크 해시 (이전과 다른지)**
13. 사용자 실측 지시
```

## 6. 핵심 원칙 (v4 §6 + H4 추가)

v4 §6 1~20 유지. 추가:
21. **파생 상태(평단가 등)는 "이미 있는 플래그에 의존"하기 전에 grep으로 실제 존재 확인**
22. **금액 합산 계산은 역산(총액/면적) 금지. 의도한 항목만 직접 합산**
23. **파생 값 동기화는 effect 금지. 이벤트 콜백 경로에서 1회만 호출**
24. **전역 단축키(Ctrl+Z 등)는 window capture 단계에서 선점 필수**

## 7. 특별 지적 (v4 §7 유지)

v4 §7.1~§7.12 그대로. v5 추가:

### 7.13 평단가 계산 (H4-3 종료, 건드리지 말 것)
- 필터: `!is_hidden && !is_equipment && unit !== '식' && name !== '벽체 우레탄'`
- 합계 = sum(mat+labor+exp)
- 변경 시 42 price_matrix 조합 전부 재검증 필수

### 7.14 Undo 동작 (H4-2 종료, 건드리지 말 것)
- sheets만 복원, 메타 필드(m2 등)는 현재값 유지
- 전역 window capture 리스너로 Ctrl+Z 선점
- EstimateEditorV5에만 리스너 설치. 중복 설치 금지

## 8. H5 작업 범위 (2026-04-11 갱신)

### 8.1 완료 항목
1. ~~console.log 19개 제거 (H5-LOGS)~~ ✅
2. ~~#1 폐기물 반투명 (H5-1)~~ ✅ — exp 컬럼 기준으로 재조정됨 (e0fe46a 장비exp이전)
3. ~~#6 우레탄 0.5mm 재설계 (H6)~~ ✅ — UrethaneBase05Control + base05 × 배수 공식
4. ~~H7 셀 편집 UX (전체선택 + 실시간 콤마)~~ ✅
5. ~~H7-DEBUG 로그 9개 제거~~ ✅

### 8.2 잔여 항목 (H5 원래 범위 + 신규)
1. **#10 빠른공종추가 칩** (P2) — 칩 클릭 → 공종 추가 UX. useCostChips 구조와 충돌 없는지 먼저 확인
2. **#2 acdb_entries seed** (P2) — 테이블에 데이터 0건. data/acdb-seed.json 기반 시드 스크립트 실행 필요
3. **#5 Ctrl+F 행 스크롤 잔여 확인** (P3) — H3-VERIFY 에서 rowRefs 제거 완료. 잔여 코드 없는지 확인만
4. **셀 편집 race 재조사** (P1, 신규) — d8c6dc5 에서 작성자 브라우저 실측 먹통 보고했으나 정적 분석 재현 불가. 브라우저 devtools 로 실제 이벤트 타임라인 수집 필요

## 9. 환경 (v4 §10 + 업데이트)
- 저장소: `hyuntarella/BSMG-V4` **Public**
- 브랜치: feature/lens-integration 작업 → main merge → Vercel 자동배포
- URL: https://bsmg-v5.vercel.app
- **main HEAD: (커밋 예정, H7-DEBUG-CLEANUP 이후 갱신)**
- 직전 확인 머지: `f90acf4` (H7 Merge feature/h7-cell-ux-fixes)
- 프로젝트 경로: `C:\Users\lazdo\projects\bsmg-v5` (랩탑 교체 후 경로 변경)
- 로컬 브랜치: main

## 10. 컨텍스트 복원 우선순위
1. 이 문서 (v5)
2. docs/SESSION_STATE.md (Phase 4I-H4 종료 상태)
3. GitHub raw fetch로 코드 직접 확인 (필요 시)
4. v4 §7, §12 (상세 원칙)

## 11. 미결 (v4 §12 업데이트)
- ~~H4 진입~~ ✅
- ~~#13 표 구조 5열~~ ✅
- ~~#11 평단가 현황 (6차)~~ ✅
- ~~#12 비교 탭 테이블~~ ✅
- ~~Undo 표 셀 (H4-2-KEYBIND)~~ ✅
- ~~H5-LOGS 디버그 로그 19개~~ ✅
- ~~H5-1 #1 폐기물 반투명 + 장비 readonly~~ ✅
- ~~장비 exp 컬럼 이전 + 마이그레이션 012~~ ✅
- ~~H6 우레탄 0.5mm 재설계~~ ✅
- ~~H7 셀 편집 UX 2종~~ ✅
- ~~H7-DEBUG 로그 9개 제거~~ ✅
- **잔여**: #10 빠른공종 칩 / #2 acdb seed / #5 Ctrl+F 잔여 / 셀 편집 race 브라우저 재조사
- price_matrix 20평이하/우레탄 (Phase 10)
- price_matrix effective_from 2026-04-08 → Phase 10
- 음성 → 폼 escalation 트리거 (Phase 8)
- 외벽/주차장 자동화 (Phase 4.6+)
- tests/voice/vadLogic.test.ts "speaking" VoiceStatus 타입 에러 1건 (별도 처리)

## 12. 마지막 상태 (이 세션 종료 시점: 2026-04-11 H7-DEBUG-CLEANUP)
- Phase 4I-H4 종료 (2026-04-10) → H5-LOGS / H5-1 / 장비exp / H6 / H7 / H7-DEBUG-CLEANUP 이어짐
- **main HEAD**: (H7-DEBUG-CLEANUP 머지 이후 갱신)
- 테스트: 478/478 통과
- Build/Lint: 클린 (경고만, 사전 존재)
- 다음 작업 후보:
  1. 셀 편집 race 브라우저 실측 + devtools 타임라인 수집 (최우선 — UX 차단)
  2. #10 빠른공종 추가 칩
  3. #2 acdb_entries seed 데이터 적재
  4. #5 Ctrl+F 잔여 확인 (거의 자동 pass 예상)

## 13. 파일 위치 정보 (2026-04-11 갱신 — 랩탑 교체 후 경로)
- SESSION_STATE: `C:\Users\lazdo\projects\bsmg-v5\docs\SESSION_STATE.md`
- 이 인계서: `C:\Users\lazdo\projects\bsmg-v5\docs\HANDOFF_TO_NEXT_CHAT_v5.md`
- 프로젝트 규칙: `C:\Users\lazdo\projects\bsmg-v5\CLAUDE.md` (수정 금지)
- 지시서: `C:\Users\lazdo\projects\bsmg-v5\docs\SYSTEM_BUILD_SPEC.md`
- lens 인터페이스: `C:\Users\lazdo\projects\bsmg-v5\docs\brief-quote.md` §4

## 14. 새 채팅 첫 응답 양식

```markdown
## 인수 완료

### 프로젝트 파악
- bsmg-v5, Phase 4I 후반 (H4 종료 → H5-1 → 장비exp → H6 → H7 → H7-DEBUG-CLEANUP)
- main HEAD: (최신 확인 필요 — git log 1개)
- Vercel: https://bsmg-v5.vercel.app
- 저장소 Public: hyuntarella/BSMG-V4

### 핵심 교훈 적용 (H4 + H5~H7 누적)
- 파생 상태는 effect 금지, 이벤트 콜백 1회 (H4-2-CHIP)
- 합산 계산은 역산 금지, 의도 항목 직접 합산 (H4-3)
- 전역 단축키 window capture 선점 (H4-2-KEYBIND)
- 플래그 의존 설계 전 grep 확인 (H4-3)
- 장비 4종은 경비(exp) 컬럼 — labor 에 쓰면 안 됨 (장비exp이전)
- 우레탄 0.5mm 는 base05 × 배수 공식 (H6)

### 잔여 작업
1. 셀 편집 race 브라우저 재조사 (최우선 — UX 차단)
2. #10 빠른공종 칩
3. #2 acdb_entries seed
4. #5 Ctrl+F 잔여 확인

### 대기
사장 지시 받으면 해당 항목 박스 작성 → CC → 실측 → 다음 항목
```

**END v5**
