---
phase: 03-inline-edit-save
plan: 01
type: execute
depends_on:
  - 02
files_modified:
  - hooks/useAutoSave.ts
autonomous: true
requirements:
  - UI-01
  - OUT-01
  - OUT-02
must_haves:
  truths:
    - 'useAutoSave가 delete+insert 대신 upsert by id로 아이템을 저장한다'
    - '새로 추가된 아이템(id 없는)은 insert, 기존 아이템은 update로 처리된다'
    - '삭제된 아이템은 DB에서도 삭제된다'
    - '빌드/린트 통과'
---

<objective>
useAutoSave의 아이템 저장 전략을 delete-all + re-insert에서 upsert-by-id로 최적화.

현재 InlineCell, useEstimate, useAutoSave 모두 동작하지만,
아이템 저장 시 전체 삭제 후 재삽입하는 O(n²) 전략을 사용.
이를 id 기반 upsert로 변경하여 안정성과 성능 개선.
</objective>

<context>
@hooks/useAutoSave.ts
@hooks/useEstimate.ts
@lib/estimate/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: useAutoSave upsert 최적화</name>
  <files>hooks/useAutoSave.ts</files>
  <action>
useAutoSave.ts의 시트 아이템 저장 로직을 변경:

현재 (L64-91):
```
delete all items where sheet_id = sheet.id
insert all items
```

변경:
```
1. DB에서 현재 sheet의 item id 목록 조회
2. 클라이언트 items 중 id가 있는 것 → update
3. 클라이언트 items 중 id가 없는 것 → insert (반환된 id를 state에 반영)
4. DB에는 있지만 클라이언트에 없는 id → delete
```

주의:
- item.id가 있으면 update, 없으면 insert
- insert 후 반환된 id는 반영 불필요 (다음 save에서 SSR reload로 id 반영)
- 실제로는 새 견적서는 SSR에서 id가 로드됨. 음성 추가 시 id 없는 아이템 생성됨
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>useAutoSave가 upsert 전략으로 변경. 빌드 통과.</done>
</task>

</tasks>

<verification>
npm run build && npm run lint 통과
</verification>
