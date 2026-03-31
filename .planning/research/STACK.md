# Technology Stack Research

**Project:** 방수명가 견적서 v4 — Voice-Driven Construction Estimate System
**Researched:** 2026-03-30
**Research Type:** Ecosystem — existing Next.js 14 + Supabase app, adding features

---

## Existing Stack (Locked — Do Not Change)

The following is already deployed and working. These are constraints, not recommendations.

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 14.2.35 (App Router) | Framework |
| React | 18.3.1 | UI |
| TypeScript | 5.9.3 (strict) | Language |
| Tailwind CSS | 3.4.19 | Styling |
| @supabase/supabase-js | 2.100.0 | DB + Auth + Storage |
| @supabase/ssr | 0.9.0 | SSR auth helpers |
| OpenAI (STT) | gpt-4o-transcribe | Speech-to-text |
| Anthropic Claude | claude-sonnet | Command parsing/LLM |
| OpenAI (TTS) | gpt-4o-mini-tts | Text-to-speech |
| ExcelJS | 4.4.0 | XLSX generation |
| googleapis | 171.4.0 | Google Drive upload |
| Resend | 6.9.4 | Email (out of scope currently) |

---

## Research Domain 1: Voice Command Pipeline

### Current State

The voice pipeline is structurally correct (MediaRecorder → base64 → /api/stt → /api/llm → command dispatch). The issue is the connection between voice output and UI state update, not the pipeline architecture.

### STT: gpt-4o-transcribe vs whisper-1

**Recommendation: Keep gpt-4o-transcribe (or upgrade snapshot to gpt-4o-mini-transcribe).**

Confidence: MEDIUM (OpenAI docs + community reports)

Findings:
- gpt-4o-transcribe achieves 2.46% WER on benchmarks vs whisper-1's higher error rates
- Better handling of Korean technical vocabulary (방수, 헤베, 복합시트, etc.)
- Accepts rich prompts (not just keyword hints) — current `sttPrompt` in useVoice.ts is more effective with gpt-4o-transcribe
- **Tradeoff:** No timestamps (not needed here), longer latency vs whisper-1 in some real-world reports
- `gpt-4o-mini-transcribe` (December 2025 snapshot) offers comparable accuracy at lower cost — worth testing
- whisper-1 is the safer fallback if latency is unacceptable in vehicle conditions

**Do NOT use:** OpenAI Realtime API. That is for speech-to-speech streaming, not for the sequential STT → LLM → TTS pattern this app uses. Adding it would require architectural redesign with no benefit for this use case.

### MediaRecorder: Cross-Browser Compatibility

**Finding: The current code is correct. One gap exists.**

Confidence: HIGH (MDN + caniuse + Safari 18.4 release notes)

- As of Safari 18.4 (2025), Chrome/Firefox/Safari all support `audio/webm;codecs=opus`
- The existing `MediaRecorder.isTypeSupported()` fallback in useVoice.ts is the right pattern
- **Gap:** Safari (Galaxy Tab runs Chrome/Samsung Browser, not Safari — this gap is irrelevant for the target device)
- Galaxy Tab S10 FE runs Android + Chrome or Samsung Internet (Chromium-based) — `audio/webm;codecs=opus` is fully supported

### Wake Word Detection: Web Speech API

**Recommendation: Keep the current Web Speech API approach. No additional library needed.**

Confidence: MEDIUM (MDN + Chromium intent docs)

- `SpeechRecognition` on Chrome Android 77+ is supported (Galaxy Tab is Chrome-based)
- The current `useWakeWord.ts` hook uses the correct API
- **Known limitation:** Web Speech API on Android sends audio to Google servers, cannot run fully offline
- **For this use case (in-vehicle, Korean):** Google's Korean recognition is excellent, latency is acceptable
- Picovoice Porcupine (custom wake word) is the upgrade path but requires a paid license and WASM bundle — defer as planned

### Hardware Button Recording

The volume key approach in CLAUDE.md is correct for Android:

