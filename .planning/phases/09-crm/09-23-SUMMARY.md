---
phase: 09-crm
plan: 23
subsystem: crm
tags: [notion, api, crm, backend]
dependency_graph:
  requires: []
  provides: [notion-crm-api, crm-crud-endpoints]
  affects: [phase-09-plans-24-28]
tech_stack:
  added: [notion-rest-api-fetch]
  patterns: [notion-rest-direct-fetch, nextjs-route-handlers]
key_files:
  created:
    - lib/notion/types.ts
    - lib/notion/client.ts
    - lib/notion/crm.ts
    - app/api/crm/route.ts
    - app/api/crm/[id]/route.ts
    - app/api/crm/[id]/comments/route.ts
  modified: []
decisions:
  - "Notion REST API 직접 fetch (no SDK): 환경변수 NOTION_CRM_TOKEN으로 Bearer auth, 불필요한 패키지 설치 없음"
  - "getAllRecords() 페이지네이션 처리: has_more + start_cursor while loop으로 전체 레코드 수집"
  - "filter archived=false: Notion에서 아카이브된 페이지를 제외하고 조회"
metrics:
  duration_seconds: 350
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 6
  files_modified: 0
---

# Phase 09 Plan 23: Notion CRM API 레이어 Summary

Notion REST API 직접 fetch로 CRM 전체 CRUD + 댓글 6개 엔드포인트 구축.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Notion 클라이언트 + 타입 정의 + CRM 래퍼 함수 | dc82492 | lib/notion/{client,types,crm}.ts |
| 2 | CRM API Routes | 1fad787 | app/api/crm/{route,[id]/route,[id]/comments/route}.ts |

## What Was Built

### lib/notion/types.ts
- `CrmRecord`: 26개 필드 타입 (id, address, customerName, phone, email, manager, stage, pipeline, contractStatus, inquiryChannel, workTypes, estimateAmount, contractAmount, deposit, balance, area, memo, 날짜 5개, URL 2개, createdTime, lastEditedTime)
- `CrmRecordCreate`: Partial<CrmRecord> + address 필수
- `CrmRecordUpdate`: Partial<CrmRecord>
- `CrmComment`: id, content, createdTime, createdBy
- `STAGE_MAP`: 5단계 × 파이프라인 목록
- `PIPELINE_TO_STAGE`: 역매핑 (모든 파이프라인 → 단계)

### lib/notion/client.ts
- `notionFetch(endpoint, method, body?)`: Notion REST API v2022-06-28 직접 fetch
- Authorization Bearer, Content-Type, Notion-Version 헤더 자동 설정
- 오류 시 상세 메시지 포함한 Error throw

### lib/notion/crm.ts
- `parseNotionPage()`: Notion property 타입별 파싱 → CrmRecord 변환
- `buildNotionProperties()`: CrmRecordUpdate → Notion property 포맷 역변환 (undefined 필드 skip)
- `getAllRecords()`: has_more 페이지네이션, archived=false 필터, last_edited_time DESC 정렬
- `getPageById()`, `createRecord()`, `updateRecord()`, `archiveRecord()`
- `getPageComments()`, `addComment()`

### API Routes
- `GET /api/crm` — 전체 레코드 조회
- `POST /api/crm` — 새 레코드 생성 (address 필수 검증)
- `GET /api/crm/[id]` — 단일 레코드 조회
- `PATCH /api/crm/[id]` — 레코드 수정
- `DELETE /api/crm/[id]` — 레코드 아카이브
- `GET /api/crm/[id]/comments` — 댓글 조회
- `POST /api/crm/[id]/comments` — 댓글 추가 (content 필수 검증)

## Decisions Made

- Notion SDK 미설치 — `fetch` 직접 사용으로 패키지 의존성 없음
- 페이지네이션 while loop — 100개 이상 레코드도 전체 수집 가능
- `archived: false` 필터 — Notion 아카이브된 레코드는 응답에서 제외

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Files created:
- lib/notion/client.ts: FOUND
- lib/notion/types.ts: FOUND
- lib/notion/crm.ts: FOUND
- app/api/crm/route.ts: FOUND
- app/api/crm/[id]/route.ts: FOUND
- app/api/crm/[id]/comments/route.ts: FOUND

Build: PASSED (all 3 API routes appear in build output)
Commits: dc82492 (Task 1), 1fad787 (Task 2)
