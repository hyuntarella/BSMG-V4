# BSMG-V4 Project Truth v7

> **v6 → v7**: Phase 4 (음성 견적서 UI/UX 리뉴얼 + 머지 후 재작업) 완료 반영.
> 기준 시점: 2026-04-13 (Phase 4 완전 종료 후, main `0c93790`).

---

## §0. 운영 규칙
v6 §0 동일. **병렬 실행**, **worktree 병렬 세션**, **md 영속 컨텍스트** 원칙 유지.

### 0.4 커밋 규율 (v7 신설)
- **작업 완료 = 커밋까지**. WIP 상태로 세션 종료 금지.
- 세션 시작 git status에 `M` 파일이 있다면 먼저 처리 — 누구의 WIP인지, 커밋 여부부터 판단.
- 머지는 커밋된 변경분만 반영. 미커밋 WIP는 세션 간 유실 위험.
- 사유: Phase 4 본체 세션이 구현만 하고 커밋 없이 종료 → 다음 세션 머지 후 프로덕션에서 "회귀"로 오인. 원인은 미커밋.

---

## §1. 실제 Repo 구조 (v7 갱신)

```
app/
  (authenticated)/
    estimate/
      new/page.tsx          # Phase 4: Header 제거, EstimateEditor 직접 렌더
      [id]/page.tsx
      edit/page.tsx         # 폼 견적서 (EstimateEditorForm 기반)
    settings/page.tsx       # Phase 5 재구성 + Phase 4 음성규칙 탭 추가
  api/settings/             # v6 §1 동일
  api/estimates/[id]/       # v6 §1 동일
  api/stt, api/tts, api/llm

components/estimate/
  EstimateEditor.tsx        # Phase 4: 5탭→3탭, 1480px 프레임, TOP BAR, FAB
  EstimateEditorForm.tsx    # 폼 견적서 (면적대 칩 inline-flex 정렬)
  ExcelLikeTable.tsx        # 음성 하이라이트: data-voice-highlight, 행/셀 피드백
  ExcelCell.tsx             # 미리보기: data-voice-preview, italic rgba
  EstimateTableWrapper.tsx  # 하이라이트 props pass-through
  VoiceGuidePanel.tsx       # Phase 4: "?" 버튼 클릭 시 열림. z-[59/60] 분리
  WorkSheet.tsx             # /estimate/edit 에서만 사용
  CompareView.tsx           # 갑지·검수 탭 (new 경로 전용)
  # v6 기존: SaveButton, CustomerInfoCard, BasePriceBar, WarrantySelect 등

components/voice/
  VoiceBarContainer.tsx     # Phase 4: "?" 버튼 (h-7 w-7) + 2모드 토글. TextInputBar 분기 제거
  VoiceBar.tsx
  VoiceLogPanel.tsx
  TextInputBar.tsx          # 사용처 0 — 기술부채(별건 삭제)

components/settings/
  VoiceRulesPage.tsx        # Phase 4 신설: 가로 탭 5개 (공종/단가/면적/교정/종료)
  SettingsSidebar.tsx       # 4탭 (단가표 / 자주쓰는공종 / 기타설정 / 음성규칙)
  # Phase 5 재구성 파일 v6 §1 동일

hooks/
  useEstimate.ts
  useAutoSave.ts
  useEstimateVoice.ts       # 2모드 (field/driving), handleText* 내부 잔존 — 기술부채
  useNewItems.ts
  # 삭제: useRealtimeVoice.ts (Phase 4)

lib/voice/
  inputMode.ts              # 2모드 (field, driving). showTextInput 플래그 삭제
  # 파서/명령 로직은 Phase 4 스코프 밖 (미변경)

e2e/
  voice-modes.spec.ts       # 2모드 재구성 (6 tests)
  # 삭제: parser-corpus.spec.ts (Phase 4: office 전용이라 제거)

templates/                  # 3-A 신설 (v6 동일)
supabase/migrations/001_initial_schema.sql
```

