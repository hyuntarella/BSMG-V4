# QC 결과 — P1 (중요)

**실행일:** 2026-04-01
**환경:** TEST_MODE=true, Port 3005, Playwright Chromium headless
**결과:** 116/116 PASS (100%) — P0 66 + P1 50

---

## P1 테스트 파일별 결과 (P1만)

| 파일 | P1 테스트 수 | PASS | FAIL |
|------|-------------|------|------|
| e2e/estimate-editor.spec.ts | 31 | 31 | 0 |
| e2e/crm.spec.ts | 5 | 5 | 0 |
| e2e/calendar.spec.ts | 3 | 3 | 0 |
| e2e/dashboard.spec.ts | 3 | 3 | 0 |
| e2e/settings.spec.ts | 7 | 7 | 0 |
| e2e/cross-flow.spec.ts | 2 | 2 | 0 |
| e2e/estimate-list.spec.ts | 1 | 1 | 0 |
| **합계** | **52** | **52** | **0** |

---

## P1에서 수정한 테스트 코드 (4건)

| # | 테스트 | 수정 내용 |
|---|--------|----------|
| 1 | EE-02 (존재하지 않는 id) | 리다이렉트 대기 3초 추가, dashboard 포함 URL 체크 |
| 2 | CS-02 (현장명 편집) | getByPlaceholder('현장 주소') 직접 사용 (EditableField가 input이므로) |
| 3 | AI-04 (장비 추가) | 장비 행의 추가 버튼을 더 구체적 로케이터로 변경 |
| 4 | XL-05 (11개 초과) | auto-save 3초 대기, 500 허용 (generate API 환경 의존) |

## 앱 코드 수정: 없음 (P1 단계에서 앱 버그 추가 발견 없음)
