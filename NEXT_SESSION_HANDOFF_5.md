# Phase 5 Handoff — /settings 단가표 재구조 + 즉시 반응 UX

## 직전 커밋
- 브랜치: `feature/5-settings-ux`
- 코드 커밋: `9298f66`
- 문서 커밋: `af48835`
- 기반 main: `f35c28b`

## 변경 파일 요약

### 신설 (8파일)
| 파일 | 설명 |
|------|------|
| `app/api/settings/price-matrix/bulk/route.ts` | 전체 P매트릭스 일괄 GET |
| `components/settings/AreaRangeTabPanel.tsx` | 면적대 탭 패널 (memo) |
| `components/settings/SmallPresetEditor.tsx` | 20평이하 프리셋 편집기 (memo) |
| `components/settings/usePriceMatrixStore.ts` | 전체 P매트릭스 상태 훅 |
| `components/settings/useOtherSettingsStore.ts` | 기타설정 통합 상태 훅 |
| `components/settings/CostEditorCard.tsx` | 원가 카드 |
| `components/settings/CalcRulesCard.tsx` | 계산규칙+장비 카드 |
| `components/settings/WarrantyCard.tsx` | 보증 카드 |

### 대폭 수정 (5파일)
| 파일 | 변경 |
|------|------|
| `app/(authenticated)/settings/page.tsx` | 통합 저장 + dirty + 초기 로딩 + 탭 전환 확인 |
| `components/settings/PriceMatrixEditor.tsx` | 세그먼트+탭 UI, store 옵션 (backward compat) |
| `components/settings/PriceMatrixDetailTable.tsx` | 5열 (합 추가) + 평단가 비교 + memo |
| `components/settings/PriceMatrixChips.tsx` | memo 래핑 |
| `components/settings/OtherSettingsPage.tsx` | 2×2 카드 그리드 |

### 삭제 (3파일)
- `components/settings/PriceMatrixControls.tsx`
- `components/settings/PriceMatrixAccordionItem.tsx`
- `components/settings/usePriceMatrixEditor.ts`

## 다음 페이즈 후보

| 우선순위 | 내용 |
|---------|------|
| 1 | Phase 4: 음성 견적 단가 역산 재검증 (findPriceForMargin) |
| 2 | Estimate address 필드 추가 (J9 현장주소 정확도) |
| 3 | 관리번호 경쟁 조건 강화 (UNIQUE 제약 + 재시도) |
| 4 | 모바일/태블릿 반응형 |
| 5 | 기술부채: getAdjustedCost alias 제거, useAutoSave stale closure |

## 기술부채
- `tests/voice/vadLogic.test.ts:97` — TS 에러 (`'"speaking"' is not assignable to parameter of type 'VoiceStatus'`). Phase 5 이전부터 존재. VoiceStatus 타입 변경 후 테스트 미갱신.

## 알려진 리스크
1. **SettingsPanel 이중 구조**: `components/estimate/SettingsPanel.tsx`가 구 에디터(CostEditor, CalcRulesEditor 등)를 직접 import. /settings 페이지의 새 카드 에디터와 동기화 안 됨. 향후 estimate 쪽도 새 구조로 전환 필요.
2. **SMALL_PRESETS DB 마이그레이션**: cost_config.small_presets에 최초 저장 전까지는 constants.ts의 하드코딩 값 사용. 사장이 /settings에서 한 번이라도 저장해야 DB 반영.
3. **우레탄 20평이하**: 빈 폼 노출 + 데이터 저장 가능. 견적서 쪽 선택 불가 처리는 미구현 (추후 페이즈).
4. **기타설정 저장**: 전체 cost_config를 읽고 → 변경 섹션 교체 → 전체 PUT. 동시 편집 시 마지막 쓰기 승리 (single-tenant이므로 실질적 위험 낮음).
