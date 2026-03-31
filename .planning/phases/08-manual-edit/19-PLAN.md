---
phase: 08-manual-edit
plan: 19
type: execute
wave: 1
depends_on: []
files_modified:
  - components/estimate/CoverSheet.tsx
autonomous: true
requirements: [EDIT-19]

must_haves:
  truths:
    - "CoverSheet에서 고객명을 편집할 수 있다"
    - "담당자명을 편집할 수 있다"
    - "담당자 연락처를 편집할 수 있다"
    - "메모/특이사항을 편집할 수 있다"
    - "갤럭시탭(1200x800) 기준 반응형 레이아웃이 유지된다"
  artifacts:
    - path: "components/estimate/CoverSheet.tsx"
      provides: "customer_name, manager_name, manager_phone, memo 편집 필드"
  key_links:
    - from: "components/estimate/CoverSheet.tsx"
      to: "hooks/useEstimate.ts"
      via: "onUpdate 콜백 → updateMeta"
---

<objective>
고객명/담당자/연락처/메모 수동 입력 — CoverSheet에서 편집

Purpose: 견적서 표지의 고객 관련 정보를 수동으로 입력/수정할 수 있어야 한다.
Output: CoverSheet에 4개 편집 필드 추가
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/estimate/CoverSheet.tsx
@lib/estimate/types.ts
</context>

<interfaces>
<!-- CoverSheet 현재 props -->
```typescript
interface CoverSheetProps {
  estimate: Estimate
  sheet: EstimateSheet
  onUpdate: (field: keyof Estimate, value: string | number) => void
}
```

<!-- Estimate 관련 필드 -->
```typescript
interface Estimate {
  customer_name?: string
  manager_name?: string
  manager_phone?: string
  memo?: string
  site_name?: string  // 이미 EditableField로 편집 가능
  // ...
}
```

<!-- 이미 존재하는 EditableField 컴포넌트 (CoverSheet 내부) -->
```typescript
function EditableField({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
})
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: CoverSheet에 고객 정보 편집 필드 추가</name>
  <files>components/estimate/CoverSheet.tsx</files>
  <action>
CoverSheet.tsx를 수정한다. 200줄 이내 유지.

이미 내부에 EditableField 헬퍼 컴포넌트가 있고, site_name에 사용 중이므로 동일 패턴으로 추가.

1. 좌측 견적 기본정보 테이블(border border-gray-800)에 4개 행 추가:

   현재 행: 관리번호, 견적일, 주소, 공사명
   추가 위치: "공 사 명" 행 아래에 추가

   ```
   <CoverRow label="고 객 명">
     <EditableField
       value={estimate.customer_name ?? ''}
       onChange={v => onUpdate('customer_name', v)}
       placeholder="고객명"
     />
   </CoverRow>
   <CoverRow label="담 당 자">
     <EditableField
       value={estimate.manager_name ?? ''}
       onChange={v => onUpdate('manager_name', v)}
       placeholder="담당자명"
     />
   </CoverRow>
   <CoverRow label="연 락 처">
     <EditableField
       value={estimate.manager_phone ?? ''}
       onChange={v => onUpdate('manager_phone', v)}
       placeholder="연락처"
     />
   </CoverRow>
   <CoverRow label="특이사항" last>
     <EditableField
       value={estimate.memo ?? ''}
       onChange={v => onUpdate('memo', v)}
       placeholder="메모/특이사항"
     />
   </CoverRow>
   ```

   "공 사 명" 행의 last={true}를 제거하고, 새로 추가된 마지막 행에 last 적용.

2. 반응형 확인:
   - 좌측 w-[45%]는 갤럭시탭(1200px)에서 약 540px → 충분한 공간
   - EditableField의 input은 w-full이므로 자동 적용됨
   - 추가 행 4개가 늘어도 세로 공간 문제 없음

3. 200줄 초과 시: 기존 빈 행/비고 등을 축약하여 줄수 조정. 현재 212줄이면 Brand Collaborations 섹션을 별도 컴포넌트로 분리하거나 축약.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>CoverSheet에서 고객명/담당자/연락처/메모 4개 필드가 편집 가능하고, 갤럭시탭 기준 레이아웃 정상. 빌드 성공.</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. CoverSheet에서 고객명 입력 → updateMeta 호출 확인
3. 담당자/연락처/메모 모두 편집 가능 확인
4. CoverSheet.tsx 200줄 이내 확인
</verification>

<success_criteria>
- customer_name, manager_name, manager_phone, memo 4개 필드 편집 가능
- 기존 EditableField 패턴 사용
- 갤럭시탭 기준 레이아웃 깨지지 않음
- CoverSheet.tsx 200줄 이내
- npm run build 통과
</success_criteria>

<output>
After completion, create `.planning/phases/08-manual-edit/19-SUMMARY.md`
</output>