### 1.1 Phase 4 삭제 파일 (최종)
- `hooks/useRealtimeVoice.ts`
- `app/api/realtime/session/route.ts`
- `components/estimate/InitialGuide.tsx`
- `e2e/parser-corpus.spec.ts`

### 1.2 Phase 4 신설 파일
- `components/settings/VoiceRulesPage.tsx`

---

## §2. 데이터 상수 실제 값
v6 §2 동일. P매트릭스 세트 수, 면적대 경계, SMALL_PRESETS, BaseItem 스키마, 원가 상수 변경 없음.

---

## §3. Supabase `cost_config` JSONB 스키마
v6 §3 동일.

---

## §4. `/settings` 페이지 매핑 (v7: 4탭)

```
page.tsx
  ├─ Header + 통합 저장 + dirty
  ├─ SettingsSummary
  ├─ SettingsSidebar (4탭: 단가표 / 자주쓰는공종 / 기타설정 / 음성규칙)
  └─ 콘텐츠 카드
       ├─ [단가표]       PriceMatrixEditor (v6 동일)
       ├─ [자주쓰는공종] FavoriteItemsPage (v6 동일)
       ├─ [기타 설정]     OtherSettingsPage (2×2 그리드)
       └─ [음성규칙]     VoiceRulesPage ★ Phase 4 신설
            ├─ 상단 배너: "읽기 전용 · 개발팀에 요청"
            ├─ 가로 탭 5개 (빈도순): 공종/단가/면적/교정/종료
            │    └─ 각 탭: 아이콘 + 설명 + 말하기/결과 표
            └─ 고급 설정 보기 (접힘)
                 ├─ 실행 트리거 단어 · 종료 단어
                 ├─ 알아듣는 정도별 동작 (확실/애매/불확실)
                 └─ 입력 모드 2종 (현장/운전)
```

**딥링크 해시 지원**: `#voice-rule-items|price|area|correct|stop`.

---

## §5. v1 정정표
v1 §5 유효.

---

## §6. 엑셀·PDF 출력 파이프라인
v6 §6 동일.

---

## §7. 저장 구조
v6 §7 동일.

---

## §8. Phase 파일 변경 요약 (v7 추가)

### Phase 4 본체 (커밋: 1920f07, ad95765, 3fc94bb, a7a28e7, f9b0e7a)
- `EstimateEditor.tsx` 재구성 (1480px 프레임, 3탭, TOP BAR, FAB)
- `VoiceBarContainer.tsx` "?" 버튼 추가 (h-7 w-7)
- `ExcelLikeTable.tsx` / `ExcelCell.tsx` 하이라이트 마커
- `components/settings/VoiceRulesPage.tsx` 신설
- `hooks/useRealtimeVoice.ts` / `app/api/realtime/session/` / `components/estimate/InitialGuide.tsx` 삭제

### Phase 4 재작업 (커밋: 95eb888, 5a1c71e, fcfb0b9, bd4b00d, 19a0ce0)
- `components/estimate/VoiceGuidePanel.tsx` — z-index 분리, 오버레이/그림자 강화
- `lib/voice/inputMode.ts` — 3모드 → 2모드
- `components/voice/VoiceBarContainer.tsx` — TextInputBar 분기 제거, MODE_ORDER 2개
- `components/settings/VoiceRulesPage.tsx` — 가로 탭 UX
- `e2e/voice-modes.spec.ts` 재작성, `e2e/parser-corpus.spec.ts` 삭제
- Phase 4 미커밋 WIP 4파일 복구 (page.tsx / EditorForm / ExcelCell / ExcelLikeTable)

---

## §9. v1 정정표
유지.

---

## §10. 페이즈 로드맵 (v7)

