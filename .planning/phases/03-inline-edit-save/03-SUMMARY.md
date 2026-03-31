---
phase: 03-inline-edit-save
plan: 01
status: complete
started: 2026-03-31
completed: 2026-03-31
---

# Summary: 03 인라인 편집 + 저장

## What was done

### 기존 구현 확인 (이미 완료 상태)
- **UI-01** (셀 탭 인라인 편집): InlineCell.tsx 완전 동작 — click → edit → blur → onSave
- **OUT-01** (수동 저장): handleSave → /api/estimates/[id]/generate 동작
- **OUT-02** (자동저장): useAutoSave 1초 디바운스 동작

### 신규 작업: useAutoSave upsert 최적화
- 기존: sheet 아이템 전체 삭제 후 재삽입 (O(n²), 데이터 손실 위험)
- 변경: id 기반 upsert 전략
  - DB에서 현재 item id 조회
  - id 있는 아이템 → update
  - id 없는 아이템 → insert
  - 클라이언트에 없는 아이템 → delete

## Files changed
- `hooks/useAutoSave.ts` — delete+insert → upsert by id 최적화

## Stats
- Duration: ~5min
- Files: 1
