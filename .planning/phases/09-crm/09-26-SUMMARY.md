---
phase: 09-crm
plan: 26
subsystem: crm
tags: [crm, kanban, drag-drop, modal, undo, fab, ui]
dependency_graph:
  requires: [notion-crm-api, crm-kanban-ui, crm-detail-modal]
  provides: [crm-crud-create, crm-drag-drop-pipeline]
  affects: [phase-09-plans-27-28]
tech_stack:
  added: []
  patterns: [html5-drag-and-drop, optimistic-local-update, undo-toast, fab-button]
key_files:
  created:
    - components/crm/CreateRecordModal.tsx
  modified:
    - components/crm/KanbanBoard.tsx
    - components/crm/KanbanCard.tsx
    - hooks/useCrm.ts
    - components/crm/CrmPageClient.tsx
decisions:
  - "HTML5 DnD API 사용 (외부 라이브러리 없음): draggable + onDragStart/onDragOver/onDrop으로 순수 구현"
  - "Undo 타이머 useRef로 관리: 새 이동 발생 시 이전 타이머 클리어 + 새 타이머 설정"
  - "낙관적 UI + API 에러 시 롤백: updateRecord는 로컬 업데이트 먼저 → fetch 실패 시 이전값 복원"
  - "KanbanBoard에 FAB + Undo 토스트 통합: CrmPageClient가 아닌 KanbanBoard에 배치하여 칸반 관련 UI 응집"
metrics:
  duration_seconds: 420
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 1
  files_modified: 4
---

# Phase 09 Plan 26: CRM CRUD + 드래그&드롭 Summary

신규 레코드 생성 모달(FAB), HTML5 드래그&드롭 파이프라인 이동, 5초 Undo 토스트 완성.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 신규 레코드 생성 모달 + FAB 버튼 | 9219473 | components/crm/CreateRecordModal.tsx |
| 2 | 드래그&드롭 파이프라인 이동 + Undo 토스트 | b82722e | KanbanBoard, KanbanCard, useCrm, CrmPageClient |

## What Was Built

### components/crm/CreateRecordModal.tsx
- Props: isOpen, onClose, onCreate(record: CrmRecord)
- 필드: 주소(필수), 고객명, 전화번호, 담당자(이창엽/박민우/미배정), 문의채널(네이버/전화/소개/기타)
- 주소 미입력 시 빨간 border + 에러 메시지 validation
- 생성 중 스피너 + disabled 버튼
- 모달 열릴 때 주소 필드 자동 포커스 (useRef + setTimeout 50ms)
- POST /api/crm 호출 → 성공 시 onCreate 콜백 + onClose

### components/crm/KanbanBoard.tsx (수정)
- FAB: fixed bottom-6 right-6, bg-brand, rounded-full, + 아이콘
- CreateRecordModal 연결 (createModalOpen state)
- 드롭 영역: 각 파이프라인 컬럼에 onDragOver/onDragLeave/onDrop 핸들러
- isDragOver 시 bg-blue-50 border-dashed border-blue-200 시각 피드백
- UndoInfo 상태: recordId, address, prevPipeline, prevStage, newPipeline, timer
- Undo 토스트: fixed bottom-20 left-1/2, bg-gray-800, 5초 자동 닫기
- 되돌리기 버튼: PATCH /api/crm/[id] (prev값) + onPipelineChange 롤백

### components/crm/KanbanCard.tsx (수정)
- draggable={true}
- onDragStart: dataTransfer.setData('text/plain', record.id), effectAllowed='move'
- onDragEnd: isDragging 복원
- isDragging 시 opacity-50

### hooks/useCrm.ts (수정)
- updateRecord(id, partial): PATCH /api/crm/[id] + 낙관적 업데이트 + 에러 시 롤백
- addRecordLocal(record): 생성된 레코드를 로컬 목록 상단에 추가

### components/crm/CrmPageClient.tsx (수정)
- handleRecordCreate: addRecordLocal 호출
- handlePipelineChange: updateRecordLocal + selectedRecord 동기화
- KanbanBoard에 onRecordCreate, onPipelineChange prop 전달

## Decisions Made

- HTML5 DnD API 순수 사용: 외부 라이브러리 없이 draggable + onDragStart/Over/Drop으로 구현
- Undo 타이머 useRef: 새 이동 발생 시 clearTimeout + 새 setTimeout, unmount 시 클리어
- FAB + Undo 토스트 KanbanBoard 내부 배치: 칸반과 직접 연관된 UI이므로 응집도 향상
- addRecordLocal 로컬 추가: fetchRecords() 재조회 없이 즉각 반영

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Files created:
- components/crm/CreateRecordModal.tsx: FOUND

Files modified:
- components/crm/KanbanBoard.tsx: FOUND
- components/crm/KanbanCard.tsx: FOUND
- hooks/useCrm.ts: FOUND
- components/crm/CrmPageClient.tsx: FOUND

Build: PASSED (/crm 10.4 kB ƒ dynamic)
TypeScript: PASSED (npx tsc --noEmit 0 errors)
Commits: 9219473 (Task 1), b82722e (Task 2)
