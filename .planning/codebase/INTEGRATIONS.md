# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**Voice & Language:**
- OpenAI Whisper (gpt-4o-transcribe) - Speech-to-text transcription
  - SDK/Client: Native fetch via `/api/stt/route.ts`
  - Auth: `OPENAI_API_KEY` environment variable
  - Endpoint: `https://api.openai.com/v1/audio/transcriptions`

- OpenAI gpt-4o-mini-tts - Text-to-speech synthesis
  - SDK/Client: Native fetch via `/api/tts/route.ts`
  - Auth: `OPENAI_API_KEY` environment variable
  - Endpoint: `https://api.openai.com/v1/audio/speech`
  - Voice: 'coral', Speed: 1.3x

**LLM & Intelligence:**
- Anthropic Claude Sonnet (claude-sonnet-4-20250514) - Command parsing and data extraction
  - SDK/Client: Native fetch via `/api/llm/route.ts`
  - Auth: `ANTHROPIC_API_KEY` environment variable (header: `x-api-key`)
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - Max tokens: 2048
  - Used for: extract mode (12-field extraction), supplement mode (partial updates), modify mode (edit commands), command classification

**Email & Communication:**
- Resend - Email delivery service
  - SDK/Client: resend 6.9.4 package
  - Auth: `RESEND_API_KEY` environment variable
  - Implementation: `lib/email/sendEstimate.ts`
  - Features: PDF/Excel attachments, tracking pixel 1x1 for open detection
  - Send address: `estimate@bsmg.kr`

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client)
  - Client: @supabase/supabase-js 2.100.0, @supabase/ssr 0.9.0
  - Tables: companies, users, customers, estimates, estimate_sheets, estimate_items, price_matrix, presets, cost_config, voice_sessions, estimate_changes
  - Connections made from: `/lib/supabase/client.ts` (browser), `/lib/supabase/server.ts` (server)

**File Storage:**
- Supabase Storage - S3-compatible object storage
  - Bucket: 'estimates'
  - Stores: .xlsx (Excel files), .html (PDF rendering), .json (estimate snapshots)
  - Path pattern: `estimates/{mgmtNo}/見積書_{mgmtNo}.{ext}`
  - Public URL generation: `getPublicUrl()`

- Google Drive - Backup/versioning of Excel files (optional)
  - SDK/Client: googleapis 171.4.0
  - Auth: Service account with `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`
  - Scope: https://www.googleapis.com/auth/drive.file
  - Implementation: `lib/gdrive/client.ts`
  - Auto-versioning: Files with same name get (2), (3) suffixes
  - Folder IDs: Configurable via `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_DRIVE_PROPOSAL_FOLDER_ID`
  - Backup location: `uploadToDrive()` called from generate route

**Caching:**
- None persistent - Session-based only via browser sessionStorage/Supabase Realtime

## Authentication & Identity

**Auth Provider:**
- Supabase Auth with email-based login
  - Implementation: `/app/api/auth/callback/route.ts`
  - Flow: Magic link or OAuth → callback exchanges code for session
  - Session storage: HTTP-only cookies
  - RLS (Row-Level Security): Enabled on all tables with company_id isolation
  - Roles: admin, sales, customer (via users table)
  - Server client: `createClient()` in `/lib/supabase/server.ts`
  - Browser client: `createClient()` in `/lib/supabase/client.ts`

## Monitoring & Observability

**Error Tracking:**
- None configured - Using console.error in catch blocks

**Logs:**
- Console.error for backend errors (visible in Vercel logs)
- No structured logging framework

**Email Tracking:**
- Open tracking: 1x1 pixel in Resend email template
  - Pixel src: `/api/track/[id]` route
  - Triggers: GET request updates `email_viewed_at` in estimates table

## CI/CD & Deployment

**Hosting:**
- Vercel (primary)
  - Framework: Next.js 14 App Router
  - Build command: `next build`
  - Start command: `next start`
  - Dev command: `next dev`
  - Environment variables: Set in Vercel dashboard

**Build Environment:**
- Node.js runtime
- npm package manager

**Git Repository:**
- GitHub (hyuntarella/BSMG-V4)

## Environment Configuration

**Required env vars (development):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client-side Supabase key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side privileged key
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `RESEND_API_KEY` - Resend API key

**Optional env vars:**
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Google Drive service account email
- `GOOGLE_PRIVATE_KEY` - Google Drive private key (newline-escaped as `\\n`)
- `GOOGLE_DRIVE_FOLDER_ID` - Custom estimate folder ID (defaults to hardcoded)
- `GOOGLE_DRIVE_PROPOSAL_FOLDER_ID` - Custom proposal folder ID (defaults to hardcoded)

**Secrets location:**
- `.env.local` (development, not committed)
- Vercel Environment Variables dashboard (production)

## Webhooks & Callbacks

**Incoming:**
- `/api/auth/callback/route.ts` - Supabase Auth callback (OAuth/magic link exchange)

**Outgoing:**
- None configured at present

## API Routes Summary

| Route | Method | Purpose | External Service |
|-------|--------|---------|------------------|
| `/api/stt` | POST | Audio transcription | OpenAI Whisper |
| `/api/llm` | POST | Command parsing/LLM | Anthropic Claude Sonnet |
| `/api/tts` | POST | Text-to-speech | OpenAI gpt-4o-mini-tts |
| `/api/estimates/[id]/generate` | POST | Excel/Storage generation | Supabase Storage, Google Drive |
| `/api/estimates/[id]/email` | POST | Email dispatch | Resend, Supabase |
| `/api/track/[id]` | GET | Email open tracking | Supabase |
| `/api/auth/callback` | GET | Auth callback | Supabase Auth |
| `/api/seed` | POST | Data seeding | Supabase |

---

*Integration audit: 2026-03-30*
