# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5.9.3 - Full application codebase
- JavaScript - Build configuration and scripts

**Secondary:**
- HTML - Email templates, PDF generation
- CSS - Tailwind CSS utility styles

## Runtime

**Environment:**
- Node.js 18+ (LTS)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 14.2.35 (App Router) - Server-side rendering, API routes, deployment
- React 18.3.1 - UI components
- React DOM 18.3.1 - DOM rendering

**Styling:**
- Tailwind CSS 3.4.19 - Utility-first CSS framework
- PostCSS 8.5.8 - CSS transformation pipeline
- Autoprefixer 10.4.27 - Browser vendor prefixes

**Build/Dev:**
- tsx 4.21.0 - TypeScript execution for scripts

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.100.0 - PostgreSQL database, Auth, Storage client
- @supabase/ssr 0.9.0 - Server-side rendering helpers for Supabase Auth
- exceljs 4.4.0 - Excel workbook generation (XLSX creation)
- googleapis 171.4.0 - Google Drive API for file management
- resend 6.9.4 - Email sending service

**Type Definitions:**
- @types/node 25.5.0 - Node.js type definitions
- @types/react 18.3.28 - React type definitions
- @types/react-dom 18.3.7 - React DOM type definitions

## Configuration

**Environment:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for server-side operations (private)
- `OPENAI_API_KEY` - OpenAI API key for STT/TTS (private)
- `ANTHROPIC_API_KEY` - Anthropic Claude API key for LLM (private)
- `RESEND_API_KEY` - Resend email service key (private)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Google Drive service account email (optional)
- `GOOGLE_PRIVATE_KEY` - Google Drive private key (optional, private)
- `GOOGLE_DRIVE_FOLDER_ID` - Default Google Drive folder for estimates (optional)
- `GOOGLE_DRIVE_PROPOSAL_FOLDER_ID` - Default Google Drive folder for proposals (optional)

**Build Configuration:**
- `next.config.js` - Minimal Next.js configuration
- `tsconfig.json` - TypeScript strict mode enabled, path aliases `@/*` → root
- `tailwind.config.js` - Tailwind CSS with custom brand colors and fonts
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer

## Platform Requirements

**Development:**
- Node.js 18+
- npm or compatible package manager
- Supabase account (PostgreSQL + Auth)
- OpenAI API key
- Anthropic API key
- Resend API key
- (Optional) Google Drive service account

**Production:**
- Vercel (primary deployment platform)
- Supabase PostgreSQL database
- Supabase Storage (S3-compatible)
- Supabase Auth
- OpenAI API endpoint access
- Anthropic API endpoint access
- Resend API endpoint access

**Browser Requirements:**
- Modern browser with Web Audio API support (for voice recording)
- MediaRecorder API support
- Web Speech API support (for wake word detection)

---

*Stack analysis: 2026-03-30*
