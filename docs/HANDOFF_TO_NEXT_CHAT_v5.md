# HANDOFF_TO_NEXT_CHAT_v5.md — 채팅 세션 인계서

> 새 Claude: 이 문서 먼저 흡수. v4 폐기. §14 양식대로 "인수 완료" 보고 후 사장 메시지 대응.
> v4의 §0~§7, §10~§12 전제는 그대로 유지. v5는 H4 종료 시점에서의 차이만 기록한다.

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

### 4.2 13개 지적 잔여
| # | 지적 | 우선 | 단계 |
|---|---|---|---|
| ~~4~~ | ~~편집 원복~~ | ~~P0~~ | ✅ H3 종료 |
| ~~3~~ | ~~단위 1-클릭~~ | ~~P1~~ | ✅ H3 종료 |
| ~~13~~ | ~~표 구조 재설계 (5열)~~ | ~~P1~~ | ✅ H4-1 종료 |
| ~~11~~ | ~~평단가 현황~~ | ~~P1~~ | ✅ H4-3 종료 (6차 수정) |
| ~~12~~ | ~~비교 탭 공종별 단가~~ | ~~P2~~ | ✅ H4-4 종료 |
| ~~Undo~~ | ~~표 셀 undo~~ | ~~P2~~ | ✅ H4-2 KEYBIND 종료 |
| 1 | 폐기물 인건비 20만 반투명 | P0 | **H5** |
| 6 | 우레탄 0.5mm 체크박스 재검증 | P1 | **H5** |
| 10 | 빠른공종추가 칩 | P2 | **H5** |
| 2 | acdb_entries seed | P2 | **H5** |
| 5 | Ctrl+F 행 스크롤 제거 | P3 | **H5** (v4 §9에서 H6였으나 H5로 흡수) |
| — | **console.log 19개 제거 (기술부채)** | P0 | **H5 1차 작업** |
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

## 8. H5 작업 범위

### 8.1 포함 항목 (6개)
1. **console.log 19개 제거 (기술부채 P0)** — H3-DEBUG에서 삽입된 [CELL]/[USE_EST]/[RECALC]/[MARK_EDITED]/[BUILD]/[EDITOR]/[WRAPPER] 로그 전부 제거
   - 파일: ExcelCell.tsx(4), useEstimate.ts(4), tableLogic.ts(4), buildItems.ts(2), EstimateEditorV5.tsx(1), EstimateTableWrapper.tsx(2), ExcelLikeTable.tsx(2)
   - 로직 변경 0, 순수 삭제만
2. **#1 폐기물 인건비 20만 반투명** (P0) — 폐기물 항목의 인건비 셀 반투명 처리 (사장 지시)
3. **#6 우레탄 0.5mm 체크박스 재검증** (P1) — CustomerInfoCard 토글, sync_urethane 경로 재검증
4. **#10 빠른공종추가 칩** (P2) — 칩 클릭 → 공종 추가 UX
5. **#2 acdb_entries seed** (P2) — acdb 자동완성 데이터 부재 문제 해결
6. **#5 Ctrl+F 행 스크롤 제거** (P3) — H3-VERIFY에서 이미 처리됨 (rowRefs 제거) 확인만 / 잔여 코드 있으면 제거

### 8.2 H5 박스 작성 전 PM 확인 필요
- 박스 1번은 console.log 19개 제거만 단일 스코프로 실행 (다른 기능과 섞지 말 것)
- #6 우레탄 체크박스는 코드 경로 먼저 확인 — sync_urethane 플래그가 실제로 반영되는지 useEstimate에서 추적
- #10 칩은 H4-2-CHIP의 useCostChips 구조와 충돌 없는지 확인

## 9. 환경 (v4 §10 + 업데이트)
- 저장소: `hyuntarella/BSMG-V4` **Public**
- 브랜치: feature/lens-integration 작업 → main merge → Vercel 자동배포
- URL: https://bsmg-v5.vercel.app
- **main HEAD: `6deab19`** (H4 종료 시점, H4-4 Merge)
- 프로젝트 경로: `C:\Users\나\bsmg-v5`
- 로컬 브랜치: main (H4-4 merge 반영)

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
- **H5 진입 대기**. 순서: console.log 제거 → #1 → #6 → #10 → #2 → #5
- price_matrix 20평이하/우레탄 (Phase 10)
- price_matrix effective_from 2026-04-08 → Phase 10
- 음성 → 폼 escalation 트리거 (Phase 8)
- 외벽/주차장 자동화 (Phase 4.6+)

## 12. 마지막 상태 (이 세션 종료 시점)
- Phase 4I-H4 **종료 선언** (2026-04-10)
- H5 진입 준비
- main HEAD: `6deab19`
- 테스트: 452/453 통과 (INFER-004 Phase 8 이월, 기존과 동일)
- 다음 작업: **H5 박스 작성**. 순서:
  1. PM이 먼저 `console.log('[` 19개 위치 grep → 단일 삭제 박스 작성
  2. PM이 폐기물(#1) 인건비 20만 반투명 위치 확인 (buildItems의 폐기물 생성 경로)
  3. #6 우레탄 체크박스 코드 경로 raw fetch로 재검증
  4. 박스 작성 → CC → 실측 → 반영

## 13. 파일 위치 정보
- SESSION_STATE: `C:\Users\나\bsmg-v5\docs\SESSION_STATE.md`
- 이 인계서: `C:\Users\나\bsmg-v5\docs\HANDOFF_TO_NEXT_CHAT_v5.md`
- 프로젝트 규칙: `C:\Users\나\bsmg-v5\CLAUDE.md` (수정 금지)
- 지시서: `C:\Users\나\bsmg-v5\docs\SYSTEM_BUILD_SPEC.md`
- lens 인터페이스: `C:\Users\나\bsmg-v5\docs\brief-quote.md` §4

## 14. 새 채팅 첫 응답 양식

```markdown
## 인수 완료

### 프로젝트 파악
- bsmg-v5, Phase 4I-H4 종료, H5 진입 준비
- main HEAD: 6deab19
- Vercel: https://bsmg-v5.vercel.app (정상)
- 저장소 Public: hyuntarella/BSMG-V4

### H4 종료 확인
- H4-1 표 2열 압축 / H4-2 undo 통합 / H4-3 평단가 현황(6차) / H4-4 비교 탭 테이블 전부 main 반영
- 13개 지적 중 #13/#11/#12/Undo 종결. H5 이월 6개

### 이번 세션 핵심 교훈 적용
- 파생 상태는 effect 금지, 이벤트 콜백 1회
- 합산 계산은 역산 금지, 의도 항목 직접 합산
- 전역 단축키 window capture 선점
- 플래그 의존 설계 전 grep으로 실제 값 존재 확인

### H5 작업 범위
- console.log 19개 제거 (기술부채 P0, 1차)
- #1 폐기물 인건비 20만 반투명 (P0)
- #6 우레탄 0.5mm 체크박스 재검증 (P1)
- #10 빠른공종추가 칩 (P2)
- #2 acdb_entries seed (P2)
- #5 Ctrl+F 행 스크롤 잔여 확인 (P3)

### 대기
사장이 H5 시작 지시하면 → PM이 먼저 `console.log('[` 19개 위치 grep →
단일 삭제 박스 작성 → CC → 실측 → 다음 항목
```

**END v5**
