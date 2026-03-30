# Codebase Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

### 1. AutoSave — Inefficient Item Sync Strategy

**Issue:** `hooks/useAutoSave.ts` deletes all items from a sheet, then re-inserts them every 1 second.
- Files: `hooks/useAutoSave.ts` L64-91
- Impact: O(n²) Supabase calls per edit. Creates unnecessary churn on DB. Potential data loss if delete fails before insert succeeds.
- Current logic:
  ```typescript
  await supabase.from('estimate_items').delete().eq('sheet_id', sheet.id)
  if (sheet.items.length > 0) {
    await supabase.from('estimate_items').insert(sheet.items.map(...))
  }
  ```
- Fix approach: Implement upsert-by-id strategy. Compute diff (added/modified/deleted) and apply only changes. Target: O(n) instead of O(n²).

### 2. EstimateEditor Component Size

**Issue:** `components/estimate/EstimateEditor.tsx` is 389 lines.
- Files: `components/estimate/EstimateEditor.tsx`
- Impact: Hard to test, hard to refactor, mixing concerns (voice, email, changelog, settings, contract ref all in one component).
- Safe modification: Split into logical hooks (useVoiceCommandHandling, useEmailHandling, etc.) and extract modal panels to custom hooks. Current implementation works but violates component single-responsibility principle.

### 3. Price Matrix Fallback to Zeros

**Issue:** When P매트릭스 is empty or RLS denies access, `lib/estimate/priceData.ts` silently returns `[0,0,0]` arrays.
- Files: `lib/estimate/priceData.ts` L17-21
- Impact: Silent failure — user sees all unit costs as 0, grand_total becomes 0. No visual/TTS warning.
- Current behavior:
  ```typescript
  console.warn(`P매트릭스에 ${areaRange}/${method} 데이터 없음 — 기본값 사용`)
  return Array.from({ length: 11 }, (): UnitCost => [0, 0, 0])
  ```
- Fix approach: Add explicit UI notification or TTS alert when fallback occurs. Consider returning previous/cached values instead of zeros.

## Known Bugs

### 1. P매트릭스 RLS 권한 — Service Role Bypass

**Symptoms:** New estimates show 0 unit costs for all items until user refreshes page.
- Files: `app/(authenticated)/estimate/[id]/page.tsx` L101-126
- Trigger: Navigate to `/estimate/[id]` with empty sheets. Items render with mat/labor/exp all 0.
- Root cause: Server component uses anon key → RLS denies access → `priceData.ts` returns fallback zeros. Fixed temporarily by using SERVICE_ROLE_KEY in server component, but this is a security workaround, not a solution.
- **Verification needed:** Create new estimate and check if unit costs are populated (not 0) immediately after page load.
- Workaround: User must save and refresh to see correct prices.

### 2. Google Drive Upload Failure Silently Ignored

**Symptoms:** Estimate saved but not uploaded to Google Drive folder. User unaware.
- Files: `app/api/estimates/[id]/generate/route.ts` L?
- Current handling: `console.error('Google Drive 업로드 실패 (무시):', driveErr)` — returns success to user even if Drive upload fails.
- Impact: Estimate files stored only in Supabase Storage. If Drive integration is important, users think they're backed up when they're not.
- Fix approach: Return partial success response {excel: ok, pdf: ok, drive: failed} to UI. Let TTS notify user of Drive failure.

### 3. Missing Page Routes

**Symptoms:** 404 errors when clicking Header links.
- Files missing:
  - `app/(authenticated)/crm/page.tsx`
  - `app/(authenticated)/calendar/page.tsx`
  - `app/(authenticated)/settings/page.tsx` (exists but incomplete)
- Current state: Settings exists but CRM/Calendar are stubs or missing entirely.
- Impact: Navigation broken. Users see 404.
- Fix approach: Create stub pages immediately. Wire to real functionality later. **Blockers none — these are UI-only pages.**

## Security Considerations

### 1. Service Role Key in Server Component

