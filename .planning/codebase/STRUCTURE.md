# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
bsmg-v4/
├── app/                              # Next.js 14 App Router
│   ├── layout.tsx                    # Root layout (PWA manifest, head links)
│   ├── loading.tsx                   # Global loading fallback
│   ├── error.tsx                     # Global error boundary
│   ├── not-found.tsx                 # 404 page
│   │
│   ├── login/
│   │   └── page.tsx                  # Supabase Auth form (email/password)
│   │
│   ├── dashboard/
│   │   ├── page.tsx                  # Home screen (recent estimates, follow-ups)
│   │   └── logout-button.tsx         # Auth logout
│   │
│   ├── offline/
│   │   └── page.tsx                  # Offline fallback page
│   │
│   ├── (authenticated)/              # Route group with auth middleware
│   │   ├── layout.tsx                # Authenticated layout (Header + Sidebar)
│   │   │
│   │   ├── estimates/
│   │   │   ├── page.tsx              # List of all estimates
│   │   │   └── estimate-list.tsx     # List component (filters, pagination)
│   │   │
│   │   ├── estimate/
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Create new estimate (POST, redirect to [id])
│   │   │   │
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Main estimate editor (SSR: fetch sheets + items + matrix)
│   │   │
│   │   ├── crm/
│   │   │   └── page.tsx              # CRM customer list (Supabase customers table)
│   │   │
│   │   ├── calendar/
│   │   │   └── page.tsx              # Calendar view (integration with GAS backend)
│   │   │
│   │   └── settings/
│   │       └── page.tsx              # Settings (config, rules, account)
│   │
│   └── api/                          # Serverless routes (Vercel Functions)
│       ├── auth/
│       │   └── callback/route.ts     # Supabase OAuth callback
│       │
│       ├── stt/
│       │   └── route.ts              # OpenAI Whisper proxy (POST audio → text)
│       │
│       ├── llm/
│       │   └── route.ts              # Claude Sonnet proxy (POST system+user → JSON commands)
│       │
│       ├── tts/
│       │   └── route.ts              # OpenAI TTS proxy (POST text → audio/mpeg)
│       │
│       ├── estimates/
│       │   ├── search/route.ts       # GET /api/estimates/search?q=... (CRM lookup)
│       │   │
│       │   └── [id]/
│       │       ├── generate/route.ts # POST generate Excel + PDF → Storage
│       │       └── email/route.ts    # POST send via Resend + tracking
│       │
│       ├── track/
│       │   └── [id]/route.ts         # GET tracking pixel (email open detection)
│       │
│       └── seed/
│           └── route.ts              # POST seed price_matrix + presets (dev only)
│
├── components/                       # React components (client-side)
│   ├── layout/
│   │   └── Header.tsx                # Top bar (logo, back, buttons)
│   │
│   ├── estimate/
│   │   ├── EstimateEditor.tsx        # Main orchestrator (state + voice + rendering)
│   │   ├── CoverSheet.tsx            # Cover page component
│   │   ├── WorkSheet.tsx             # Details table (복합/우레탄 공종)
│   │   ├── CompareSheet.tsx          # Side-by-side comparison (복합 vs 우레탄)
│   │   ├── TabBar.tsx                # Tab switcher (cover/detail/compare)
│   │   ├── MarginGauge.tsx           # Margin % visualization
│   │   ├── InlineCell.tsx            # Editable number cell
│   │   ├── EmailModal.tsx            # Email recipient form + send
│   │   ├── ChangeLogPanel.tsx        # Voice log history
│   │   ├── ContractRefPanel.tsx      # Related contracts panel
│   │   └── SettingsPanel.tsx         # Sheet settings (warranty, price_per_pyeong)
│   │
│   ├── voice/
│   │   └── VoiceBar.tsx              # Bottom sticky bar (record button, status, recent text)
│   │
│   └── dashboard/
│       ├── FollowUpCard.tsx          # Follow-up reminders
│       └── ViewTrackingCard.tsx      # Email view metrics
│
├── hooks/                            # Custom React hooks
│   ├── useEstimate.ts                # Main state management (estimate, snapshots, mutations)
│   ├── useVoice.ts                   # Voice I/O orchestration (record → STT → LLM → TTS)
│   ├── useVoiceFlow.ts               # Guided flow for new estimates (4-step field collection)
│   ├── useWakeWord.ts                # Wake word detection (Web Speech API + button toggle)
│   └── useAutoSave.ts                # Debounced Supabase sync
│
├── lib/                              # Shared business logic (no React)
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client (NEXT_PUBLIC_SUPABASE_*)
│   │   ├── server.ts                 # Server Supabase client (createClient for API routes)
│   │   └── middleware.ts             # Auth middleware (updateSession)
│   │
│   ├── estimate/
│   │   ├── types.ts                  # TS interfaces (Estimate, Sheet, Item, VoiceParsed)
│   │   ├── constants.ts              # BASE arrays (COMPLEX_BASE, URETHANE_BASE), rates, limits
│   │   ├── areaRange.ts              # getAR(m2) → AreaRange enum
│   │   ├── priceData.ts              # getPD(matrix, range, method, ppp) → UnitCost[]
│   │   ├── buildItems.ts             # Main: (area, method, ppp) → items + calc result
│   │   ├── applyOverrides.ts         # Apply options (ladder, sky, waste) to items
│   │   ├── calc.ts                   # calc(items) → { subtotal, overhead, profit, grandTotal }
│   │   ├── margin.ts                 # getMargin(grand_total, m2, ppp)
│   │   ├── cost.ts                   # getCostPerM2(method, m2) [legacy]
│   │   ├── costBreakdown.ts          # findPriceForMargin(marginPercent, pyeong) for reverse calc
│   │   └── jsonIO.ts                 # Stringify estimate for storage/loading
│   │
│   ├── voice/
│   │   ├── prompts.ts                # LLM system prompts (EXTRACT_SYSTEM, MODIFY_SYSTEM, etc.)
│   │   ├── commands.ts               # Command types + applyCommand(sheet, cmd)
│   │   ├── confidenceRouter.ts       # routeCommands(commands, confidence) → execution strategy
│   │   ├── convertToEstimate.ts      # VoiceParsed + flowState → Estimate (SSR friendly)
│   │   └── voiceFlow.ts              # State machine + parsing (parseAllFields, parseFlowInput)
│   │
│   ├── excel/
│   │   └── generateWorkbook.ts       # ExcelJS: build .xlsx from estimate
│   │
│   ├── pdf/
│   │   └── generatePdf.ts            # PDF generation (puppeteer or @react-pdf)
│   │
│   ├── email/
│   │   └── sendEstimate.ts           # Resend client: send estimate + tracking
│   │
│   ├── gdrive/
│   │   └── client.ts                 # Google Drive API (legacy, for folder storage)
│   │
│   └── utils/
│       ├── format.ts                 # fm(number) → "1,234,567원", n2k(won) → "만원"
│       ├── lerp.ts                   # lerpArr(arr, target) for P-matrix interpolation
│       └── numberToKorean.ts         # Korean number conversion ("백오십만원")
│
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── icons/
│   │   └── icon-*.svg/png            # App icons (192, 512)
│   │
│   └── templates/
│       └── *.xlsx                    # Excel template files (if pre-built)
│
├── supabase/
│   ├── migrations/                   # DB schema files (auto-generated by CLI)
│   └── seed.ts                       # Seed price_matrix, presets, cost_config
│
├── tests/                            # Test files (if present)
│   └── [test suites]
│
├── middleware.ts                     # Next.js middleware (auth wrapper)
├── next.config.js                    # Next.js config
├── tailwind.config.js                # Tailwind CSS
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
└── CLAUDE.md                         # Project specification
```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router page hierarchy + API routes
- Contains: Page shells, layouts, middleware, serverless functions
- Key files: `middleware.ts` (auth), `(authenticated)/estimate/[id]/page.tsx` (main flow)

**components/:**
- Purpose: Reusable React components (client-side only, no logic)
- Contains: UI shells, modal forms, tables, gauges
- Key files: `estimate/EstimateEditor.tsx` (orchestrator), `voice/VoiceBar.tsx` (recording UI)

**hooks/:**
- Purpose: Custom React hooks (state management, external I/O)
- Contains: useEstimate (core state), useVoice (STT/LLM/TTS), useVoiceFlow (flow machine), useAutoSave (Supabase sync)
- Key files: `useEstimate.ts` (150+ lines, handles snapshots + mutations)

**lib/estimate/:**
- Purpose: Pure estimation logic (P-matrix, item building, calculation)
- Contains: Types, constants (BASE arrays), calculation functions
- Key files: `buildItems.ts` (v1 logic iport), `calc.ts` (subtotal → roundoff), `constants.ts` (rates + arrays)

**lib/voice/:**
- Purpose: Voice system (STT/LLM/TTS, command parsing, flow)
- Contains: System prompts, command types, parsing helpers, flow state machine
- Key files: `voiceFlow.ts` (parseAllFields), `commands.ts` (apply logic)

**lib/supabase/:**
- Purpose: Database client abstraction
- Contains: Browser + server clients, middleware auth
- Key files: `client.ts` (browser), `middleware.ts` (auth wrapper)

**public/:**
- Purpose: Static assets
- Contains: PWA manifest, app icons, template spreadsheets
- Key files: `manifest.json`, `icons/`

**supabase/:**
- Purpose: Database schema + seed scripts
- Contains: Schema migrations, seed data (price_matrix, presets)
- Key files: `seed.ts`

## Key File Locations

**Entry Points:**

- `app/layout.tsx`: Root layout (PWA, head)
- `app/(authenticated)/estimate/[id]/page.tsx`: Main estimate editor (SSR, fetches data)
- `app/(authenticated)/estimate/new/page.tsx`: Create estimate (POST, redirect)
- `app/api/`: All serverless routes

**Configuration:**

- `CLAUDE.md`: Project spec (everything)
- `.env.local`: Secrets (SUPABASE_*, OPENAI_*, ANTHROPIC_*)
- `next.config.js`: Next.js config
- `tailwind.config.js`: Tailwind CSS tokens
- `tsconfig.json`: TypeScript strict mode

**Core Logic:**

- `lib/estimate/buildItems.ts`: Main computation (area + ppp → items + calc)
- `lib/estimate/calc.ts`: Subtotal → overhead/profit → roundoff
- `lib/voice/prompts.ts`: LLM system prompts
- `hooks/useEstimate.ts`: State management (snapshots, mutations, undo)
- `hooks/useVoice.ts`: Voice orchestration (record + STT + LLM + TTS)

**Voice System:**

- `lib/voice/voiceFlow.ts`: Flow state machine (4-step collection)
- `lib/voice/commands.ts`: Command execution (applyCommands)
- `app/api/stt/route.ts`: OpenAI Whisper proxy
- `app/api/llm/route.ts`: Claude Sonnet proxy
- `app/api/tts/route.ts`: OpenAI TTS proxy

**Testing:**

- `tests/`: Test suites (if present)

## Naming Conventions

**Files:**

- Components: PascalCase (`EstimateEditor.tsx`)
- Pages: kebab-case with optional brackets (`[id]/page.tsx`)
- Hooks: camelCase, prefix `use` (`useEstimate.ts`)
- Utils/types: camelCase (`areaRange.ts`, `types.ts`)
- Routes: kebab-case (`/api/estimates/[id]/email/route.ts`)

**Directories:**

- Feature groups: lowercase (`estimate/`, `voice/`, `supabase/`)
- Route groups: parentheses (`(authenticated)/`)

## Where to Add New Code

**New Voice Command:**
- Type definition: `lib/voice/commands.ts` → add to VoiceCommand interface
- Execution: `lib/voice/commands.ts` → add case in applyCommand()
- LLM prompt: `lib/voice/prompts.ts` → update getModifySystem() to include new action

**New Estimate Metric (e.g., "total labor cost"):**
- Add to EstimateSheet type: `lib/estimate/types.ts`
- Compute in calc(): `lib/estimate/calc.ts`
- Display in UI: `components/estimate/WorkSheet.tsx` or new component

**New Dialog/Modal:**
- Component: `components/estimate/[ModalName].tsx`
- State in EstimateEditor: add useState
- Button: add onClick handler

**New Voice Mode (e.g., "question answering"):**
- Prompt: `lib/voice/prompts.ts` → add QA_SYSTEM
- Router logic: `hooks/useVoice.ts` → check modeRef.current
- Test in EstimateEditor: pass mode="qa"

**New Settings Page:**
- Page: `app/(authenticated)/settings/[section]/page.tsx`
- Fetch config: Supabase `cost_config` or `rules` table
- Component: `components/settings/[SectionName].tsx`

**API Endpoint:**
- Route: `app/api/[feature]/[action]/route.ts`
- Handler: export async function POST/GET(request)
- Auth: use server Supabase client (service role if RLS bypass needed)

## Special Directories

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (npm install)
- Committed: No (gitignored)

**.next/:**
- Purpose: Next.js build artifacts (server + client bundles)
- Generated: Yes (next build)
- Committed: No (gitignored)

**supabase/.temp/:**
- Purpose: Supabase CLI temporary files
- Generated: Yes (supabase start)
- Committed: No

**public/templates/:**
- Purpose: Pre-built Excel/PDF templates (optional)
- Generated: No (manually created)
- Committed: Yes

---

*Structure analysis: 2026-03-30*
