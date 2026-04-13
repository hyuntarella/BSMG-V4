# Phase 4 완료 Handoff — 음성 견적서 UI/UX 리뉴얼 + 재작업

> Phase 4 본체 + 재작업 세션 전부 종료. 머지·배포 완료 상태.

## 직전 상태
- **기준 브랜치**: `main`
- **Phase 4 본체 세션 브랜치**: `feature/6-voice-estimate-ui` (머지 완료)
- **Phase 4 재작업 세션 브랜치**: `feature/7-voice-fixes` (머지 완료)
- **main 최종 커밋**: `0c93790` (Merge feature/7-voice-fixes)
- **기반 main**: `62cdc95` (Phase 4 진입 직전)
- **프로젝트 상태 문서**: `bsmg_estimate_final_v7.md`

## main 커밋 목록 (Phase 4 전체)

### 본체 (feature/6-voice-estimate-ui)
| 해시 | 내용 |
|------|------|
| `1920f07` | /estimate/new 레이아웃 EditorForm 기반 재구성 + 햄버거→TOP BAR |
| `ad95765` | VoiceBar "?" 음성 가이드 버튼 (h-7 w-7) |
| `3fc94bb` | /settings 음성규칙 탭 추가 (초기, 읽기 전용) |
| `a7a28e7` | vadLogic.test.ts 'speaking' 타입 에러 수정 |
| `f9b0e7a` | Phase 4 handoff 문서 |

### 재작업 (feature/6 위 추가 + feature/7-voice-fixes)
| 해시 | 내용 |
|------|------|
| `95eb888` | VoiceGuidePanel 가시성 (z-index, 오버레이, 그림자) |
| `5a1c71e` | 사무실 입력 모드 제거 — 2모드 (현장/운전) |
| `fcfb0b9` | /settings 음성규칙 탭 영업사원 관점 재설계 (아코디언 버전) |
| `8c7fa53` | Merge feature/6-voice-estimate-ui |
| `bd4b00d` | Phase 4 미커밋 WIP 적용 (시각 피드백·Header 제거·면적대 칩) |
| `19a0ce0` | /settings 음성규칙 탭 가로 탭 전환 (아코디언 제거) |
| `0c93790` | Merge feature/7-voice-fixes |

## 프로덕션 URL (배포됨)
- 음성 견적서: https://bsmg-v5.vercel.app/estimate/new
- 폼 견적서: https://bsmg-v5.vercel.app/estimate/edit
- 규칙서: https://bsmg-v5.vercel.app/settings

## 검증 결과 (최종)
- TypeScript: 에러 0
- Build: 성공 (/settings 15.4 kB, /estimate/new 29.8 kB)
- Lint: 신규 에러 0 (pre-existing 경고만)
- Tests: 477/477 통과

## Phase 4 산출물 요약

### 음성 견적서 (/estimate/new)
- 1480px 고정 프레임, TOP BAR 3탭(복합 을지 / 우레탄 을지 / 갑지·검수)
- META BAR, PRICE BAR, SidePanel(148px), FAB SaveButton
- VoiceBar + "?" 음성 가이드 버튼 (h-7 w-7, bg-white, text-v-accent)
- VoiceGuidePanel: 우측 사이드바, z-[60], shadow-2xl, border-l-2
- 시각 피드백 3종: 행 노란 배경, 셀 점선 아웃라인, 미리보기 italic + "→"

### 폼 견적서 (/estimate/edit)
- 면적대 칩 inline-flex 정렬 수정 (2줄 깨짐 해결)

### 규칙서 (/settings 음성규칙 탭)
- 가로 탭 5개 (공종/단가/면적/교정/종료, 빈도순)
- 기본 "공종 수정" 탭
- 고급 설정 접힘 (트리거/종료 단어, 알아듣는 정도, 입력 모드 2종)
- 딥링크 해시: `#voice-rule-items|price|area|correct|stop`

### 시스템 정리
- 2모드 체제 확정 (현장/운전)
- 죽은 코드 삭제: `hooks/useRealtimeVoice.ts`, `app/api/realtime/session/`, `components/estimate/InitialGuide.tsx`, `e2e/parser-corpus.spec.ts`

## 다음 페이즈 후보 (우선순위 순)

| 페이즈 | 범위 | 판단 기준 |
|---|---|---|
| **6** | findPriceForMargin 음성 견적 단가 역산 재검증 | material_increase_rate 제거 이후 역산 값 회귀 확인 |
| **7** | Estimate.address 필드 추가 | J9 현장주소 정확도 개선 요청 시 |
| **8** | 3프리셋 UI 확장 | 사장 프리셋 사용 피드백 긍정적일 때 |
| **9** | 관리번호 경쟁 조건 강화 (UNIQUE + 재시도) | 동시 생성 충돌 발생 시 |
| **10** | 모바일/태블릿 반응형 | 현장 태블릿 도입 시 |
| **11** | TextInputBar.tsx 삭제 + useEstimateVoice.handleText* 정리 | Phase 10과 함께 |

## 남은 기술부채 (v7 §13 발췌)

1. **TextInputBar.tsx 파일 잔존** (사용처 0) — 삭제 대상
2. **useEstimateVoice.handleText*** 죽은 반환 (line 760~920) — 파서 공유 여부 확인 후 제거
3. **getAdjustedCost alias** — getCostBreakdown로 교체 후 제거
4. **useAutoSave stale closure** — ref 재작성
5. **EstimateTableWrapper.tsx useCallback 경고 4건** — useMemo 래핑
6. **ProposalEditor.tsx img 태그 7건** — next/image 교체
7. **vadLogic.test.ts:97 TS 에러** — pre-existing, 테스트 갱신 필요
8. **estimate/SettingsPanel.tsx 구 에디터 사용** — 새 카드 에디터로 재배선

## 별건 페이즈 후보 (v7 §14 참조)
- 3프리셋 UI 확장 (면적대·우레탄 포함)
- voice-guide-btn 모바일 위치 재조정
- WorkSheet 통합 or 삭제
- 공종 추가 음성 명령 피드백 애니메이션
- /settings 음성규칙 탭 편집 가능화 (트리거 커스터마이즈)
- TTS 음색/속도 커스터마이즈

## 교훈 (Phase 4 과정)

### 미커밋 WIP 리스크
Phase 4 본체 세션이 시각 피드백 구현을 **작성만 하고 커밋하지 않은 채** 종료. 재작업 세션에서 머지했을 때 프로덕션은 커밋된 변경분만 받으므로 해당 기능이 유실돼 "회귀"로 오인. 실제 원인은 미커밋.

**규칙 (v7 §0.4)**: 세션 종료 = 커밋 완료까지. 세션 시작 시 dirty 파일은 먼저 판단.

### 머지 순서
`feature/7-voice-fixes` 에서 WIP 복구 커밋 후 main 머지 → 프로덕션 배포 완료 → Ctrl+F5 강력새로고침으로 검증.

## 범위 밖 (Phase 4 에서 건드리지 않음)
- `lib/voice/**` 파싱·명령 로직
- `/api/stt`, `/api/tts`, `/api/llm` 라우트
- EstimateEditorForm 기능 변경 (면적대 칩 CSS만 수정)
- 바탕조정제미장 단가 0원 (PM 직접 입력 대상)

---

**END OF HANDOFF — Phase 4 COMPLETE**