### 10.1 완료
- Phase 1: 견적 에디터 UI
- Phase 2: 음성 파이프라인
- Phase 3-A: 엑셀 주입 엔진
- Phase 3-B: 구글드라이브 + Drive API PDF
- Phase 3-C: /settings 리뉴얼 + material_increase_rate 제거
- Phase 5: /settings 단가표 재구조 + 즉시 반응 UX
- **Phase 4: 음성 견적서 UI/UX 리뉴얼** ★ v7

### 10.2 예정 (우선순위 순)

| 페이즈 | 범위 | 상태 | 비고 |
|---|---|---|---|
| 6 | findPriceForMargin 음성 견적 단가 역산 재검증 | 사장 판단 대기 | material_increase_rate 제거 영향 |
| 7 | Estimate address 필드 추가 (J9 정확도) | 낮음 | site_name 대체 유지 중 |
| 8 | 3프리셋 UI 확장 | 보류 | 현재 20평이하 복합만 프리셋 3개 |
| 9 | 관리번호 경쟁 조건 강화 (UNIQUE + 재시도) | 낮음 | 이론적 위험 |
| 10 | 모바일/태블릿 반응형 | 낮음 | 현재 1480px 고정 프레임 |
| 11 | TextInputBar 삭제 + useEstimateVoice.handleText* 정리 | 낮음 | 기술부채 — 아래 §13 |
| 12 | getAdjustedCost deprecated alias 최종 제거 | 낮음 | |
| 13 | useAutoSave stale closure / id 재할당 정리 | 낮음 | |
| 14 | vadLogic.test.ts:97 TS 에러 복구 | 낮음 | 사소 |

---

## §11. Phase 4 완료 요약 (v7 신설)

### 세션 구성
- **Phase 4 본체 세션** (이전): `feature/6-voice-estimate-ui` 브랜치. 1480px 프레임 + 3탭 + 음성규칙 탭 스캐폴딩 + 시각 피드백 WIP. **일부 구현 커밋 누락**.
- **Phase 4 재작업 세션** (이번): 동일 브랜치에서 PM 재테스트 3건 + 사무실 모드 제거 → 머지 후 5건 회귀 발견 → `feature/7-voice-fixes` 로 WIP 복구.

### 주요 변경 (완성본)
1. **음성 견적서 레이아웃**: 1480px 고정 프레임, TOP BAR 3탭 (복합/우레탄/갑지·검수), META BAR, PRICE BAR, SidePanel, FAB
2. **VoiceBar "?" 버튼**: h-7 w-7 white/accent, VoiceGuidePanel 토글
3. **VoiceGuidePanel 가시성**: z-[59/60] 분리, `bg-black/60 backdrop-blur`, `shadow-2xl border-l-2 v-accent/30`
4. **2모드 체제**: 사무실 모드 완전 삭제. 현장(field, 기본) / 운전(driving) 2모드
5. **시각 피드백 3종**: 행 `bg-yellow-100/60`, 셀 `outline-dashed outline-v-accent`, 미리보기 italic rgba + "→" prefix. DOM 마커 `data-voice-highlight="row"`, `data-voice-preview="true"`
6. **/settings 음성규칙 탭**: 가로 탭 5개 (공종/단가/면적/교정/종료) + 고급 설정 접힘
7. **폼 견적서 면적대 칩**: `inline-flex items-center shrink-0 whitespace-nowrap leading-none` (2줄 깨짐 해결)
8. **죽은 코드 정리**: useRealtimeVoice, /api/realtime, InitialGuide, parser-corpus.spec.ts 삭제

### 검증
- tsc --noEmit 에러 0
- npm run lint 신규 에러 0 (pre-existing img/useCallback 경고만)
- npm test 477/477 통과
- npm run build 성공

---

## §12. 알려진 리스크 (v7 갱신)

