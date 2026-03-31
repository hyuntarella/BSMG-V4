---
phase: 07-proposal
plan: 14
type: execute
wave: 3
depends_on: [12]
files_modified:
  - app/api/proposal/pdf/route.ts
  - components/proposal/ProposalEditor.tsx
autonomous: true
requirements: [PROP-04]
must_haves:
  truths:
    - "제안서 PDF가 Supabase Storage + Google Drive에 저장된다"
    - "ProposalEditor에서 google.script.run 호출이 0개"
  artifacts:
    - path: "app/api/proposal/pdf/route.ts"
      provides: "제안서 PDF 저장 API"
      exports: ["POST"]
  key_links:
    - from: "components/proposal/ProposalEditor.tsx"
      to: "/api/proposal/pdf"
      via: "fetch"
      pattern: "fetch.*api/proposal/pdf"
    - from: "app/api/proposal/pdf/route.ts"
      to: "lib/gdrive/client.ts"
      via: "uploadToDrive import"
      pattern: "import.*uploadToDrive.*from.*lib/gdrive/client"
---

<objective>
제안서 PDF를 Supabase Storage + Google Drive에 저장하고, 마지막 google.script.run 호출을 제거한다.

Purpose: GAS 의존을 완전히 제거하고, 제안서 PDF를 자체 인프라에 저장한다.
Output: POST /api/proposal/pdf API route + ProposalEditor에서 fetch 호출로 완전 교체
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@lib/gdrive/client.ts
@app/api/estimates/[id]/generate/route.ts

<interfaces>
From lib/gdrive/client.ts:
```typescript
export async function uploadToDrive(folderId: string, fileName: string, mimeType: string, content: Buffer | string): Promise<{ id: string; name: string; url: string }>;
export function getProposalFolderId(): string; // GOOGLE_DRIVE_PROPOSAL_FOLDER_ID
```

기존 제안서.html의 proposal_savePdf 호출 패턴:
- 클라이언트에서 html2canvas + jsPDF로 PDF를 base64로 생성
- base64 문자열을 서버에 전송
- 서버에서 Google Drive에 저장
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: POST /api/proposal/pdf — base64 PDF를 Storage + Drive에 저장</name>
  <files>app/api/proposal/pdf/route.ts</files>
  <action>
1. app/api/proposal/pdf/route.ts 생성:

2. Request body:
   ```typescript
   interface ProposalPdfRequest {
     pdfBase64: string;  // data:application/pdf;base64,... 또는 순수 base64
     fileName: string;   // 예: "제안서_김철수_260331.pdf"
   }
   ```

3. base64 → Buffer 변환:
   ```typescript
   const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
   const pdfBuffer = Buffer.from(base64Data, 'base64');
   ```

4. Supabase Storage 업로드:
   ```typescript
   const storagePath = `pdfs/${fileName}`;
   await supabase.storage.from('proposals').upload(storagePath, pdfBuffer, {
     contentType: 'application/pdf',
     upsert: true,
   });
   const { data: urlData } = supabase.storage.from('proposals').getPublicUrl(storagePath);
   ```

5. Google Drive 업로드 (기존 generate/route.ts 패턴 참조):
   ```typescript
   let driveUrl = '';
   if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
     try {
       const folderId = getProposalFolderId();
       const drivePromise = uploadToDrive(folderId, fileName, 'application/pdf', pdfBuffer);
       const timeoutPromise = new Promise<never>((_, reject) =>
         setTimeout(() => reject(new Error('Drive 타임아웃')), 10000)
       );
       const result = await Promise.race([drivePromise, timeoutPromise]);
       driveUrl = result.url;
     } catch (err) {
       console.error('Drive 업로드 실패 (무시):', err);
     }
   }
   ```

6. 응답:
   ```typescript
   return NextResponse.json({
     success: true,
     storage_url: urlData.publicUrl,
     drive_url: driveUrl || undefined,
   });
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit app/api/proposal/pdf/route.ts 2>&1 | head -20</automated>
  </verify>
  <done>POST /api/proposal/pdf가 base64 PDF를 받아 Supabase Storage + Google Drive에 저장. 타입 체크 통과</done>
</task>

<task type="auto">
  <name>Task 2: ProposalEditor에서 proposal_savePdf를 API 호출로 교체</name>
  <files>components/proposal/ProposalEditor.tsx</files>
  <action>
1. Plan 12에서 TODO 주석으로 남긴 proposal_savePdf 호출을 찾는다

2. fetch 호출로 교체:
   ```typescript
   const savePdf = async (pdfBase64: string, fileName: string) => {
     const res = await fetch('/api/proposal/pdf', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ pdfBase64, fileName }),
     });
     if (!res.ok) throw new Error('PDF 저장 실패');
     const data = await res.json();
     return data;
   };
   ```

3. 기존 성공/실패 핸들러(withSuccessHandler/withFailureHandler)를 try/catch로 대체

4. 확인: ProposalEditor.tsx에서 "google.script.run" 문자열이 0개인지 grep으로 확인

5. TODO 주석도 제거
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -20 && echo "---" && grep -c "google.script.run" components/proposal/ProposalEditor.tsx 2>/dev/null || echo "0 occurrences"</automated>
  </verify>
  <done>google.script.run 호출이 ProposalEditor에서 완전히 제거됨 (0개). 빌드 통과</done>
</task>

</tasks>

<verification>
- npm run build 통과
- app/api/proposal/pdf/route.ts 존재
- ProposalEditor.tsx에 google.script.run 문자열 0개
- PDF가 Supabase Storage + Google Drive에 저장되는 코드 존재
</verification>

<success_criteria>
- 제안서 PDF 저장 시 Supabase Storage + Google Drive에 업로드
- ProposalEditor에서 GAS 의존 코드가 완전히 제거됨
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/phases/07-proposal/07-14-SUMMARY.md`
</output>
