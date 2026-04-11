# HANDOFF_TO_NEXT_CHAT_v5.md — 채팅 세션 인계서

> 새 Claude: 이 문서 먼저 흡수. v4 폐기. §14 양식대로 "인수 완료" 보고 후 사장 메시지 대응.
> v4의 §0~§7, §10~§12 전제는 그대로 유지. v5는 H4 종료 시점부터의 차이를 기록한다.
> **2026-04-11 갱신**: H5-1 / 장비exp / H6 / H7 / H7-DEBUG-CLEANUP / H8 / #10 / #11 / 규칙서재설계 / **#12 (단가표 3단계 드릴다운 + acdb seed 519건 재주입)** 반영.

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

### 3.18 셀 편집 race — H8 에서 해소됨 (사용자 실측 통과)
- H7-DEBUG-CLEANUP 시점에서는 race 재조사 오픈 이슈로 기록
- H8 에서 셀 클릭 편집 진입 UX 전면 재설계 하면서 **구조적 차단**:
  - ExcelCell useEffect deps 에서 `value` 제거 → 편집 중 외부 value 변경이 editValue 리셋하지 않음
  - d8c6dc5 작성자가 의심했던 후보 1번 ("sync_urethane 재계산 → useEffect 재실행 → editValue 리셋") 이 원인이었을 가능성 높음
- 사용자 실측 통과 (2026-04-11 "다 됨")

