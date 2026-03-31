---
phase: 06-pdf-output
plan: 10
type: execute
wave: 2
depends_on: [09]
files_modified:
  - app/api/estimates/[id]/generate/route.ts
  - components/estimate/EstimateEditor.tsx
autonomous: true
requirements: [PDF-02]
must_haves:
  truths:
    - "저장 시 PDF가 Supabase Storage + Google Drive에 업로드된다"
    - "견적서 편집 화면에서 PDF 다운로드 버튼을 누르면 PDF가 다운로드된다"
  artifacts:
    - path: "app/api/estimates/[id]/generate/route.ts"
      provides: "기존 generate route에 PDF 생성+업로드 추가"
    - path: "components/estimate/EstimateEditor.tsx"
      provides: "PDF 다운로드 버튼"
  key_links:
    - from: "app/api/estimates/[id]/generate/route.ts"
      to: "lib/pdf/generatePdf.ts"
      via: "generatePdfBuffer import"
      pattern: "import.*generatePdfBuffer.*from.*lib/pdf/generatePdf"
    - from: "components/estimate/EstimateEditor.tsx"
      to: "/api/estimates/[id]/pdf"
      via: "fetch call on button click"
      pattern: "fetch.*api/estimates.*pdf"
---

<objective>
PDF를 Storage/Drive에 업로드하고 견적서 화면에 PDF 다운로드 버튼을 추가한다.

Purpose: 저장 시 PDF도 함께 생성하여 Drive에 보관하고, 사용자가 직접 PDF를 다운로드할 수 있어야 한다.
Output: generate route에 PDF 업로드 추가 + EstimateEditor에 PDF 다운로드 버튼
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@app/api/estimates/[id]/generate/route.ts
@components/estimate/EstimateEditor.tsx
@lib/pdf/generatePdf.ts
@lib/gdrive/client.ts

<interfaces>
From lib/pdf/generatePdf.ts (Plan 09에서 추가):
```typescript
export function generateEstimateHtml(estimate: Estimate): string;
export async function generatePdfBuffer(html: string): Promise<Buffer>;
```

From lib/gdrive/client.ts:
```typescript
export async function uploadToDrive(folderId: string, fileName: string, mimeType: string, content: Buffer | string): Promise<{ id: string; name: string; url: string }>;
export function getEstimateFolderId(): string;
```

From app/api/estimates/[id]/generate/route.ts:
```typescript
// 현재: 엑셀 + HTML + JSON을 Supabase Storage에 업로드 + Drive에 엑셀만 업로드
// 수정: PDF도 Supabase Storage + Drive에 업로드 추가
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: generate route에 PDF 생성 + 업로드 추가</name>
  <files>app/api/estimates/[id]/generate/route.ts</files>
  <action>
1. 기존 generate/route.ts에 PDF 생성 로직 추가:
   - import { generatePdfBuffer } from '@/lib/pdf/generatePdf' 추가
   - 엑셀 생성 이후, HTML 생성 직후에 PDF 생성:
     ```typescript
     const pdfBuffer = await generatePdfBuffer(html);
     ```
   - Supabase Storage에 PDF 업로드:
     ```typescript
     const pdfPath = `${folderPath}/견적서_${mgmtNo}.pdf`
     await supabase.storage.from('estimates').upload(pdfPath, pdfBuffer, {
       contentType: 'application/pdf',
       upsert: true,
     })
     ```
   - Google Drive에도 PDF 업로드 (기존 엑셀 업로드 블록 내에 추가):
     ```typescript
     // 엑셀 Drive 업로드 후 PDF도 Drive 업로드
     await uploadToDrive(driveFolderId, `견적서_${mgmtNo}.pdf`, 'application/pdf', pdfBuffer)
     ```
   - Drive PDF 업로드 실패 시 무시 (기존 패턴대로 try/catch)

2. DB 업데이트 시 pdf_url을 실제 PDF URL로 변경:
   - 현재: pdf_url에 HTML URL을 저장하고 있음
   - 변경: pdf_url에 실제 PDF public URL 저장

3. 응답에 pdf_url 포함

4. maxDuration = 60 설정 (엑셀+PDF 모두 생성하므로 여유 확보)
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>generate route가 엑셀+PDF 모두 생성하고 Storage/Drive에 업로드. pdf_url이 실제 PDF를 가리킴</done>
</task>

<task type="auto">
  <name>Task 2: EstimateEditor에 PDF 다운로드 버튼 추가</name>
  <files>components/estimate/EstimateEditor.tsx</files>
  <action>
1. 저장 버튼 옆에 "PDF" 다운로드 버튼 추가:
   - 위치: 저장 버튼과 이메일 버튼 사이
   - 스타일: 기존 이메일 버튼과 동일한 border 스타일 (rounded border border-brand px-3 py-1 text-xs)
   - 텍스트: "PDF"
   - disabled: !estimate.id 이거나 saving 상태

2. 클릭 핸들러 handlePdfDownload:
   ```typescript
   const handlePdfDownload = useCallback(async () => {
     if (!estimate.id) return;
     try {
       const res = await fetch(`/api/estimates/${estimate.id}/pdf`, { method: 'POST' });
       if (!res.ok) throw new Error('PDF 생성 실패');
       const blob = await res.blob();
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `견적서_${estimate.mgmt_no ?? estimate.id.slice(0, 8)}.pdf`;
       a.click();
       URL.revokeObjectURL(url);
     } catch (err) {
       console.error('PDF 다운로드 실패:', err);
     }
   }, [estimate.id, estimate.mgmt_no]);
   ```

3. 기존 코드 수정 최소화 — 버튼 JSX 한 블록만 추가
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>PDF 버튼이 저장/이메일 버튼 사이에 표시되고, 클릭 시 /api/estimates/[id]/pdf를 호출하여 PDF 다운로드</done>
</task>

</tasks>

<verification>
- npm run build 통과
- generate/route.ts에 generatePdfBuffer import + PDF 업로드 로직 존재
- EstimateEditor.tsx에 PDF 다운로드 버튼 존재
</verification>

<success_criteria>
- 저장 시 PDF가 Supabase Storage + Google Drive에 업로드된다
- 견적서 편집 화면에서 PDF 버튼 클릭 시 PDF가 다운로드된다
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/phases/06-pdf-output/06-10-SUMMARY.md`
</output>