1. **SettingsPanel 이중 구조**: `components/estimate/SettingsPanel.tsx`가 여전히 구 에디터 사용. /settings 새 카드와 미동기.
2. **WorkSheet 미사용 in /estimate/new**: EstimateEditor는 ExcelLikeTable 사용. `/estimate/edit` 경로에서만 WorkSheet 사용.
3. **CoverSheet / CompareSheet / CompareTable**: /estimate/new에서 CompareView로 대체됨. edit 경로에서만 잔존.
4. **findPriceForMargin 숫자 변화**: material_increase_rate 제거 영향. Phase 6 검증 대상.
5. **J9 현장주소**: Estimate.address 없음 → site_name 대체.
6. **관리번호 경쟁 조건**: 이론적 위험 남음.

---

## §13. 남은 기술부채 (v7 신설, 우선순위 순)

| # | 항목 | 위치 | 영향 | 해결 가이드 |
|---|------|------|------|-------------|
| 1 | `TextInputBar.tsx` 파일 잔존 (사용처 0) | `components/voice/TextInputBar.tsx` | 번들 크기 소소 | 파일 삭제. import 없음 확인 후 rm. |
| 2 | `useEstimateVoice.handleText*` 죽은 반환 | `hooks/useEstimateVoice.ts` 760~920 | 죽은 코드 | handleTextInput/Submit/Cancel/MultilineSubmit + commandHistory state 제거. 단, 내부 파서 호출 로직 공유 여부 먼저 확인 |
| 3 | `getAdjustedCost` deprecated alias | `lib/estimate/costBreakdown.ts` | 오용 가능 | 호출부를 `getCostBreakdown`로 교체 후 alias 제거 |
| 4 | `useAutoSave` stale closure / id 재할당 | `hooks/useAutoSave.ts` | 간헐 저장 실패 가능 | ref 기반 재작성 |
| 5 | `EstimateTableWrapper.tsx` useCallback 경고 4건 | line 142/153/188/257 | 불필요 리렌더 | `items` 를 useMemo 래핑 |
| 6 | `ProposalEditor.tsx` `<img>` 태그 경고 7건 | `components/proposal/` | LCP/번들 | `next/image` 교체 |
| 7 | `vadLogic.test.ts:97` TS 에러 | `tests/voice/` | CI 노이즈 | VoiceStatus 타입 변경 후 테스트 미갱신 |
| 8 | Phase 5 시 `estimate/SettingsPanel.tsx`가 구 에디터 사용 | 단가 편집 이중 경로 | 데이터 불일치 가능 | 새 카드 에디터로 재배선 |

---

## §14. 별건 페이즈 후보 (v7 신설)

| 후보 | 요구 | 트리거 조건 |
|------|------|-------------|
| **3프리셋 UI 확장** | 현재 20평이하 복합 3프리셋만 제공. 나머지 면적대·우레탄에도 프리셋 카드 도입 | 사장이 "프리셋 쓸만하다" 피드백 |
| **voice-guide-btn 위치 재조정 (모바일)** | 현재 fixed bottom-[68px] left-4 — 모바일 스크린에서 키보드와 충돌 가능 | 모바일 반응형(Phase 10)과 함께 |
| **WorkSheet 통합 or 삭제** | new/edit 경로 이중 테이블 구조. 추후 edit 경로도 ExcelLikeTable로 통합하거나 WorkSheet를 완전 삭제 | edit 경로 사용자 감소 시 |
| **공종 추가 음성 명령 UX 피드백** | "9번에 크랙보수 추가" 명령 후 해당 행 플래시 애니메이션 추가 | 현장 피드백 누적 |
| **/settings 음성규칙 탭 편집 가능화** | 현재 읽기 전용. 사장이 트리거 단어/종료 단어 커스터마이즈 요청 시 DB 스키마 추가 | 요청 발생 시 |
| **TTS 음색/속도 사장 커스터마이즈** | 운전 모드 TTS 기본값만 사용 중 | 운전 모드 사용 빈도 증가 시 |

---

**END OF PROJECT TRUTH v7**