### 3.20 BASE 장비 4종 제거 + 빠른공종 칩 (#10, 확정 — 기존 8공종 단가 로직 건드리지 말 것)
**사장 요구** (#10 진입 시점):
- BASE는 방수 공종만 남기고 장비·보조는 빠른추가 칩으로 옮긴다.
- 표 하단 "행 추가" 버튼 **위**에 카테고리별 칩. 클릭 1번으로 즉시 행 추가 (추가 클릭 없음).
- acdb-seed.json 을 DB에 주입해서 칩 단가 베이크의 근거로 삼는다.

**확정 구조**:
- `COMPLEX_BASE` 8개 (방수 공종만), `URETHANE_BASE` 7개. 장비 4종(사다리차/스카이차/폐기물처리비/드라이비트하부절개) BASE에서 제거.
- 장비 옵션(ladder/sky/waste/dryvit)은 `buildItems.appendEquipmentRows`가 BASE 빌드 후 동적으로 행 추가. `applyOverrides`는 더 이상 장비 건드리지 않음 (signature: `{ wallM2 }` 만 받음).
- P매트릭스 seed 2종 모두 8/7 슬롯으로 축소. 기존 장비 슬롯이 `[0,0,0]` placeholder였던 덕에 `slice(0, 8|7)`로 안전 축소. 기존 견적 재현 가능.
- `calc.ts` 완전 불변 — `is_equipment` 플래그 기반 overhead/profit 제외 로직 재사용.
- migration `013_remove_equipment_from_base.sql` + `supabase/run-migration-013.ts` (supabase CLI 미링크 환경용 supabase-js 러너).

**칩 정의 (1dd90a6 정리 이후)**: `lib/estimate/quickChipConfig.ts`
| 카테고리 | 칩 | 단가 소스 |
|---|---|---|
| 장비·인력 (6) | 사다리차/폐기물처리비/스카이차/포크레인(대)/크레인(대)/로프공(인) | DEFAULT_EQUIPMENT_PRICES 3종 + acdb median 3종 |
| 보수·추가 (3) | 바탕조정제 부분미장(식)/드라이비트 하부절개(식)/드라이비트 부분절개(식) | 전부 0 — 사용자 직접 입력 |

- 폐기물처리 → **폐기물처리비** 전 코드 리네임. EQUIPMENT_NAMES set 에 두 이름 모두 포함하여 구 데이터 호환.
- 바탕조정제 부분미장: acdb median(n=2 → 10,500원)이 이상치라 0으로 리셋. 사용자가 lump 금액 직접 입력.
- 드라이비트 하부절개/부분절개: acdb 미존재 → 0, 사용자 입력.
- 삭제된 칩(이전 #10 1차본): 크랙보수, 옥탑방수, 데크철거, 화단흙제거, 화단철거, 배수구처리, 트렌치설치 — 사용 빈도 낮고 acdb 노이즈 많아 정리.
- UNIT_OPTIONS 갱신(ExcelLikeTable): `m²/식/일/대/인/m/EA/SET` (평/본/회 제거, 대/인 추가).
- 추후 외벽/주차장 칩은 구현 제외, quickChipConfig.ts 주석에 확장 지점 명시

**acdb seed 주입**: `supabase/seed.ts.importAcdbSeed()` — 519 rows upsert, 단위 `㎡`→`m²` 정규화, company_id+canon unique 기준.

**건드리지 말 것**:
- 기존 8공종 단가 계산식 (BASE/P매트릭스/calc)
- `is_equipment` 플래그 — overhead/profit 제외 로직의 핵심
- migration 013 파괴적 DELETE — 재적용 시 운영 데이터 손실 주의

**커밋**:
- `0d7ad23` feat(#10): BASE 장비 4종 제거 + 빠른공종추가 칩 + acdb seed 주입
- `1dd90a6` fix(#10): 빠른공종 칩 정리 + 폐기물처리비 리네임 + UNIT_OPTIONS 갱신

### 3.22 칩 추가 행 삭제 버튼 + is_base 가드 핫픽스 (#11, 확정 — 건드리지 말 것)
**사장 요구**: 기본 8공종(is_base=true)은 숨김만, 칩으로 추가한 공종(is_base=false)에는 휴지통 버튼 표시. 잠금/숨김 옆 배치. 삭제 시 행 제거 + 합계 재계산.

**확정 구조**:
- 기본 8공종 (바탕정리, 바탕조정제미장, 하도 프라이머, 복합 시트, 쪼인트 실란트, 노출 우레탄, 벽체 우레탄, 우레탄 상도) → `is_base: true` → 휴지통 미노출 (`<span>` placeholder 로 정렬 유지)
- 칩 추가 / 장비 옵션 / 자유 행 → `is_base: false` → 휴지통 노출 → `window.confirm(품명)` → 행 filter + sort_order 재번호 + grand_total 재계산
- 버튼 열 폭 `50px → 72px` (3버튼 수용)

**핵심 구현 (2계층)**:
1. `components/estimate/EstimateTableWrapper.tsx` `handleDeleteRow`: `is_base=true` 가드 → filter + sort_order 재번호 + `calc(visible)` 재계산 + '행 삭제' 스냅샷
2. `components/estimate/ExcelLikeTable.tsx`: `onDeleteRow` prop + `item.is_base ? placeholder : <button>` 분기 + `data-testid="delete-btn-{rowIdx}"`

**근본원인 (1차 e068b5f 배포 직후 가드 뚫림 — 2차 862b73a 핫픽스)**:
- `lib/estimate/constants.ts` 의 `COMPLEX_BASE`/`URETHANE_BASE` 가 `BaseItem.isBase` 를 일관되게 세팅하지 않음. 오직 `바탕조정제미장` 만 `isBase: false` 명시 (pre-#10 잔재), 나머지는 필드 미정의.
- `lib/estimate/buildItems.ts:71` 의 `is_base: b.isBase ?? false` → 모든 기본 공종이 `is_base: false` → ExcelLikeTable 가드 분기가 항상 button 쪽.
- 해결:
  - `buildItems.ts`: `is_base: true` 고정 (buildItems 는 정의상 BASE 배열만 빌드. 장비는 `appendEquipmentRows`, 자유행은 UI 헬퍼 경로 분리)
  - `constants.ts`: 벗어난 `isBase: false` 2건 제거
  - `types.ts`: `BaseItem.isBase` 필드 삭제 — vestigial, 재발 방지

**건드리기 전 읽기**:
- `buildItems` 는 **오로지** BASE 배열에서만 호출된다. 새 공종을 하드코딩 추가하려면 `is_base: true` 가 자동으로 붙는다는 걸 기억할 것.
- 장비 옵션 (`ladder`/`sky`/`waste`/`dryvit`)은 `appendEquipmentRows` 경유 → 명시적으로 `is_base: false`.
- 칩 (`quickChipConfig.chipToEstimateItem`) → 명시적으로 `is_base: false`.
- 자유 행 (`EstimateTableWrapper.handleAddFreeItem`) → 명시적으로 `is_base: false`.
- 음성 ADD (`lib/voice/commands.ts`) → 명시적으로 `is_base: false`.

**커밋 체인**:
- `e068b5f` feat(#11): 칩 추가 행 삭제 버튼 — 기본 8공종은 숨김 전용 유지
- `862b73a` fix(#11): 기본 8공종 is_base=true 하드코딩 — 삭제 버튼 가드 복구

**검증**:
- vitest: 478/478 PASS
- build/lint: PASS
- 브라우저 실측 대기

### 3.21 평단가 칩 미표시 버그 (1dd90a6 직전 DB hotfix, 확정 — 코드 변경 없음)
**증상**: 견적서 편집 화면에서 복합/우레탄 평단가 칩이 빈 배열 → 칩 자체가 안 보임.

**원인** (DB 데이터 정합성):
- migration 013이 `price_matrix` 전량 DELETE → 이후 `supabase/price_matrix_pvalue_seed.json` 재임포트가 `ce9890e6-...` (방수명가) 한 곳에만 들어감 (318 rows).
- 실제 active estimates 는 `00000000-...` (부성에이티) / `95ede817-...` (방수명가) / `24f91719-...` 에 분산.
- `app/(authenticated)/estimate/edit/page.tsx`가 `company_id=companyId` 로 필터 → **0 rows** → priceMatrix 빈 객체 → `getAvailableChips` 가 빈 배열 반환 → CostChipsPanel 빈 칩.

**복구**: `ce9890e6-...` 의 318 rows 를 위 3개 company_id 로 복제 (DELETE-then-INSERT). node 인라인 스크립트 1회 실행. Vercel 재배포 불필요 (DB only).

**검증 결과**: m²=150 → 50평미만 → 복합 7 chips `[38000..44000]` 정상 노출. 모든 active company 동일 데이터.

**재발 방지 메모**: 다음 migration 으로 price_matrix 를 다시 비울 일이 있으면 **모든 active company_id 에 seed 재주입**해야 함. 단일 company seed 로 끝내지 말 것. 실측 환경에서는 active company_id 가 4개임 (`00000000`, `24f91719`, `95ede817`, `ce9890e6`).

### 3.19 셀 클릭 편집 진입 UX (H8, 확정 — 건드리지 말 것)
**사장 요구** (H8 진입 시점): select-all + delete 과정 없이 바로 새 값 타이핑. 셀 밖 클릭해도 Enter 없이 원래값 유지/입력값 저장.

**확정 동작**:
- 클릭/Enter/F2 로 편집 진입 → `editValue=''` (빈 입력창)
- 타이핑하면 새 값, 타이핑 없이 떠나면 원래값 유지
- 셀 밖 클릭 (표 바깥 / 표 내부 빈 영역 / footer / 단가합열 / 다른 셀) 모두 정상 동작
- Enter/Tab/Arrow/Escape 도 기존대로 동작

**구현 핵심** (3가지 계층):
1. `ExcelCell.useEffect` 편집 진입 (non-initialChar 경로): `setEditValue('')`, `onEditChange` 호출 안 함. deps 에서 `value` 제거.
2. `ExcelCell.handleCommit`: `editValue.trim()==='' → onCancel` early return. `onEditChange` 는 `null` 허용 (빈 입력 → pending 클리어 신호).
3. `ExcelLikeTable.handleStartEditing/commitValue/cancelEdit`: `pendingValueRef=null` 초기화 + `stopEditing()` 종료 보장.
4. `ExcelCell` document-level `mousedown` 리스너 (isEditing 일 때만): blur 가 발생하지 않는 non-focusable 요소 클릭도 강제로 handleCommit 호출.

**왜 그렇게 했나 (건드리기 전 읽기)**:
- Chrome/Edge 에서 tabIndex 없는 td/footer 클릭 시 포커스 이동 안 해서 input.onBlur 가 아예 안 뜸 → document 리스너 필수
- useEffect deps 에서 value 제거한 건 편집 중 외부 value 변경이 editValue 를 덮는 race 를 막기 위함 (d8c6dc5 의심 후보 1번)
- onEditChange 타입에 null 추가한 건 빈 문자열 입력을 부모에게 "pending 클리어" 신호로 전달하기 위함

**커밋 체인**:
- `b5616a1` feat: 빈 입력창 + deps 정리
- `ae085fc` fix: blur 경로 stopEditing 추가
- `552742a` fix: document mousedown 리스너

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
| ~~10~~ | ~~빠른공종추가 칩~~ | ~~P2~~ | ✅ **#10 완료** (0d7ad23) |
| ~~2~~ | ~~acdb_entries seed~~ | ~~P2~~ | ✅ **#10 완료** (0d7ad23, importAcdbSeed) |
| 5 | Ctrl+F 행 스크롤 제거 | P3 | **잔여** |
| ~~(신규)~~ | ~~셀 편집 race 브라우저 재조사~~ | ~~P1~~ | ✅ **H8 에서 구조적 차단** (사용자 실측 통과) |
| ~~(H8)~~ | ~~셀 클릭 편집 진입 UX 재설계~~ | ~~P0~~ | ✅ **H8 완료** (b5616a1 + ae085fc + 552742a) |
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
- 브랜치: 이번 세션부터 feature/h* 단발 브랜치 → main merge --no-ff → push (feature/lens-integration 은 H4 까지)
- URL: https://bsmg-v5.vercel.app
- **main HEAD: `862b73a`** (fix(#11): 기본 8공종 is_base=true 하드코딩 — 삭제 버튼 가드 복구)
- 프로젝트 경로: `C:\Users\lazdo\projects\bsmg-v5` (랩탑 교체 후 경로 변경)
- 로컬 브랜치: main
- git identity (로컬): `bsmg-v4 <lazdor2@gmail.com>` — 2026-04-11 설정됨

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
- ~~H8 셀 클릭 편집 UX~~ ✅
- ~~#10 BASE 장비 4종 제거 + 빠른공종 칩 + acdb seed~~ ✅
- ~~#10-FIX 칩 정리 + 폐기물처리비 리네임 + UNIT_OPTIONS + 평단가 DB hotfix~~ ✅
- ~~#11 행 삭제 버튼 + is_base 가드 핫픽스~~ ✅
- **잔여**: #5 Ctrl+F 잔여 확인 → Phase 4I 종료 선언
- price_matrix 20평이하/우레탄 (Phase 10)
- price_matrix effective_from 2026-04-08 → Phase 10
- 음성 → 폼 escalation 트리거 (Phase 8)
- 외벽/주차장 자동화 (Phase 4.6+)
- tests/voice/vadLogic.test.ts "speaking" VoiceStatus 타입 에러 1건 (별도 처리)

## 12. 마지막 상태 (이 세션 종료 시점: 2026-04-11 #12 완료)
- Phase 4I-H4 종료 (2026-04-10) → H5-LOGS / H5-1 / 장비exp / H6 / H7 / H7-DEBUG-CLEANUP / H8 / #10 / #10-FIX / #11 / 규칙서재설계 → **#12 (단가표 UX + acdb 핫픽스)**
- **main HEAD**: `1081481` (fix(#acdb): 견적서 품명 자동완성 복구 — 519건 시드 재주입)
- **직전 커밋**: `064c24d` (feat(#settings): 단가표 3단계 드릴다운 — 가로 스크롤 제거)
- Build: 통과. Lint: 경고만 (사전 존재). 테스트 166/166 (acdb + estimate 범위). tsc: 기존 vadLogic 에러 1건만 잔존
- Vercel: 064c24d + 1081481 연달아 자동 배포 트리거됨

### 이번 세션 변경 요약 (#12)
1. **단가표 3단계 드릴다운** — 면적대/공법 → 평단가 칩 → 공종별 4열 표
   - 기존: 면적대+공법 선택 시 모든 평단가가 colSpan=3 으로 가로 펼침 → 가로 스크롤 과다
   - 신규 분리: `PriceMatrixEditor` (200줄) / `PriceMatrixControls` (80줄) / `PriceMatrixChips` (39줄) / `PriceMatrixDetailTable` (120줄)
   - 새 상태 1개만 추가: `selectedPpp: number | null` (areaRange/method 변경 시 useEffect 리셋)
   - 보존: `PriceMatrixRow` 타입, `rows` state shape, `/api/settings/price-matrix` GET/PUT, `commitEdit` 새 행 추가 분기 전부 동일
   - `overflow-x-auto` 제거 → 페이지 폭에 맞는 `table-fixed` (40/20/20/20 colgroup)
2. **acdb 자동완성 복구 (실측 기반)** — 규칙서재설계(#2a6bdd0)에서 API 프록시 전환은 했으나 실제 DB가 비어 있었던 사실을 이번 세션에서 발견
   - `scripts/diag-acdb.ts` 신규 — 진단 결과 acdb_entries count = 0, cost_config.favorites = 0
   - `scripts/import-acdb-seed.ts` 신규 — `data/acdb-seed.json` 519건을 `source='seed'` 로 service role 주입 (`lib/acdb/import.ts` 멱등 정책 재현: 기존 seed 행 있으면 skip)
   - 사후 진단: 부성에이티 acdb_entries count = 519

### 다음 작업 후보
1. **브라우저 UAT** — 사장 실측
   - /settings 단가표: 면적대 선택 → 평단가 칩 → 칩 선택 → 4열 표 → 셀 편집/저장/새로고침 후 유지. 가로 스크롤바 없음.
   - 견적서 품명 셀: "바" 타이핑 → 드롭다운 (바탕정리 등) 최대 8개 → 클릭/키보드 선택 반영
2. 규칙서재설계 UAT 잔여 (즐겨찾기/기타/신규/자동 등록)
3. #5 Ctrl+F 잔여 확인
4. Phase 4I 공식 종료 선언
5. (선택) SettingsPanel 도 사이드바 구조로 통일

## 13. 파일 위치 정보 (2026-04-11 갱신 — 랩탑 교체 후 경로)
- SESSION_STATE: `C:\Users\lazdo\projects\bsmg-v5\docs\SESSION_STATE.md`
- 이 인계서: `C:\Users\lazdo\projects\bsmg-v5\docs\HANDOFF_TO_NEXT_CHAT_v5.md`
- 프로젝트 규칙: `C:\Users\lazdo\projects\bsmg-v5\CLAUDE.md` (수정 금지)
- 지시서: `C:\Users\lazdo\projects\bsmg-v5\docs\SYSTEM_BUILD_SPEC.md`
- lens 인터페이스: `C:\Users\lazdo\projects\bsmg-v5\docs\brief-quote.md` §4

## 14. 새 채팅 첫 응답 양식

> 일반 모드. §10 우선순위대로 SESSION_STATE + 이 문서 + CLAUDE.md 흡수 후 이 양식으로 인수 완료 보고, 이어서 사장 메시지 대응.

```markdown
## 인수 완료 — #12 (단가표 UX + acdb 핫픽스) 직후

### 프로젝트 파악
- bsmg-v5, Phase 4I 후반 (… → 규칙서재설계 → **#12**)
- main HEAD: `1081481` (fix(#acdb): 견적서 품명 자동완성 복구 — 519건 시드 재주입)
- 직전: `064c24d` (feat(#settings): 단가표 3단계 드릴다운 — 가로 스크롤 제거)
- Vercel: https://bsmg-v5.vercel.app (자동 배포 트리거됨)
- 저장소 Public: hyuntarella/BSMG-V4

### 핵심 교훈 적용 (H4 + H5~H8 + #10 + #11 + #12 누적)
- 파생 상태는 effect 금지, 이벤트 콜백 1회 (H4-2-CHIP)
- 합산 계산은 역산 금지, 의도 항목 직접 합산 (H4-3)
- 전역 단축키 window capture 선점 (H4-2-KEYBIND)
- 플래그 의존 설계 전 grep 확인 (H4-3)
- 장비 4종은 경비(exp) 컬럼 — labor 에 쓰면 안 됨 (장비exp이전)
- 우레탄 0.5mm 는 base05 × 배수 공식 (H6)
- 편집 중 외부 value 변경이 editValue 덮는 race 는 useEffect deps 에서 value 제거로 차단 (H8)
- clickaway 는 input.onBlur 단독 불완전 → document mousedown 리스너 병용 필수 (H8)
- `is_base: true` 는 `buildItems` 에서 하드코딩으로 보장 (#11)
- **DB 의존 기능 "복구" 는 코드 프록시 전환만으로는 부족. 실제 row 존재 여부를 진단 스크립트로 확인하라 (#12 교훈)**
- **200줄 규칙 초과 시 순수 렌더 컴포넌트로 분리 — 상태/로직은 상위에 두고 하위는 props 로만 (PriceMatrix 4-file 분리 패턴)**

### 잔여 작업
1. 사장 브라우저 UAT — `/settings` 단가표 3단계 드릴다운 + 견적서 품명 셀 "바" 자동완성 복구
2. 규칙서재설계 UAT 잔여 (즐겨찾기/기타/신규/자동 등록)
3. #5 Ctrl+F 잔여 확인
4. Phase 4I 공식 종료 선언
5. (선택) SettingsPanel.tsx 도 사이드바 구조로 통일
```

**END v5**