```typescript
document.addEventListener('keydown', (e) => {
  if (e.key === 'VolumeUp' || e.key === 'VolumeDown') {
    e.preventDefault()
    toggleRecording()
  }
})
```

This works in Chrome on Android when the page is in fullscreen/PWA mode. Standard browser tabs may not intercept volume keys on all Android versions. Add a Bluetooth headset button handler (`MediaSession` API) for the remote clicker use case.

---

## Research Domain 2: Voice → React State Sync

### The Actual Problem

The codebase has correct architecture for state management:
- `useEstimate.ts` manages all estimate state with snapshot/undo
- `useVoice.ts` handles STT/LLM/TTS pipeline with callbacks
- `useVoiceFlow.ts` handles the guided flow (area, wall, ppp collection)
- `applyVoiceCommands` in useEstimate correctly calls `applyCommands` from lib/voice/commands.ts

The **connection is broken** because `useVoiceFlow` calls `initFromVoiceFlow` but the callback wiring in `EstimateEditor.tsx` may not be threading `onCommands` through to `applyVoiceCommands`.

### Recommendation: No State Management Library Needed

Confidence: HIGH (code inspection + 2025 consensus)

The existing `useState` + `useCallback` + `useRef` pattern in `useEstimate.ts` is correct for this use case. Do NOT add Zustand, Jotai, or Redux.

Rationale:
- Estimate state is fully localized to one page (`/estimate/[id]`)
- No cross-route sharing needed
- The snapshot/undo system is custom logic that hooks cleanly into `useState`
- Zustand adds no benefit here; it solves a problem (cross-component global state) that does not exist on a single-page editor

**The fix is wiring, not architecture:** `useVoiceFlow.onFlowComplete` → `initFromVoiceFlow` → estimate state update → re-render. This is a callback threading issue, not a state management problem.

### Auto-Save Pattern

The current `useAutoSave.ts` delete-and-reinsert strategy for `estimate_items` is functionally correct but has a race condition risk if the user triggers two saves in rapid succession. The `savingRef.current` guard mitigates this. The 1-second debounce is appropriate.

**One improvement needed:** The auto-save currently deletes all items and reinserts. If the network is slow, the UI shows items that have been deleted-but-not-yet-reinserted on the server. Use `upsert` with `on_conflict` instead of delete+insert for items that have a stable `id`. For new items (no `id`), insert normally.

---

## Research Domain 3: Excel and PDF Generation in Serverless

### Excel: ExcelJS (Keep)

Confidence: HIGH (Vercel docs + ExcelJS GitHub issues)

**Vercel serverless limits (current as of 2026-03-30):**
- Request/response body: **4.5 MB** (hard limit)
- Memory: 2 GB (Hobby), 4 GB (Pro) — default 2 GB
- Duration: 300s (Hobby), 800s (Pro with fluid compute)

