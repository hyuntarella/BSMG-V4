# Phase 4 Handoff — 음성 견적서 UI/UX 리뉴얼

## 직전 커밋
- 브랜치: `feature/6-voice-estimate-ui`
- 최종 커밋: `a7a28e7`
- 기반 main: `62cdc95`

## 커밋 목록
| 해시 | 내용 |
|------|------|
| `d964c9f` | c1: useRealtimeVoice + /api/realtime 죽은 코드 삭제 |
| `d489756` | c2: InitialGuide 제거 + 자동 시트 생성 |
| `1920f07` | c3: 레이아웃 EditorForm 기반 재구성 + 햄버거→TOP BAR + 메뉴 제거 |
| `ad95765` | c5: VoiceBar "?" 음성 가이드 버튼 |
| `3fc94bb` | c6: /settings 음성규칙 탭 (읽기 전용) |
| `a7a28e7` | vadLogic.test.ts 'speaking' 타입 에러 수정 |

## 변경 파일 요약

### 삭제 (3파일)
| 파일 | 설명 |
|------|------|
| `hooks/useRealtimeVoice.ts` | import 0건 고아 코드 |
| `app/api/realtime/session/route.ts` | 미사용 API 엔드포인트 |
| `components/estimate/InitialGuide.tsx` | 빈 상태 가이드 (자동 시트 생성으로 대체) |

### 신설 (1파일)
| 파일 | 설명 |
|------|------|
| `components/settings/VoiceRulesPage.tsx` | 음성규칙 읽기 전용 탭 (151줄) |

### 대폭 수정 (4파일)
| 파일 | 변경 |
|------|------|
| `components/estimate/EstimateEditor.tsx` | 5탭→3탭, WorkSheet→EstimateTableWrapper, 1480px 고정, TOP BAR, SidePanel, FAB |
| `components/estimate/ExcelLikeTable.tsx` | 음성 하이라이트 props (getCellHighlightLevel, realtimeHighlight, sheetIndex) |
| `components/voice/VoiceBarContainer.tsx` | "?" 음성 가이드 버튼 추가 |
| `components/settings/SettingsSidebar.tsx` | 4탭으로 확장 (음성규칙 추가) |

### 소폭 수정 (5파일)
| 파일 | 변경 |
|------|------|
| `components/estimate/ExcelCell.tsx` | realtimePreview prop 추가 |
| `components/estimate/EstimateTableWrapper.tsx` | 하이라이트 pass-through props |
| `components/estimate/WorkSheet.tsx` | RealtimeHighlight re-export + import 변경 |
| `hooks/useEstimateVoice.ts` | RealtimeHighlight import 경로 변경 |
| `lib/estimate/types.ts` | RealtimeHighlight 타입 추가 |

## /estimate/new 레이아웃 변경 전후

### 변경 전
```
Header
├─ 서브 툴바 (햄버거 + 관리번호 + 저장/엑셀)
├─ TabBar 5탭 (복합-표지, 복합-세부, 우레탄-표지, 우레탄-세부, 비교)
├─ WarrantySelect + BasePriceBar (detail 탭)
├─ CoverSheet / WorkSheet(InlineCell) / CompareSheet+CompareTable
├─ 햄버거 사이드패널 (불러오기/저장/엑셀/PDF/이메일/제안서/시트관리/음성가이드/설정)
└─ VoiceBarContainer + VoiceLogPanel
```

### 변경 후
```
1480px 고정 프레임
├─ TOP BAR: 3탭 (복합 을지 / 우레탄 을지 / 갑지·검수) + 불러오기 + 설정 + undo/redo
├─ META BAR: CustomerInfoCard
├─ PRICE BAR: 면적/벽체 input + CostChipsPanel + UrethaneBase05Control + 평단가 + BasePriceBar
├─ MAIN: EstimateTableWrapper(ExcelLikeTable) + SidePanel(148px) | CompareView
├─ 특기사항 + WarrantySelect
├─ FAB: SaveButton (PDF/엑셀 드롭다운)
├─ VoiceBarContainer ("?" 가이드 버튼 포함) + VoiceLogPanel
└─ 모달: EmailModal, SettingsPanel, LoadEstimateModal, VoiceGuidePanel
```

## 검증 결과
- TypeScript: 에러 0
- Build: 성공
- Lint: 에러 0 (기존 img 경고만)
- Tests: 32파일 477 tests 전부 통과

## 다음 페이즈 후보
| 우선순위 | 내용 |
|---------|------|
| 1 | findPriceForMargin 음성 견적 단가 역산 재검증 |
| 2 | Estimate address 필드 추가 (J9 현장주소 정확도) |
| 3 | 관리번호 경쟁 조건 강화 (UNIQUE 제약 + 재시도) |
| 4 | 모바일/태블릿 반응형 |

## 알려진 리스크
1. **SettingsPanel 이중 구조**: estimate 측 SettingsPanel은 구 에디터 사용 중. /settings와 미동기.
2. **WorkSheet 미사용**: EstimateEditor가 더 이상 WorkSheet를 import하지 않음. /estimate/edit 경로에서만 사용. 삭제하면 edit 페이지 영향.
3. **CoverSheet/CompareSheet/CompareTable 미사용 (new 경로에서)**: CompareView로 대체. edit 경로 확인 필요.
