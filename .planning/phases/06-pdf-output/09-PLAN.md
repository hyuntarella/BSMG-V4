---
phase: 06-pdf-output
plan: 09
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - app/api/estimates/[id]/pdf/route.ts
  - lib/pdf/generatePdf.ts
autonomous: true
requirements: [PDF-01]
must_haves:
  truths:
    - "POST /api/estimates/[id]/pdf 호출 시 PDF 바이너리가 반환된다"
    - "PDF에 견적서 표지 + 시트별 공종 테이블이 포함된다"
  artifacts:
    - path: "app/api/estimates/[id]/pdf/route.ts"
      provides: "견적서 PDF 생성 API"
      exports: ["POST"]
    - path: "lib/pdf/generatePdf.ts"
      provides: "HTML 생성 함수 (기존) + PDF 생성 함수 (신규)"
      exports: ["generateEstimateHtml", "generatePdfBuffer"]
  key_links:
    - from: "app/api/estimates/[id]/pdf/route.ts"
      to: "lib/pdf/generatePdf.ts"
      via: "generatePdfBuffer import"
      pattern: "import.*generatePdfBuffer.*from.*lib/pdf/generatePdf"
---

<objective>
견적서 PDF 생성 API를 구현한다.

Purpose: 견적서를 PDF 파일로 출력해야 고객에게 이메일 발송하거나 다운로드할 수 있다.
Output: POST /api/estimates/[id]/pdf 엔드포인트 — 견적서 데이터를 로드하고 PDF buffer를 생성하여 반환한다.
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@app/api/estimates/[id]/generate/route.ts
@lib/pdf/generatePdf.ts
@lib/estimate/types.ts

<interfaces>
From lib/pdf/generatePdf.ts:
```typescript
export function generateEstimateHtml(estimate: Estimate): string;
```

From app/api/estimates/[id]/generate/route.ts:
```typescript
// Estimate 데이터 로드 패턴: supabase.from('estimates').select('*') → sheets → items
// 이 패턴을 PDF route에서도 동일하게 사용
```

From lib/gdrive/client.ts:
```typescript
export async function uploadToDrive(folderId: string, fileName: string, mimeType: string, content: Buffer | string): Promise<{ id: string; name: string; url: string }>;
export function getEstimateFolderId(): string;
export function getProposalFolderId(): string;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: puppeteer-core + chromium-min 설치 및 PDF 생성 함수</name>
  <files>package.json, lib/pdf/generatePdf.ts</files>
  <action>
1. npm install puppeteer-core @sparticuz/chromium-min (dependencies, not dev)
   - Vercel 서버리스에서 html2canvas+jspdf는 DOM 필요해서 동작 안 함
   - puppeteer-core + @sparticuz/chromium-min 조합이 서버리스 PDF 생성 표준

2. lib/pdf/generatePdf.ts에 generatePdfBuffer 함수 추가:
   ```typescript
   export async function generatePdfBuffer(html: string): Promise<Buffer> {
     const chromium = await import('@sparticuz/chromium-min');
     const puppeteer = await import('puppeteer-core');

     const browser = await puppeteer.default.launch({
       args: chromium.default.args,
       defaultViewport: chromium.default.defaultViewport,
       executablePath: await chromium.default.executablePath(
         'https://github.com/nichochar/chromium-min-repro/releases/download/v131.0.2/chromium-v131.0.2-pack.tar'
       ),
       headless: true,
     });

     const page = await browser.newPage();
     await page.setContent(html, { waitUntil: 'networkidle0' });
     const pdf = await page.pdf({
       format: 'A4',
       printBackground: true,
       margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
     });
     await browser.close();
     return Buffer.from(pdf);
   }
   ```
   - 기존 generateEstimateHtml 함수는 수정하지 않는다
   - chromium binary URL은 @sparticuz/chromium-min 공식 릴리즈 사용
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit lib/pdf/generatePdf.ts 2>&1 | head -20</automated>
  </verify>
  <done>generatePdfBuffer 함수가 lib/pdf/generatePdf.ts에 export되고 타입 체크 통과</done>
</task>

<task type="auto">
  <name>Task 2: POST /api/estimates/[id]/pdf 엔드포인트</name>
  <files>app/api/estimates/[id]/pdf/route.ts</files>
  <action>
1. app/api/estimates/[id]/pdf/route.ts 생성
2. generate/route.ts의 견적서 데이터 로드 패턴을 그대로 사용:
   - supabase (service role) → estimates → estimate_sheets → estimate_items
   - Estimate 객체 조립
3. generateEstimateHtml(estimate) → HTML 문자열
4. generatePdfBuffer(html) → PDF Buffer
5. NextResponse로 application/pdf 반환:
   ```typescript
   return new NextResponse(pdfBuffer, {
     headers: {
       'Content-Type': 'application/pdf',
       'Content-Disposition': `inline; filename="견적서_${mgmtNo}.pdf"`,
     },
   });
   ```
6. 에러 처리: 견적서 없으면 404, 생성 실패 시 500
7. Vercel 서버리스 타임아웃 고려: maxDuration 설정
   ```typescript
   export const maxDuration = 30; // 30초 (PDF 생성 시간 확보)
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>npm run build 통과. POST /api/estimates/[id]/pdf 엔드포인트가 존재하고 PDF binary를 반환하는 코드 완성</done>
</task>

</tasks>

<verification>
- npm run build 통과
- app/api/estimates/[id]/pdf/route.ts 파일 존재
- lib/pdf/generatePdf.ts에 generatePdfBuffer export 존재
- package.json에 puppeteer-core, @sparticuz/chromium-min 의존성 존재
</verification>

<success_criteria>
- POST /api/estimates/[id]/pdf 엔드포인트가 견적서 데이터를 로드하고 PDF buffer를 생성하여 반환
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/phases/06-pdf-output/06-09-SUMMARY.md`
</output>
