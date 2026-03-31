---
phase: 07-proposal
plan: 13
type: execute
wave: 2
depends_on: [11]
files_modified:
  - components/estimate/EstimateEditor.tsx
  - components/proposal/ProposalEditor.tsx
autonomous: true
requirements: [PROP-03]
must_haves:
  truths:
    - "견적서 페이지에서 '제안서 작성' 버튼 클릭 시 /proposal?address=...&manager=...로 이동한다"
    - "제안서 페이지에서 URL params(address, manager)를 읽어 해당 필드에 자동 채운다"
  artifacts:
    - path: "components/estimate/EstimateEditor.tsx"
      provides: "제안서 작성 버튼"
    - path: "components/proposal/ProposalEditor.tsx"
      provides: "URL params 자동 채우기 로직"
  key_links:
    - from: "components/estimate/EstimateEditor.tsx"
      to: "/proposal"
      via: "router.push with query params"
      pattern: "router.push.*proposal.*address"
---

<objective>
견적서/CRM에서 제안서로 데이터(주소 + 담당자)를 전달하는 연결을 구현한다.

Purpose: 견적서에서 제안서를 작성할 때 주소와 담당자를 다시 입력할 필요 없이 자동 전달되어야 한다.
Output: 견적서 페이지에 "제안서 작성" 버튼 + 제안서 페이지에서 URL params 자동 채우기
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@components/estimate/EstimateEditor.tsx

<interfaces>
From components/estimate/EstimateEditor.tsx:
```typescript
// 버튼 영역 (line 117-144): 저장, PDF, 이메일, + 복합, + 우레탄 버튼이 있는 div
// estimate 객체에서 site_name(주소), manager_name(담당자) 사용
```

견적서→제안서 전달 필드:
- address: estimate.site_name (현장명/주소)
- manager: estimate.manager_name (담당자)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 견적서에 "제안서 작성" 버튼 추가</name>
  <files>components/estimate/EstimateEditor.tsx</files>
  <action>
1. EstimateEditor.tsx 상단에 useRouter import 추가 (이미 있으면 스킵):
   ```typescript
   import { useRouter } from 'next/navigation';
   ```

2. 컴포넌트 내에서 router 선언:
   ```typescript
   const router = useRouter();
   ```

3. 이메일 버튼 뒤에 "제안서" 버튼 추가:
   ```tsx
   <button
     onClick={() => {
       const params = new URLSearchParams();
       if (estimate.site_name) params.set('address', estimate.site_name);
       if (estimate.manager_name) params.set('manager', estimate.manager_name);
       router.push(`/proposal${params.toString() ? '?' + params.toString() : ''}`);
     }}
     disabled={!estimate.id}
     className="rounded border border-green-600 px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50"
   >
     제안서
   </button>
   ```

4. 기존 코드 수정 최소화 — 버튼 JSX 한 블록만 추가
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>견적서 편집 화면에 "제안서" 버튼이 표시되고, 클릭 시 /proposal?address=...&manager=...로 이동</done>
</task>

<task type="auto">
  <name>Task 2: ProposalEditor에서 URL params 자동 채우기</name>
  <files>components/proposal/ProposalEditor.tsx</files>
  <action>
1. ProposalEditor에서 useSearchParams import:
   ```typescript
   import { useSearchParams } from 'next/navigation';
   ```

2. 컴포넌트 내에서 searchParams 읽기:
   ```typescript
   const searchParams = useSearchParams();
   ```

3. useEffect에서 URL params를 state에 반영:
   ```typescript
   useEffect(() => {
     const address = searchParams.get('address');
     const manager = searchParams.get('manager');
     if (address) {
       // 제안서의 주소 필드 state에 반영
       // 기존 제안서.html에서 주소 필드를 관리하는 state 변수명 확인 후 사용
       setAddress(address); // 또는 해당 state setter
     }
     if (manager) {
       setManager(manager); // 또는 해당 state setter
     }
   }, [searchParams]);
   ```

4. 주의: 기존 제안서.html의 state 구조를 분석하여 정확한 필드명에 매핑
   - 제안서.html에서 "주소" 또는 "현장주소" 관련 state 찾기
   - 제안서.html에서 "담당자" 관련 state 찾기
   - 없으면 config 객체 내의 적절한 필드에 매핑

5. CRM→제안서 연결은 Phase 25 이후 CRM이 구현된 뒤 추가 (이 태스크에서는 견적서→제안서만)
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>ProposalEditor가 URL params에서 address/manager를 읽어 해당 필드에 자동 채움. 빌드 통과</done>
</task>

</tasks>

<verification>
- npm run build 통과
- EstimateEditor.tsx에 "제안서" 버튼 존재
- ProposalEditor.tsx에서 useSearchParams로 address/manager 읽는 코드 존재
</verification>

<success_criteria>
- 견적서에서 "제안서" 버튼 클릭 → /proposal?address=현장명&manager=담당자 이동
- 제안서 페이지에서 주소/담당자 필드가 자동으로 채워짐
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/phases/07-proposal/07-13-SUMMARY.md`
</output>
