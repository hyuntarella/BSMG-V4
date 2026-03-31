---
phase: 07-proposal
plan: 12
type: execute
wave: 2
depends_on: [11]
files_modified:
  - app/api/proposal/config/route.ts
  - app/api/proposal/photo/route.ts
  - app/api/proxy-images/route.ts
  - components/proposal/ProposalEditor.tsx
autonomous: true
requirements: [PROP-02]
must_haves:
  truths:
    - "제안서 설정(proposal_config)을 서버에서 로드/저장할 수 있다"
    - "사진 업로드 시 Supabase Storage에 저장되고 URL이 반환된다"
    - "외부 이미지 URL을 base64로 변환할 수 있다 (CORS 우회)"
    - "ProposalEditor에서 google.script.run이 0개"
  artifacts:
    - path: "app/api/proposal/config/route.ts"
      provides: "제안서 설정 CRUD API"
      exports: ["GET", "POST"]
    - path: "app/api/proposal/photo/route.ts"
      provides: "사진 업로드 API"
      exports: ["POST"]
    - path: "app/api/proxy-images/route.ts"
      provides: "이미지 프록시 API (CORS 우회)"
      exports: ["POST"]
  key_links:
    - from: "components/proposal/ProposalEditor.tsx"
      to: "/api/proposal/config"
      via: "fetch"
      pattern: "fetch.*api/proposal/config"
    - from: "components/proposal/ProposalEditor.tsx"
      to: "/api/proposal/photo"
      via: "fetch"
      pattern: "fetch.*api/proposal/photo"
---

<objective>
제안서의 5개 google.script.run 호출을 Next.js API route로 대체한다.

Purpose: GAS 의존 완전 제거. 모든 서버 호출이 자체 API route를 통해 이루어져야 한다.
Output: 3개 API route + ProposalEditor에서 fetch() 호출로 교체
</objective>

<execution_context>
@C:/Users/나/BSMG-V4/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/나/BSMG-V4/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@lib/supabase/server.ts
@lib/gdrive/client.ts

GAS 호출 5개 매핑:
1. proposal_getConfig → GET /api/proposal/config
2. proposal_saveConfig → POST /api/proposal/config
3. proposal_savePhoto → POST /api/proposal/photo
4. proposal_proxyImages → POST /api/proxy-images
5. proposal_savePdf → POST /api/proposal/pdf (Plan 14에서 구현)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 제안서 설정/사진/프록시 API route 3개 생성</name>
  <files>app/api/proposal/config/route.ts, app/api/proposal/photo/route.ts, app/api/proxy-images/route.ts</files>
  <action>
1. GET/POST /api/proposal/config:
   - Supabase에 proposal_config 테이블이 없으므로, Supabase Storage에 JSON 파일로 저장하는 방식 사용:
     - GET: supabase.storage.from('proposals').download('config/proposal-config.json')
       - 파일 없으면 빈 기본 설정 반환: {}
     - POST: body로 받은 JSON을 supabase.storage.from('proposals').upload('config/proposal-config.json', ..., { upsert: true })
   - service role 사용 (RLS bypass)

2. POST /api/proposal/photo:
   - multipart/form-data로 파일 받기 (request.formData())
   - Supabase Storage 'proposals' 버킷에 업로드:
     ```typescript
     const file = formData.get('file') as File;
     const buffer = Buffer.from(await file.arrayBuffer());
     const path = `photos/${Date.now()}_${file.name}`;
     await supabase.storage.from('proposals').upload(path, buffer, {
       contentType: file.type,
       upsert: false,
     });
     const { data: urlData } = supabase.storage.from('proposals').getPublicUrl(path);
     return NextResponse.json({ url: urlData.publicUrl });
     ```

3. POST /api/proxy-images:
   - body: { urls: string[] }
   - 각 URL을 서버에서 fetch → arrayBuffer → base64 변환
   - 응답: { images: { url: string, base64: string }[] }
   - 실패한 URL은 skip (빈 base64 반환)
   - 타임아웃 5초 per image (AbortController)
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx tsc --noEmit app/api/proposal/config/route.ts app/api/proposal/photo/route.ts app/api/proxy-images/route.ts 2>&1 | head -20</automated>
  </verify>
  <done>3개 API route 파일이 생성되고 타입 체크 통과</done>
</task>

<task type="auto">
  <name>Task 2: ProposalEditor에서 google.script.run을 fetch()로 교체</name>
  <files>components/proposal/ProposalEditor.tsx</files>
  <action>
1. Plan 11에서 TODO 주석으로 마킹된 google.script.run 호출 4개를 교체:
   (5번째 proposal_savePdf는 Plan 14에서 교체)

   a. proposal_getConfig:
      ```typescript
      const res = await fetch('/api/proposal/config');
      const config = await res.json();
      ```

   b. proposal_saveConfig:
      ```typescript
      await fetch('/api/proposal/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      ```

   c. proposal_savePhoto:
      ```typescript
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/proposal/photo', { method: 'POST', body: formData });
      const { url } = await res.json();
      ```

   d. proposal_proxyImages:
      ```typescript
      const res = await fetch('/api/proxy-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const { images } = await res.json();
      ```

2. proposal_savePdf는 TODO 주석 유지 (Plan 14에서 교체)

3. GAS 전용 코드 (withSuccessHandler, withFailureHandler) 제거
   - fetch의 try/catch + .ok 체크로 대체
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>google.script.run 호출이 proposal_savePdf 1개(TODO)만 남고 나머지 4개는 fetch()로 교체됨. 빌드 통과</done>
</task>

</tasks>

<verification>
- npm run build 통과
- ProposalEditor.tsx에서 "google.script.run" 문자열이 TODO 주석 1개(savePdf)만 존재
- 3개 API route 파일 존재
</verification>

<success_criteria>
- 제안서 설정 로드/저장이 Supabase Storage를 통해 동작
- 사진 업로드가 Supabase Storage에 저장되고 URL 반환
- 외부 이미지 프록시가 base64로 변환
- google.script.run이 savePdf 1개만 남음
</success_criteria>

<output>
After completion, create `.planning/phases/07-proposal/07-12-SUMMARY.md`
</output>
