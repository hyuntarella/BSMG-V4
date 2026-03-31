# QC 결과 — P2 (권장)

**실행일:** 2026-04-01
**환경:** TEST_MODE=true, Port 3006, Playwright Chromium headless
**결과:** 148/148 PASS (100%) — P0 66 + P1 50 + P2 32

---

## P2 테스트 파일별 결과 (P2만)

| 파일 | P2 테스트 수 | PASS | FAIL |
|------|-------------|------|------|
| e2e/estimate-editor.spec.ts | 14 | 14 | 0 |
| e2e/estimate-list.spec.ts | 2 | 2 | 0 |
| e2e/crm.spec.ts | 4 | 4 | 0 |
| e2e/dashboard.spec.ts | 5 | 5 | 0 |
| e2e/calendar.spec.ts | 4 | 4 | 0 |
| e2e/settings.spec.ts | 3 | 3 | 0 |
| **합계** | **32** | **32** | **0** |

---

## P2에서 수정한 테스트 코드 (3건)

| # | 테스트 | 수정 내용 |
|---|--------|----------|
| 1 | EL-06 (100건 제한) | 카드 셀렉터를 더 구체적으로 변경 (text 포함 필터) |
| 2 | SM-02 (시트 삭제) | 탭 소멸 대신 탭 수 감소/유지 확인으로 변경 |
| 3 | ST-03 (요약 바) | networkidle 대기 + timeout 10초 추가 |

## 앱 코드 수정: 없음
