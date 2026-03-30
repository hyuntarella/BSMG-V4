# Roadmap: 방수명가 견적서 v4

## Overview

이 로드맵은 부분 구현된 시스템의 end-to-end 연결 복구 순서를 따른다. 신규 기능 추가가 아닌 파이프라인 단절 지점을 순서대로 연결한다. Phase 1에서 음성-to-견적서 루프를 완성하고, Phase 2에서 편집 루프를 닫고, Phase 3에서 데이터를 저장하고, Phase 4에서 워크플로우를 완성하고, Phase 5에서 외부 시스템을 연동한다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: 음성 파이프라인 연결** - 음성 발화 → 파싱 → 견적서 테이블 반영 → TTS 피드백 end-to-end 동작 (completed 2026-03-30)
- [ ] **Phase 2: 음성 편집 루프** - modify 모드로 단가/공종을 음성으로 수정, 확신도 분기 + 컨텍스트 유지
- [ ] **Phase 3: 인라인 편집 + 저장** - 셀 탭 편집 동작, Supabase 저장 + 자동저장 완성
- [ ] **Phase 4: 견적서 UI 완성** - 견적서 목록 + 불러오기 워크플로우 완성
- [ ] **Phase 5: 외부 연동** - Notion CRM 고객 정보 자동 채움 + 엑셀 출력

## Phase Details

### Phase 1: 음성 파이프라인 연결
**Goal**: 음성 한마디가 견적서 테이블에 반영되고 TTS로 확인받을 수 있다
**Depends on**: Nothing (existing code to be wired)
**Requirements**: VOICE-01, VOICE-02, VUX-01
**Success Criteria** (what must be TRUE):
  1. 음성으로 면적/공법/평단가를 말하면 견적서 공종 테이블에 항목과 금액이 정확히 채워진다
  2. 시작/마디 넘기기/종료 명령이 정확히 동작하여 extract 모드와 supplement 모드가 순서대로 진행된다
  3. 모든 음성 입력 후 TTS가 결과와 총액 변화를 한국어로 읽어준다
**Plans**: 2 plans
Plans:
- [x] 01-01-PLAN.md — voiceFlow stateRef 동기화 안정화 + skipLlm 반응성 보장
- [x] 01-02-PLAN.md — 총액 TTS 피드백 추가 + E2E 검증
**UI hint**: yes

### Phase 2: 음성 편집 루프
**Goal**: 이미 만든 견적서를 음성으로 자유롭게 수정할 수 있다
**Depends on**: Phase 1
**Requirements**: VOICE-03, VOICE-04, VOICE-05, VOICE-06, VOICE-07, VOICE-08, VUX-02, VUX-03, VUX-04, VUX-05
**Success Criteria** (what must be TRUE):
  1. "바탕정리 재료비 400원으로"처럼 단가를 절대값/증감으로 음성 수정하면 테이블에 즉시 반영된다
  2. "크랙보수 20미터 추가" / "바탕정리 빼줘"로 공종을 추가하거나 삭제할 수 있다
  3. 확신도 95% 이상 명령은 즉시 실행되고, 70-95%는 실행 후 TTS로 확인을 묻고, 70% 미만은 되묻는다
  4. "그거 올려" 처럼 직전 명령의 대상을 참조하는 발화가 정확히 처리된다
  5. "취소"를 말하면 직전 음성 명령이 undo된다
**Plans**: 3 plans
Plans:
- [ ] 02-01-PLAN.md — 수정 모드 상태 기계 + 웨이크워드 + modify 파이프라인 배선
- [ ] 02-02-PLAN.md — 확신도 확인 UX + 시스템 명령 + VAD 무음 감지
- [ ] 02-03-PLAN.md — 빌드 검증 + E2E 음성 테스트 체크포인트
**UI hint**: yes

### Phase 3: 인라인 편집 + 저장
**Goal**: 터치로 셀을 직접 편집할 수 있고, 모든 변경사항이 Supabase에 안전하게 저장된다
**Depends on**: Phase 2
**Requirements**: UI-01, OUT-01, OUT-02
**Success Criteria** (what must be TRUE):
  1. 공종 테이블에서 숫자 셀을 탭하면 숫자 키패드가 뜨고, 입력 완료 시 해당 행과 총액이 즉시 재계산된다
  2. 저장 버튼을 누르면 견적서 전체가 Supabase에 upsert되고 TTS로 저장 완료를 알려준다
  3. 편집 중 1초간 변경이 없으면 자동저장이 실행되고, 다음에 같은 URL로 접근하면 이전 상태가 복원된다
**Plans**: TBD
**UI hint**: yes

### Phase 4: 견적서 UI 완성
**Goal**: 저장된 견적서를 검색하고 불러올 수 있어 반복 견적 업무가 가능하다
**Depends on**: Phase 3
**Requirements**: UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. 견적서 목록 페이지에서 고객명 또는 현장명으로 과거 견적서를 검색하고 조회할 수 있다
  2. 목록에서 견적서를 선택하면 해당 공종 테이블과 금액이 에디터에 그대로 불러와진다
**Plans**: TBD
**UI hint**: yes

### Phase 5: 외부 연동
**Goal**: Notion CRM에서 고객 정보를 가져와 견적서를 자동 채우고, 완성된 견적서를 엑셀로 출력할 수 있다
**Depends on**: Phase 4
**Requirements**: CRM-01, OUT-03
**Success Criteria** (what must be TRUE):
  1. 견적서 시작 시 Notion CRM에서 고객 이름으로 검색하면 주소와 담당자가 견적서 표지에 자동으로 채워진다
  2. 엑셀 출력 버튼을 누르면 기존 GAS 출력물과 동일한 레이아웃의 .xlsx 파일이 다운로드된다
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 음성 파이프라인 연결 | 2/2 | Complete   | 2026-03-30 |
| 2. 음성 편집 루프 | 0/3 | Not started | - |
| 3. 인라인 편집 + 저장 | 0/TBD | Not started | - |
| 4. 견적서 UI 완성 | 0/TBD | Not started | - |
| 5. 외부 연동 | 0/TBD | Not started | - |