**Risk:** Using `SUPABASE_SERVICE_ROLE_KEY` in `app/(authenticated)/estimate/[id]/page.tsx` bypasses RLS.
- Files: `app/(authenticated)/estimate/[id]/page.tsx` L101-126
- Current mitigation: Filter by `company_id` manually. `eq('company_id', userData.company_id)` after loading with service role.
- Recommendations:
  1. This is acceptable for read-only P매트릭스 data (non-sensitive). Confirm P매트릭스 contains no customer/estimate PII.
  2. Add explicit comment explaining why service role is needed (RLS policy incompatibility with current schema).
  3. Consider restructuring RLS so anon key can access price_matrix (it's company-wide config, not estimate-specific).

### 2. API Routes Using Service Role

**Risk:** `app/api/estimates/[id]/generate/route.ts`, `app/api/estimates/[id]/email/route.ts` use service role for data access.
- Files: Multiple API routes
- Current mitigation: All access filtered by `company_id` or `created_by`.
- Recommendations: Log all service role API calls. Audit quarterly for unauthorized access patterns.

## Performance Bottlenecks

### 1. Linear Search in Price Matrix Interpolation

**Problem:** `lib/estimate/priceData.ts` L41-45 loops through all prices to find brackets.
- Files: `lib/estimate/priceData.ts` L41-46
  ```typescript
  for (const p of prices) {
    if (p <= pricePerPyeong) lo = p
    if (p >= pricePerPyeong && hi >= p) hi = p
  }
  ```
- Cause: Iterates O(n) for every getPD call. If prices array has 100+ entries, this adds up.
- Improvement path: Binary search O(log n). Or pre-compute and cache interpolation tables.
- Impact: Negligible for current scale (<1000 entries), but poor practice.

### 2. Full Item Rebuild on Metadata Change

**Problem:** Changing `m2` or `wall_m2` in `hooks/useEstimate.ts` L63-67 rebuilds entire sheet items.
- Files: `hooks/useEstimate.ts` L63-67
- Cause: `rebuildSheet()` called for every metadata update, even if only name changed.
- Improvement path: Only rebuild if `m2` or `wall_m2` specifically changed. Skip rebuild for name/phone/memo.
- Impact: Minor on UI responsiveness, but unnecessary Supabase churn in autoSave.

## Fragile Areas

### 1. Voice Flow State Machine — Context Persistence

**Files:** `lib/voice/voiceFlow.ts`, `hooks/useVoiceFlow.ts`
- Why fragile:
  - `stateRef.current` (useRef) and `flowState` (useState) can desync if processText called before state setter runs.
  - No validation that parsed fields make sense (e.g., negative area, zero ppp).
  - Direct state updates don't validate against DB schema.
- Safe modification:
  1. Add explicit validation before state updates (validateFlowState fn).
  2. Ensure parseText always waits for stateRef to sync before proceeding.
  3. Add unit tests for edge cases: empty input, "0" values, malformed numbers.
- Test coverage: parseAllFields has implicit tests via voice editor, but no unit tests file exists.

### 2. EstimateEditor Modal State Management

**Files:** `components/estimate/EstimateEditor.tsx` L36-42
- Why fragile:
  - Multiple modal state flags (emailOpen, showChangeLog, showContractRef, showSettings) can open simultaneously.
  - No z-index management or dismiss order defined.
  - If user opens settings, then changelog, then clicks outside settings, both might close or neither.
- Safe modification:
  1. Use single modal state manager: `{ type: 'email' | 'changelog' | 'settings' | null }` instead of boolean flags.
  2. Add modal manager component that handles z-index and escape key behavior.
- Test coverage: No tests for modal interaction sequences.

### 3. Estimate Item Sort Order — Brittle Indexing

**Files:** `hooks/useEstimate.ts` L96-119 (updateItem), `lib/estimate/buildItems.ts` L98-99 (sort_order reassignment)
- Why fragile:
  - After updateItem or delete, sort_order is brittle. If user deletes item 3, item 4's sort_order becomes 3, but array indices don't change until next rebuild.
  - Manual reordering (if added later) could create gaps or duplicates in sort_order.
- Safe modification:
  1. Normalize sort_order immediately after any add/delete/reorder.
  2. Add invariant check: "items[i].sort_order should equal i+1".
  3. Consider UUID-based ordering (sortOrder as fractional IDs like 1.5, 2.5) if complex reordering needed.
- Test coverage: No test file for item reordering logic.

## Scaling Limits

### 1. Voice Command Processing — Single-Threaded LLM

**Current capacity:** Sequential processing of voice commands. One command → STT → LLM → TTS → DB sync. If LLM call takes 2s, user waits 2s before next command.
- Limit: ~30 commands per minute (2s per command). Car-based workflow will hit this if user speaks rapidly.
- Scaling path:
  1. Queue commands and process optimistically (apply voice state changes immediately, validate async).
  2. Implement command batching: "재료비 올려, 인건비 올려, 경비 내려" → single LLM call.
- Files: `app/api/llm/route.ts`, `hooks/useVoice.ts`

### 2. Supabase DB Connection Pool

**Current capacity:** Free tier Supabase allows ~100 concurrent connections. AutoSave + multiple users = connection exhaustion risk.
- Limit: ~10 concurrent estimates being edited + background jobs could hit pool limits.
- Scaling path: Implement connection pooling middleware. Move autoSave to server-side queue (e.g., Bull/RabbitMQ). Consider Supabase Pro tier.
- Files: `hooks/useAutoSave.ts`

### 3. Excel Generation — Memory

**Current capacity:** ExcelJS loads entire workbook in memory. For large estimates (1000+ items), memory spike possible.
- Limit: ~5000 items before memory issues on serverless functions.
- Scaling path: Stream Excel generation or use streaming library (xlsx-stream). Or keep current but add item limit validation.
- Files: `lib/excel/generateWorkbook.ts`

## Dependencies at Risk

### 1. Google Sheets API Deprecation Risk

**Risk:** googleapis v171 is 6-7 versions behind latest. Google occasionally deprecates API versions.
- Impact: Drive upload will break if Google deprecates v3 API.
- Migration plan: Monitor googleapis releases. Plan upgrade to v192+ every 12 months. Test Drive upload quarterly.
- Files: `lib/gdrive/client.ts`, `package.json`

### 2. ExcelJS Compatibility

**Risk:** ExcelJS last updated 1+ years ago. Excel format evolves (conditional formatting, data validation).
- Impact: Complex formatting might not work in newer Excel/Google Sheets.
- Migration plan: If formatting issues arise, migrate to `sheet-js` or `openxml` library.
- Files: `lib/excel/generateWorkbook.ts`

## Test Coverage Gaps

### 1. Voice Command Parsing — No Unit Tests

**What's not tested:**
- `lib/voice/voiceFlow.ts` parseAllFields, parseFlowInput, getNextEmptyStep.
- `lib/voice/commands.ts` command application (add_item, remove_item, reorder_item).
- Edge cases: "사다리차 -1일" (negative), "총액 999999999" (overflow), "0 평" (zero area).
- Files: `lib/voice/voiceFlow.ts`, `lib/voice/commands.ts`
- Risk: Users report "음성이 이상해요" and we have no regression tests.
- Priority: High. Add test file `lib/voice/__tests__/voiceFlow.test.ts` with 30+ cases.

### 2. Cost Breakdown Calculations — Partial Coverage

**What's not tested:**
- `lib/estimate/costBreakdown.ts` interpolation accuracy for edge areas (29.9평, 100.1평).
- findPriceForMargin reverse calculation (target margin 50% → verify revenue/cost math).
- Multiple cost breakpoints (30/50/100평 interpolation).
- Files: `lib/estimate/costBreakdown.ts`
- Risk: Silent rounding errors in margin display.
- Priority: Medium. Spreadsheet has 32 test cases; add 10+ edge case tests to `tests/costBreakdown.test.ts`.

### 3. Email Tracking Pixel — No E2E Test

**What's not tested:**
- Tracking pixel insertion into HTML email body.
- Pixel fire when recipient opens (Resend webhook → `app/api/track/[id]/route.ts`).
- Files: `lib/email/sendEstimate.ts`, `app/api/track/[id]/route.ts`
- Risk: Tracking silently breaks and users don't know.
- Priority: Medium. Manual test: send estimate, open in Gmail, check Supabase email_viewed_at updated.

### 4. PDF Generation — No Tests

**What's not tested:**
- `lib/pdf/generatePdf.ts` HTML → PDF conversion.
- Layout integrity (table cells not overlapping, headers on every page).
- Files: `lib/pdf/generatePdf.ts`
- Risk: Users download PDFs with corrupted formatting.
- Priority: Low (visual regression only, not functional). Manual test with different estimate sizes.

### 5. AutoSave Debounce Logic — No Tests

**What's not tested:**
- Rapid edits don't cause 100 Supabase calls.
- Timer reset on each change actually works.
- Save fails gracefully (console.error but doesn't crash).
- Files: `hooks/useAutoSave.ts`
- Risk: Users lose work if save crashes silently.
- Priority: High. Add test `hooks/__tests__/useAutoSave.test.ts`.

## Missing Critical Features (Tracked as Concerns)

### 1. Notion CRM Integration Not Implemented

**Problem:** CLAUDE.md Section 6 mentions "CRM 자동 유입" but it's not wired.
- Files: `app/(authenticated)/crm/page.tsx` (stub)
- Blocks: "새 견적 시작 시 고객 선택 → 주소+담당자 자동 입력"
- Fix approach: Implement Notion API client (lib/notion/client.ts) to fetch customers. Create CRM page with customer list + "견적 쓰기" button.

### 2. JSON Load/Reload Not Wired

**Problem:** Header has "불러오기" button. `lib/estimate/jsonIO.ts` exists (exportToJson, importFromJson), but UI integration missing.
- Files: Header links to it, but no modal/handler.
- Blocks: Users can't load previous estimates from local storage.
- Fix approach: Create EstimateLoadModal component. Hook into Header. Populate with past estimates from DB or local storage.

### 3. Settings Page — Incomplete

**Problem:** `app/(authenticated)/settings/page.tsx` exists but is stub. User needs P매트릭스/원가 editing.
- Files: `app/(authenticated)/settings/page.tsx`
- Blocks: Admin can't tune pricing without editing DB directly.
- Fix approach: Build settings page with 3 tabs: (1) P매트릭스 upload, (2) 원가 config, (3) 비율 defaults. Wire to API routes.

## Verification Needed (2026-03-30 Note)

1. **P매트릭스 0값 fixed?** — Create new estimate, check unit costs are non-zero immediately.
2. **Voice guide flow working?** — New estimate → gide screen → voice/manual → sheets created?
3. **Realtime sync** — Edit in two tabs simultaneously, verify sync (currently debounced, not realtime).
4. **Offline mode** — App claims to be PWA. Test with DevTools offline. Should gracefully degrade (show cached data or error).

---

*Concerns audit: 2026-03-30*