**ExcelJS in serverless:**
- ExcelJS 4.4.0 works in Node.js serverless without issue for small-to-medium workbooks
- Memory issue documented on ExcelJS GitHub (#2953) occurs only with 500,000+ rows — the estimate workbook has ~20 rows, well within limits
- `writeBuffer()` returns an in-memory `Buffer` — safe for Vercel serverless
- The 4.5 MB response limit is a potential issue if the XLSX file exceeds this size. A 20-row estimate workbook is typically 30-80 KB, far below the limit
- **Upload to Storage, return URL** (not the file itself) — the current design in `/api/estimates/[id]/generate` is correct

**What NOT to do:** Do not switch to SheetJS (xlsx). ExcelJS has richer formatting API (borders, fonts, merged cells) needed to replicate the GAS template. SheetJS community edition lacks styling.

### PDF: @react-pdf/renderer (Add This)

Confidence: MEDIUM (npm docs + serverless PDF comparison)

The codebase has `lib/pdf/generatePdf.ts` planned but not implemented. The `CLAUDE.md` lists `@react-pdf/renderer OR puppeteer-core`.

**Recommendation: Use @react-pdf/renderer.**

| | @react-pdf/renderer | puppeteer-core + @sparticuz/chromium |
|---|---|---|
| Bundle size | ~2 MB | ~50-80 MB (Chromium) |
| Vercel compatibility | Yes, out of box | Requires @sparticuz/chromium, config |
| Korean font support | Yes, embed font file | Automatic (system fonts) |
| Layout fidelity | JSX-based, needs custom components | Pixel-perfect HTML render |
| Cold start | Fast | Slow (Chromium launch) |
| Serverless complexity | Low | High |

For this use case, the PDF is a formatted table document (not a pixel-perfect web page render). @react-pdf/renderer is the right tool.

**Korean font:** Must embed a Korean font (NanumGothic or Noto Sans KR) in the PDF. @react-pdf/renderer supports custom fonts via `Font.register()`. Download the .ttf file and include it in `public/fonts/`.

```bash
npm install @react-pdf/renderer
```

Current version: 4.3.0 (React 19 compatible since v4.1.0, works with React 18.3.1)

---

## Research Domain 4: Notion API Integration

### Current State

- Env vars are set: `NOTION_API_KEY`, `NOTION_DATABASE_ID` (inferred from worktree code)
- Worktree `flamboyant-lalande` has a complete implementation (`lib/notion/crm.ts`, API routes)
- Main branch `crm/page.tsx` shows "준비 중" placeholder — the worktree code needs to be merged

### @notionhq/client Version

Confidence: MEDIUM (npm + GitHub releases)

- Current stable: **v3.1.2** (May 2025) — this is the version to use
- v5.x exists but targets Notion API version 2025-09-03, which introduces breaking changes (multi-source databases, `data_source_id` requirement)
- **Do NOT upgrade to v5.x** unless Notion forces it. The existing CRM database is a standard database, not a multi-source database. v3.1.2 is stable and works with the existing integration.

```bash
npm install @notionhq/client@3.1.2
```

### Notion API Constraints

Confidence: HIGH (Notion official docs)

- Rate limit: **3 requests/second average**. The SDK auto-retries on 429 with exponential backoff (up to 2 retries)
- Pagination: **100 items max per page**. Use `has_more` + `next_cursor` loop
- For a CRM with hundreds of records, fetching all on page load will be slow (multiple API calls)
- **Recommended pattern:** Fetch first page (100 records) on load, implement "load more" or search-on-type with `/search` endpoint

### Integration Pattern for This App

The Notion CRM is read-mostly from v4 (v4 reads customers to pre-fill estimate). Writing back to Notion (updating pipeline status) is optional.

```
CRM page load:
  GET /api/notion/crm → notion.databases.query(DATABASE_ID, {page_size: 100})
  → Return first 100 records, sorted by updated_at descending

Customer → Estimate:
  Click customer card → navigate to /estimate/new?customer_id=NOTION_PAGE_ID
  Estimate new page → GET /api/notion/crm/[id] → notion.pages.retrieve(id)
  → Pre-fill: customer_name, site_name (from 주소 field), manager fields

No caching needed:
  The CRM data is used once per estimate creation. Fresh fetch is fine.
  Do not implement Redis/edge caching — this is a single-user internal tool.
```

### What the Worktree Already Has

The `flamboyant-lalande` worktree has:
- `lib/notion/crm.ts` — `getAllRecords()`, `createRecord()`
- `app/api/notion/crm/route.ts` — GET + POST
- `app/api/notion/crm/[id]/route.ts` — GET single record
- `app/api/notion/crm/[id]/comments/route.ts` — comments

This code should be merged into main. No new libraries needed beyond `@notionhq/client`.

---

## Research Domain 5: TTS

### gpt-4o-mini-tts (Keep, Update Model Snapshot)

Confidence: HIGH (OpenAI docs)

- 13 voice options: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse, marin, cedar
- Korean language: supported (50+ languages)
- Latest snapshot: `gpt-4o-mini-tts-2025-12-15` — substantially improved WER over original release
- Supports `instructions` parameter for tone/style control (the "비서 톤" system prompt in CLAUDE.md maps to this)
- **Update the model string** from `gpt-4o-mini-tts` to `gpt-4o-mini-tts-2025-12-15` in `/api/tts/route.ts`

**Voice choice:** `nova` or `shimmer` are the best options for Korean female assistant tone. `onyx` for male. Test both with the Korean system prompt to choose.

---

## Summary of Additions / Changes

| Area | Action | Package | Version | Rationale |
|------|--------|---------|---------|-----------|
| STT model | Update snapshot string | — | `gpt-4o-mini-transcribe` | Lower cost, same quality |
| TTS model | Update snapshot string | — | `gpt-4o-mini-tts-2025-12-15` | Latest snapshot, better Korean |
| PDF generation | Add library | `@react-pdf/renderer` | 4.3.0 | Lighter than Puppeteer, works in Vercel |
| CRM integration | Add library | `@notionhq/client` | 3.1.2 | Official SDK, stable v3 (not breaking v5) |
| State management | No change | — | — | useEstimate hook is correct architecture |
| Excel | No change | ExcelJS 4.4.0 | — | Works fine for small workbooks |
| Voice state | Fix wiring | — | — | Architecture is right, callbacks are broken |

### Installation Command

```bash
npm install @react-pdf/renderer @notionhq/client@3.1.2
```

---

## What NOT to Use

| Don't Use | Use Instead | Why |
|-----------|-------------|-----|
| OpenAI Realtime API | Current STT→LLM→TTS pipeline | Realtime is for streaming speech-to-speech; adding it requires full architectural redesign for no UX gain |
| Zustand / Jotai | Current useEstimate hook | Overkill for single-page editor; adds complexity without benefit |
| SheetJS | ExcelJS (keep) | SheetJS community lacks cell formatting needed to replicate GAS template |
| puppeteer / @sparticuz/chromium | @react-pdf/renderer | 50-80 MB Chromium bundle vs 2 MB; cold starts in Vercel are brutal |
| @notionhq/client v5.x | v3.1.2 | v5 requires `data_source_id` for multi-source databases — breaking change not needed for standard Notion DB |
| Redis / edge caching for Notion | Direct fetch per session | Single-user internal tool; cache adds complexity without benefit |
| Web Speech API on iOS Safari | Android Chrome (Galaxy Tab) | Target device is Android; iOS compatibility is not a requirement |

---

## Vercel Serverless Constraints (Key Numbers)

| Limit | Value | Impact on This App |
|-------|-------|-------------------|
| Response body | 4.5 MB | XLSX: ~60KB (fine). Audio TTS: ~100-500KB (fine). Stream to Storage for larger files |
| Memory | 2 GB default (Hobby) | ExcelJS workbook generation: <100 MB. Fine |
| Duration | 300s (Hobby) | STT call: 2-5s. LLM call: 1-3s. TTS call: 1-3s. No risk |
| Bundle size | 250 MB | @react-pdf/renderer adds ~2 MB. Fine |

---

## Sources

- OpenAI Speech-to-Text docs: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI next-gen audio models announcement: https://openai.com/index/introducing-our-next-generation-audio-models/
- OpenAI gpt-4o-mini-tts model page: https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
- Vercel Functions Limits (verified 2026-03-30): https://vercel.com/docs/functions/limitations
- ExcelJS OOM issue (large workbooks only): https://github.com/exceljs/exceljs/issues/2953
- @react-pdf/renderer npm: https://www.npmjs.com/package/@react-pdf/renderer
- @notionhq/client npm: https://www.npmjs.com/package/@notionhq/client
- Notion API rate limits: https://developers.notion.com/reference/request-limits
- Notion API upgrade guide (v5 breaking changes): https://developers.notion.com/docs/upgrade-guide-2025-09-03
- MediaRecorder MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- Safari 18.4 WebM/Opus support: https://media-codings.com/articles/recording-cross-browser-compatible-media
- React state management 2025: https://www.developerway.com/posts/react-state-management-2025
