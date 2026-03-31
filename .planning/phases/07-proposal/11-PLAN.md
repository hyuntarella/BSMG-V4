---
phase: 07-proposal
plan: 11
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(authenticated)/proposal/page.tsx
  - app/(authenticated)/proposal/proposal.css
  - components/proposal/ProposalEditor.tsx
autonomous: true
requirements: [PROP-01]
must_haves:
  truths:
    - "/proposal 페이지가 브라우저에서 로드된다"
    - "제안서 UI가 기존 제안서.html과 동일하게 렌더링된다"
    - "기존 CSS 스타일이 1:1 유지된다"
  artifacts:
    - path: "app/(authenticated)/proposal/page.tsx"
      provides: "제안서 페이지 SSR wrapper"
      min_lines: 10
    - path: "components/proposal/ProposalEditor.tsx"
      provides: "제안서 에디터 클라이언트 컴포넌트"
      min_lines: 100
    - path: "app/(authenticated)/proposal/proposal.css"
      provides: "제안서 스타일시트"
      min_lines: 50
  key_links:
    - from: "app/(authenticated)/proposal/page.tsx"
      to: "components/proposal/ProposalEditor.tsx"
      via: "dynamic import"
      pattern: "import.*ProposalEditor"
---

<objective>
제안서.html(1.4MB React+Babel 단일 파일)을 Next.js 페이지로 포팅한다.

Purpose: GAS 의존 제거. 제안서를 Next.js 앱 내에서 직접 편집/출력할 수 있어야 한다.
Output: /proposal 페이지 + ProposalEditor 컴포넌트 + CSS 파일. 디자인 1:1 유지.
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md

참조 원본: C:/Users/나/BSMG-V4/슈퍼앱-복사본/제안서.html (1.4MB)
- React 18 + Babel (text/babel), html2canvas, jsPDF CDN 로드
- google.script.run 5개 호출: proposal_getConfig, proposal_saveConfig, proposal_savePhoto, proposal_proxyImages, proposal_savePdf
- Figma 이미지 URL ASSETS 상수 (변경 불필요)
- 스타일: 인라인 <style> 블록 (CSS reset + 제안서 전용 스타일)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 제안서.html의 style 블록을 proposal.css로 추출</name>
  <files>app/(authenticated)/proposal/proposal.css</files>
  <action>
1. C:/Users/나/BSMG-V4/슈퍼앱-복사본/제안서.html을 읽는다
2. 파일 내 모든 `<style>...</style>` 블록의 CSS 내용을 추출한다
3. app/(authenticated)/proposal/proposal.css로 저장한다
4. 주의사항:
   - CSS 수정 최소화. 원본 그대로 복사한다
   - Tailwind와 충돌할 수 있는 전역 reset이 있으면, 제안서 컴포넌트를 감싸는 wrapper class (예: .proposal-editor) 안으로 scope한다
   - @font-face, @import 등 외부 리소스 URL은 그대로 유지
   - body/html 대상 전역 스타일이 있으면 .proposal-editor로 변경
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && test -f "app/(authenticated)/proposal/proposal.css" && echo "CSS file exists" || echo "MISSING"</automated>
  </verify>
  <done>proposal.css 파일이 생성되고 제안서.html의 모든 스타일이 포함됨</done>
</task>

<task type="auto">
  <name>Task 2: React+Babel 코드를 TypeScript 컴포넌트로 변환</name>
  <files>app/(authenticated)/proposal/page.tsx, components/proposal/ProposalEditor.tsx</files>
  <action>
1. 제안서.html의 `<script type="text/babel">` 내 React 코드를 분석한다:
   - 최상위 App 컴포넌트 + 하위 컴포넌트 식별
   - useState, useEffect, useRef 등 hooks 사용 패턴 파악
   - google.script.run 호출 5개 위치 파악 (Plan 12에서 교체)

2. components/proposal/ProposalEditor.tsx 생성:
   - 'use client' 선언
   - React.createElement 호출을 JSX로 변환
   - 모든 변수/함수에 TypeScript 타입 추가 (any 금지)
   - google.script.run 호출은 일단 TODO 주석으로 마킹:
     ```typescript
     // TODO: Plan 12에서 API route로 교체
     // google.script.run.proposal_getConfig(...)
     ```
   - CDN 의존성 (html2canvas, jsPDF)은 dynamic import로 교체:
     ```typescript
     const html2canvas = (await import('html2canvas')).default;
     const jsPDF = (await import('jspdf')).default;
     ```
     (html2canvas, jspdf는 Phase 9에서 설치됨 — 미설치 시 이 태스크에서 npm install)
   - ASSETS 상수 (Figma 이미지 URL)는 그대로 유지
   - import './proposal.css' 추가 (page.tsx가 아닌 ProposalEditor에서)

3. app/(authenticated)/proposal/page.tsx 생성:
   - 서버 컴포넌트
   - ProposalEditor를 dynamic import (SSR: false — html2canvas는 브라우저 전용)
   ```typescript
   import dynamic from 'next/dynamic';
   const ProposalEditor = dynamic(() => import('@/components/proposal/ProposalEditor'), { ssr: false });
   export default function ProposalPage() {
     return <ProposalEditor />;
   }
   ```

4. 파일당 200줄 규칙: ProposalEditor가 200줄 초과 시 하위 컴포넌트를 components/proposal/ 하위에 분리:
   - ProposalCover.tsx (표지)
   - ProposalSection.tsx (섹션별)
   - ProposalPhotoGrid.tsx (사진 그리드) 등
   - 분리 시에도 원본 레이아웃/로직 1:1 유지

5. 주의: 디자인 1:1 유지 필수. CSS 수정 최소화. 레이아웃 변경 금지.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -30</automated>
  </verify>
  <done>npm run build 통과. /proposal 페이지가 빌드되고, ProposalEditor가 클라이언트 컴포넌트로 렌더링됨. google.script.run은 TODO 주석 상태</done>
</task>

</tasks>

<verification>
- npm run build 통과
- app/(authenticated)/proposal/page.tsx 존재
- components/proposal/ProposalEditor.tsx 존재 ('use client' 선언)
- app/(authenticated)/proposal/proposal.css 존재
- google.script.run 호출이 TODO 주석으로 마킹됨
</verification>

<success_criteria>
- /proposal 페이지가 빌드되고 브라우저에서 로드 가능
- 제안서 UI가 기존과 동일하게 렌더링됨
- GAS 의존 코드는 TODO 마킹 (Plan 12에서 교체)
</success_criteria>

<output>
After completion, create `.planning/phases/07-proposal/07-11-SUMMARY.md`
</output>
