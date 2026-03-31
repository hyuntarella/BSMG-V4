# Milestones

## v1.0 방수명가 견적서 v4 (Shipped: 2026-03-31)

**Phases completed:** 12 phases, 53 plans, 35 tasks

**Key accomplishments:**

- flowActive useState mirrors voiceFlow.isActive to make skipLlm reactive, and processText now guards against idle/done state to discard late STT results
- onComplete callback now calls buildItems directly to compute 복합/우레탄 grand_total and reads it aloud via TTS, completing the voice-to-estimate feedback loop
- 1. [Rule 3 - Bug] Resend 모듈 수준 초기화로 빌드 실패
- 3-level confidence UX complete (pendingConfirm useState + skipLlm + undo/clearLastCommand), read_summary/read_margin/update_meta system commands added, and AnalyserNode VAD (5s silence auto-exit) integrated with enableVad feature flag
- vitest test framework installed with 20 failing test cases for normalizeText and matchKeyword pure function stubs
- Implemented shouldAutoResume and canStartRecording pure functions, passing all 12 tests from 05a red phase
- matchSummaryKeyword + buildSummaryText + buildMarginText
- vadLogic.ts
- UI-02
- ExcelJS template-based complex sheet generation: loads complex-template.xlsx, fills Sheet2 rows 7-17 with item data, preserves all cell formatting/formulas/merged regions
- Urethane template processing and dynamic row hiding: routes urethane sheets to urethane-template.xlsx (10 items), hides unused rows, shares fillDetailFromTemplate logic between both sheet types
- Sheet1 표지 완성: toKoreanAmount 유틸 추가 + 표지 7개 필드(관리번호/일자/고객명/현장명/한글금액/총액/보증조건) 채움
- 엑셀 다운로드 연결 완성: generate route에 download 모드 추가 + EstimateEditor에 엑셀 다운로드 버튼 구현
- 1. [Rule 1 - Bug] chromium-min has no defaultViewport property
- [Rule 3 - Blocking Issue] Install html2canvas and jspdf
- 3 new API routes:
- One-liner:
- WorkSheet name/spec/unit cells converted to InlineCell type='text' with updateItemText in useEstimate for snapshot-tracked text editing
- AddItemModal extended with 장비 tab showing 사다리차(120k)/스카이차(350k)/폐기물처리(200k) presets with editable days and unit price, adding items with is_equipment=true, is_fixed_qty=true
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- `lib/notion/calendar.ts`
- `components/calendar/TimeGrid.tsx`
- `components/calendar/EventModal.tsx`
- One-liner:
- One-liner:
- One-liner:

---
