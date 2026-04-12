# BSMG_V4_ANALYSIS.md

---

## §A. 환경 정보

- **작업 폴더**: `C:\Users\나\bsmg-v4`
- **git remote**: `https://github.com/hyuntarella/BSMG-V4.git`
- **최근 5개 커밋**:
  - `3335020` feat: 규칙 파서에 필드명+숫자 쌍 패턴 추가 — LLM 없이 즉시 적용
  - `9097766` fix: add_item에 금액(mat/labor/exp) 포함 + 식 항목 자동 처리
  - `65f969b` fix: LLM 프롬프트 — 맥락 계승 규칙 추가 (공종 추가 후 속성 설정)
  - `8796138` fix: LLM extract 프롬프트 — 두 번째 면적=벽체 규칙 추가
  - `54f20c2` fix: 단가합 행 제거 → 단가합 열 추가 (재료비+노무비+경비 단가 합)
- **Node 버전**: v24.14.0
- **패키지 매니저**: npm (lock 파일 없음, package.json의 type: "commonjs")

---

## §B. package.json 핵심

```json
{
  "name": "bsmg-v4",
  "version": "1.0.0",
  "scripts": {
    "dev": "rimraf .next && next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "dev:clean": "rm -rf .next && next dev"
  },
  "dependencies": {
    "@sparticuz/chromium-min": "^143.0.4",
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.100.0",
    "@types/node": "^25.5.0",
    "@types/react": "^18.3.28",
    "@types/react-dom": "^18.3.7",
    "autoprefixer": "^10.4.27",
    "exceljs": "^4.4.0",
    "googleapis": "^171.4.0",
    "html2canvas": "^1.4.1",
    "jspdf": "^4.2.1",
    "next": "^14.2.35",
    "postcss": "^8.5.8",
    "puppeteer-core": "^24.40.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "resend": "^6.9.4",
    "tailwindcss": "^3.4.19",
    "typescript": "^5.9.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.58.2",
    "@vitejs/plugin-react": "^6.0.1",
    "cross-env": "^10.1.0",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.35",
    "pg": "^8.20.0",
    "rimraf": "^6.1.3",
    "tsx": "^4.21.0",
    "vitest": "^4.1.2"
  }
}
```

---

## §C. TypeScript / Next.js 설정

### tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": { "@/*": ["./*"] }
  }
}
```

기타: `target` 명시 없음 (기본값), `lib: ["dom", "dom.iterable", "esnext"]`, `incremental: true`, `plugins: [{ "name": "next" }]`

### next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
```

### tailwind.config.js

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#FEF2F2', 100:'#FDE3E3', 200:'#FCCBCB', 300:'#F9A3A3', 400:'#C42527', DEFAULT:'#A11D1F', dark:'#8A1819', 700:'#6B1315', 800:'#4E0E10', 900:'#3A0A0C' },
        accent: { 50:'#FFFBEB', 100:'#FEF3C7', 200:'#FDE68A', 300:'#FCD34D', DEFAULT:'#F59E0B', dark:'#D97706' },
        surface: { DEFAULT:'#F8F7F5', card:'#FFFFFF', elevated:'#FFFFFF', muted:'#F3F2EF' },
        ink: { DEFAULT:'#1A1A1A', secondary:'#6B7280', muted:'#9CA3AF', faint:'#D1D5DB' },
        bg: '#F8F7F5',
      },
      fontFamily: { sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'] },
    },
  },
  plugins: [],
}
```

### postcss.config.js

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

---

## §D. 환경변수

`.env.local` (값은 마스킹):

```
NEXT_PUBLIC_SUPABASE_URL=***
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
OPENAI_API_KEY=***
ANTHROPIC_API_KEY=***
RESEND_API_KEY=***
GOOGLE_SERVICE_ACCOUNT_EMAIL=***
GOOGLE_PRIVATE_KEY=***
GOOGLE_DRIVE_FOLDER_ID=***
GOOGLE_DRIVE_PROPOSAL_FOLDER_ID=***
NOTION_CRM_TOKEN=***
NOTION_CRM_DB_ID=***
NOTION_CRM_DATA_SOURCE_ID=***
NOTION_CALENDAR_TOKEN=***
NOTION_CALENDAR_SCHED_DB=***
NOTION_CALENDAR_MEMBER_DB=***
NOTION_CALENDAR_SETTINGS_DB=***
NOTION_CALENDAR_CRM_DB=***
TEST_MODE=***
SUPABASE_DB_PASSWORD=***
```

총 20개. `.env.example` 없음.

---

## §E. DB 스키마 (실제)

위치: `supabase/migrations/` (6개 파일)

- `001_initial_schema.sql`
- `002_voice_logs_corrections.sql`
- `003_voice_dictionary.sql`
- `004_crm_customers.sql`
- `005_calendar.sql`
- `006_create_inquiries.sql`

### 테이블 목록

```
[테이블] companies
  - id: uuid PK
  - name: text
  - business_number: text
  - ceo_name: text
  - address: text
  - phone: text
  - email: text
  - logo_url: text
  - created_at: timestamptz

[테이블] users
  - id: uuid PK (FK→auth.users)
  - company_id: uuid
  - name: text
  - phone: text
  - role: text (admin/sales/customer)
  - created_at: timestamptz

[테이블] customers
  - id: uuid PK
  - company_id: uuid
  - name: text
  - address: text
  - phone: text
  - email: text
  - manager_id: uuid
  - pipeline: text
  - contract_status: text
  - inquiry_channel: text
  - work_types: text[]
  - estimate_amount: bigint
  - contract_amount: bigint
  - area_pyeong: numeric
  - memo: text
  - inquiry_date: date
  - visit_date: date
  - created_at: timestamptz
  - updated_at: timestamptz

[테이블] estimates
  - id: uuid PK
  - company_id: uuid
  - customer_id: uuid
  - created_by: uuid
  - mgmt_no: text
  - status: text (draft/saved/sent/viewed)
  - date: date
  - customer_name: text
  - site_name: text
  - m2: numeric
  - wall_m2: numeric
  - manager_name: text
  - manager_phone: text
  - memo: text
  - excel_url: text
  - pdf_url: text
  - folder_path: text
  - email_sent_at: timestamptz
  - email_viewed_at: timestamptz
  - email_to: text
  - voice_session_id: uuid
  - created_at: timestamptz
  - updated_at: timestamptz

[테이블] estimate_sheets
  - id: uuid PK
  - estimate_id: uuid
  - type: text (복합/우레탄)
  - title: text
  - plan: text
  - price_per_pyeong: integer
  - warranty_years: integer
  - warranty_bond: integer
  - grand_total: bigint
  - sort_order: integer
  - created_at: timestamptz

[테이블] estimate_items
  - id: uuid PK
  - sheet_id: uuid
  - sort_order: integer
  - name: text
  - spec: text
  - unit: text
  - qty: numeric
  - mat: integer
  - labor: integer
  - exp: integer
  - mat_amount: bigint
  - labor_amount: bigint
  - exp_amount: bigint
  - total: bigint
  - is_base: boolean
  - is_equipment: boolean
  - is_fixed_qty: boolean
  - created_at: timestamptz

[테이블] price_matrix
  - id: uuid PK
  - company_id: uuid
  - area_range: text
  - method: text
  - price_per_pyeong: integer
  - item_index: integer
  - mat: numeric
  - labor: numeric
  - exp: numeric

[테이블] presets
  - id: uuid PK
  - company_id: uuid
  - name: text
  - spec: text
  - unit: text
  - mat: integer
  - labor: integer
  - exp: integer
  - category: text
  - used_count: integer
  - last_used: date
  - created_at: timestamptz

[테이블] cost_config
  - id: uuid PK
  - company_id: uuid (UNIQUE)
  - config: jsonb
  - updated_at: timestamptz

[테이블] voice_sessions
  - id: uuid PK
  - company_id: uuid
  - created_by: uuid
  - customer_id: uuid
  - status: text
  - parsed_data: jsonb
  - raw_texts: text[]
  - command_history: jsonb[]
  - created_at: timestamptz
  - updated_at: timestamptz

[테이블] estimate_changes
  - id: uuid PK
  - estimate_id: uuid
  - changed_by: uuid
  - change_type: text (voice/manual/auto)
  - change_data: jsonb
  - created_at: timestamptz

[테이블] voice_logs
  - id: uuid PK
  - estimate_id: uuid
  - company_id: uuid
  - speaker: text
  - text: text
  - action_json: jsonb
  - feedback: text
  - created_at: timestamptz

[테이블] voice_corrections
  - id: uuid PK
  - estimate_id: uuid
  - company_id: uuid
  - original_text: text
  - original_action: jsonb
  - correction_text: text
  - corrected_action: jsonb
  - context: jsonb
  - status: text
  - created_at: timestamptz

[테이블] voice_dictionary
  - id: uuid PK
  - company_id: uuid
  - wrong_text: text
  - correct_text: text
  - context: text
  - source: text
  - created_at: timestamptz

[테이블] crm_customers
  - id: uuid PK
  - notion_id: text
  - address: text
  - customer_name: text
  - phone: text
  - email: text
  - manager: text
  - stage: text
  - pipeline: text
  - contract_status: text
  - inquiry_channel: text
  - work_types: text[]
  - estimate_amount: bigint
  - contract_amount: bigint
  - deposit: bigint
  - balance: bigint
  - area: text
  - memo: text
  - inquiry_date: date
  - visit_date: date
  - balance_complete_date: date
  - estimate_sent_date: date
  - estimate_viewed_date: date
  - drive_url: text
  - estimate_web_url: text
  - created_at: timestamptz
  - updated_at: timestamptz

[테이블] crm_comments
  - id: uuid PK
  - customer_id: uuid
  - content: text
  - author: text
  - created_at: timestamptz

[테이블] calendar_members
  - id: uuid PK
  - notion_id: text
  - name: text
  - color: text
  - created_at: timestamptz

[테이블] calendar_events
  - id: uuid PK
  - notion_id: text
  - title: text
  - start_at: text
  - end_at: text
  - all_day: boolean
  - type: text (방문/시공/미팅/기타)
  - action: text
  - color: text
  - member_id: uuid
  - member_name: text
  - crm_customer_id: text
  - crm_customer_name: text
  - memo: text
  - created_at: timestamptz
  - updated_at: timestamptz

[테이블] inquiries
  - id: uuid PK
  - created_at: timestamptz
  - updated_at: timestamptz
  - channel: inquiry_channel (ENUM)
  - utm_medium: text
  - utm_keyword: text
  - first_response_at: timestamptz
  - stage_changed_at: timestamptz
  - address: text
  - client_name: text
  - phone: text
  - work_type: work_type (ENUM)
  - estimate_amount: integer
  - contract_amount: integer
  - area_sqm: numeric
  - memo: text
  - proposal_sent: boolean
  - ir_inspection: boolean
  - case_documented: boolean
  - pipeline_stage: pipeline_stage (ENUM)
  - contract_status: contract_status_enum (ENUM)
  - manager: text
  - referral_source: text
  - legacy_crm_id: uuid
  - drive_url: text
  - estimate_web_url: text
```

### RLS 정책 이름

1. companies_read
2. users_read_company
3. users_update_self
4. customers_company_isolation
5. estimates_company_isolation
6. estimates_own_or_admin
7. sheets_via_estimate
8. items_via_sheet
9. price_matrix_company
10. presets_company
11. cost_config_company
12. voice_sessions_company
13. changes_via_estimate
14. company_isolation (voice_logs)
15. company_isolation (voice_corrections)
16. company_isolation (voice_dictionary)
17. crm_customers_auth
18. crm_comments_auth
19. cal_events_auth
20. cal_members_auth

---

## §F. 폴더 구조 (3 depth)

```
.
├── app/
│   ├── (authenticated)/
│   │   ├── calendar/
│   │   ├── crm/
│   │   ├── estimate/
│   │   ├── estimates/
│   │   ├── proposal/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/
│   │   ├── calendar/
│   │   ├── crm/
│   │   ├── dashboard/
│   │   ├── estimates/
│   │   ├── inquiries/
│   │   ├── llm/
│   │   ├── proposal/
│   │   ├── proxy-images/
│   │   ├── realtime/
│   │   ├── seed/
│   │   ├── settings/
│   │   ├── stt/
│   │   ├── track/
│   │   └── tts/
│   ├── dashboard/
│   ├── login/
│   └── offline/
├── components/
│   ├── calendar/
│   ├── crm/
│   ├── dashboard/
│   ├── estimate/
│   ├── inquiry/
│   ├── layout/
│   ├── proposal/
│   ├── settings/
│   ├── ui/
│   └── voice/
├── docs/
├── e2e/
├── hooks/
├── lib/
│   ├── email/
│   ├── estimate/
│   ├── excel/
│   ├── gdrive/
│   ├── notion/
│   ├── pdf/
│   ├── supabase/
│   ├── utils/
│   └── voice/
├── public/
│   ├── icons/
│   └── templates/
├── scripts/
├── supabase/
│   └── migrations/
└── tests/
    ├── crm/
    └── voice/
```

---

## §G. API 라우트 인벤토리

```
[GET] /api/auth/callback
  파일: app/api/auth/callback/route.ts
  시그니처:
    export async function GET(request: Request) {
      const { searchParams, origin } = new URL(request.url)
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/dashboard'

[PATCH, DELETE] /api/calendar/[id]
  파일: app/api/calendar/[id]/route.ts
  시그니처:
    export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
      const body = await req.json();
    export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
      await deleteEvent(params.id);

[GET] /api/calendar/members
  파일: app/api/calendar/members/route.ts
  시그니처:
    export async function GET() {
      const members = await getMembers();

[GET, POST] /api/calendar
  파일: app/api/calendar/route.ts
  시그니처:
    export async function GET(req: NextRequest) {
      const start = searchParams.get('start');
      const end = searchParams.get('end');
    export async function POST(req: NextRequest) {
      const body = await req.json();

[GET] /api/calendar/today
  파일: app/api/calendar/today/route.ts
  시그니처:
    export async function GET() {
      const today = new Date().toISOString().split('T')[0];
      const events = await getEventsForDate(today);

[GET, POST] /api/crm/[id]/comments
  파일: app/api/crm/[id]/comments/route.ts
  시그니처:
    export async function GET(_request: Request, { params }: { params: { id: string } }) {
      const comments = await getPageComments(params.id);
    export async function POST(request: Request, { params }: { params: { id: string } }) {
      const body = (await request.json()) as { content?: string };

[GET, PATCH, DELETE] /api/crm/[id]
  파일: app/api/crm/[id]/route.ts
  시그니처:
    export async function GET(_request: Request, { params }: { params: { id: string } }) {
      const record = await getPageById(params.id);
    export async function PATCH(request: Request, { params }: { params: { id: string } }) {
      const body = (await request.json()) as CrmRecordUpdate;
    export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
      await archiveRecord(params.id);

[GET, PATCH] /api/crm/cs-status
  파일: app/api/crm/cs-status/route.ts
  시그니처:
    export async function GET() {
      const records = await queryCrmByPipeline('정보입력단계');
    export async function PATCH(request: Request) {
      const body = (await request.json()) as { pageId: string; pipeline: string };

[GET, POST] /api/crm
  파일: app/api/crm/route.ts
  시그니처:
    export async function GET() {
      const records = await getAllRecords();
    export async function POST(request: Request) {
      const body = (await request.json()) as CrmRecordCreate;

[GET] /api/crm/search
  파일: app/api/crm/search/route.ts
  시그니처:
    export async function GET(req: NextRequest) {
      const q = searchParams.get('q')?.trim() ?? '';
      const limit = Math.min(parseInt(searchParams.get('limit') ?? '8', 10), 20);

[GET] /api/dashboard/follow-up
  파일: app/api/dashboard/follow-up/route.ts
  시그니처:
    export async function GET() {
      const inquiries = await queryFollowUp();

[GET] /api/dashboard/unsent
  파일: app/api/dashboard/unsent/route.ts
  시그니처:
    export async function GET() {
      const inquiries = await queryUnsent();

[GET] /api/dashboard/viewed
  파일: app/api/dashboard/viewed/route.ts
  시그니처:
    export async function GET() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

[POST] /api/estimates/[id]/email
  파일: app/api/estimates/[id]/email/route.ts
  시그니처:
    export async function POST(request: Request, { params }: { params: { id: string } }) {
      const { to } = await request.json()

[POST] /api/estimates/[id]/generate
  파일: app/api/estimates/[id]/generate/route.ts
  시그니처:
    export async function POST(request: Request, { params }: { params: { id: string } }) {
      const estimateId = params.id
      const body = await request.json().catch(() => ({}))

[POST] /api/estimates/[id]/pdf
  파일: app/api/estimates/[id]/pdf/route.ts
  시그니처:
    export async function POST(_request: Request, { params }: { params: { id: string } }) {
      const estimateId = params.id

[GET] /api/estimates
  파일: app/api/estimates/route.ts
  시그니처:
    export async function GET(request: Request) {
      const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
      const isTestMode = process.env.TEST_MODE === 'true';
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

[GET] /api/estimates/search
  파일: app/api/estimates/search/route.ts
  시그니처:
    export async function GET(request: Request) {
      const q = searchParams.get('q') ?? ''
      const date = searchParams.get('date')

[GET, PATCH, DELETE] /api/inquiries/[id]
  파일: app/api/inquiries/[id]/route.ts
  시그니처:
    export async function GET(_request: Request, { params }: { params: { id: string } }) {
      const inquiry = await getInquiryById(params.id);
    export async function PATCH(request: Request, { params }: { params: { id: string } }) {
      const body = (await request.json()) as InquiryUpdate;
    export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
      await deleteInquiry(params.id);

[GET, POST] /api/inquiries
  파일: app/api/inquiries/route.ts
  시그니처:
    export async function GET() {
      const inquiries = await getAllInquiries();
    export async function POST(request: Request) {
      const body = (await request.json()) as InquiryCreate;

[GET] /api/inquiries/search
  파일: app/api/inquiries/search/route.ts
  시그니처:
    export async function GET(req: NextRequest) {
      const q = searchParams.get('q')?.trim() ?? '';

[POST] /api/llm
  파일: app/api/llm/route.ts
  시그니처:
    export async function POST(request: Request) {
      const { system, user, context } = await request.json()

[GET, POST] /api/proposal/config
  파일: app/api/proposal/config/route.ts
  시그니처:
    export async function GET() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
    export async function POST(req: NextRequest) {
      // Storage 'proposals' 버킷에 config JSON 저장

[POST] /api/proposal/pdf
  파일: app/api/proposal/pdf/route.ts
  시그니처:
    export async function POST(request: Request) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

[POST] /api/proposal/photo
  파일: app/api/proposal/photo/route.ts
  시그니처:
    export async function POST(req: NextRequest) {
      const supabase = createClient();
      // Storage 'proposals' 버킷에 사진 업로드

[GET] /api/proposal
  파일: app/api/proposal/route.ts
  시그니처:
    export async function GET(request: Request) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

[POST] /api/proxy-images
  파일: app/api/proxy-images/route.ts
  시그니처:
    export async function POST(req: NextRequest) {
      const body = await req.json();
      const urls: string[] = Array.isArray(body.urls) ? body.urls : [];

[POST] /api/seed
  파일: app/api/seed/route.ts
  시그니처:
    export async function POST(request: Request) {
      const { company_id } = await request.json()

[GET, PUT] /api/settings/cost-config
  파일: app/api/settings/cost-config/route.ts
  시그니처:
    export async function GET() {
      const companyId = await getDefaultCompanyId()
    export async function PUT(request: NextRequest) {
      body = await request.json() // { config?, section?, value? }

[GET, POST, PATCH, DELETE] /api/settings/presets
  파일: app/api/settings/presets/route.ts
  시그니처:
    export async function GET() { const companyId = await getDefaultCompanyId() }
    export async function POST(request: NextRequest) { body = await request.json() as Partial<PresetRow> }
    export async function PATCH(request: NextRequest) { body = await request.json() as Partial<PresetRow> & { id: string } }
    export async function DELETE(request: NextRequest) { body = await request.json() as { id: string } }

[GET, PUT] /api/settings/price-matrix
  파일: app/api/settings/price-matrix/route.ts
  시그니처:
    export async function GET(request: NextRequest) {
      const area_range = searchParams.get('area_range')
      const method = searchParams.get('method')
    export async function PUT(request: NextRequest) {
      body = await request.json() as { rows: PriceMatrixRow[] }

[POST] /api/stt
  파일: app/api/stt/route.ts
  시그니처:
    export async function POST(request: Request) {
      const { audio, prompt } = await request.json()

[GET] /api/track/[id]
  파일: app/api/track/[id]/route.ts
  시그니처:
    export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
      const { id } = params

[POST] /api/tts
  파일: app/api/tts/route.ts
  시그니처:
    export async function POST(request: Request) {
      const { text } = await request.json()
```

---

## §H. 견적서 핵심 비즈니스 로직 (lib/estimate)

### 파일 목록

1. `applyOverrides.ts`
2. `areaRange.ts`
3. `buildItems.ts`
4. `calc.ts`
5. `constants.ts`
6. `cost.ts`
7. `costBreakdown.ts`
8. `jsonIO.ts`
9. `margin.ts`
10. `priceData.ts`
11. `types.ts`

### 전체 export 목록

```typescript
// types.ts
export type AreaRange = '20평이하' | '50평미만' | '50~100평' | '100~200평' | '200평이상'
export type Method = '복합' | '우레탄'
export type UnitCost = [mat: number, labor: number, exp: number]
export type PriceMatrixRaw = { ... }
export interface PriceMatrixRow { ... }
export interface BaseItem { ... }
export interface EstimateItem { ... }
export interface EstimateSheet { ... }
export interface Estimate { ... }
export interface CalcResult { ... }
export interface CostTable { ... }
export interface BuildItemsInput { ... }
export interface PresetRow { ... }
export interface VoiceParsed { ... }

// constants.ts
export const COMPLEX_BASE: BaseItem[]
export const URETHANE_BASE: BaseItem[]
export const OVERHEAD_RATE = 0.03
export const PROFIT_RATE = 0.06
export const ROUND_UNIT = 100000
export const AREA_BOUNDARIES = [...]
export const DEFAULT_EQUIPMENT_PRICES = { ladder, sky, waste }
export const COST_TABLE = { ... }
export const LABOR_COST_PER_PUM = 220000
export const MATERIAL_INCREASE_RATE = 0.20
export interface CostBreakpoint { ... }
export const COST_BREAKPOINTS: CostBreakpoint[]

// buildItems.ts
export function buildItems(input: BuildItemsInput): { items: EstimateItem[]; calcResult: CalcResult }
export function buildSheet(input: BuildItemsInput): EstimateSheet

// calc.ts
export function calc(items: EstimateItem[]): CalcResult

// areaRange.ts
export function getAR(m2: number): AreaRange

// priceData.ts
export function getPD(matrix: PriceMatrixRaw, areaRange: string, method: Method, pricePerPyeong: number): UnitCost[]

// cost.ts
export function getCostPerM2(method: Method, m2: number): number

// margin.ts
export function getMargin(method: Method, m2: number, grandTotal: number): number

// applyOverrides.ts
export function applyOverrides(items: EstimateItem[], options: {
  wallM2?: number;
  ladder?: { days: number; unitPrice?: number };
  sky?: { days: number; unitPrice?: number };
  waste?: { days: number; unitPrice?: number };
}): EstimateItem[]

// costBreakdown.ts
export interface CostBreakdown { ... }
export interface MarginDisplay { ... }
export function getCostBreakdown(pyeong: number): CostBreakdown
export function getAdjustedCost(pyeong: number): CostBreakdown
export function getMarginDisplay(pricePerM2: number, pyeong: number): MarginDisplay
export function findPriceForMargin(targetMarginPercent: number, pyeong: number): number
export function pricePerM2ToPyeong(pricePerM2: number, m2: number): number

// jsonIO.ts
export interface EstimateJson { ... }
export function exportToJson(estimate: Estimate): string
export function importFromJson(jsonStr: string): Estimate
export function downloadJson(estimate: Estimate, filename: string)
```

### 5개 핵심 파일 — 함수 시그니처 + 파라미터 타입

```typescript
// ── buildItems.ts ──
export function buildItems(input: BuildItemsInput): {
  items: EstimateItem[]
  calcResult: CalcResult
}
export function buildSheet(input: BuildItemsInput): EstimateSheet

// BuildItemsInput (types.ts:115)
interface BuildItemsInput {
  method: Method
  m2: number
  wallM2?: number
  pricePerPyeong: number
  priceMatrix: PriceMatrixRaw
  options?: {
    ladder?: { days: number; unitPrice?: number }
    sky?: { days: number; unitPrice?: number }
    waste?: { days: number; unitPrice?: number }
  }
}

// ── calc.ts ──
export function calc(items: EstimateItem[]): CalcResult

// CalcResult (types.ts:100)
interface CalcResult {
  matTotal: number
  laborTotal: number
  expTotal: number
  subTotal: number
  overhead: number
  profit: number
  grandTotal: number
}

// ── applyOverrides.ts ──
export function applyOverrides(
  items: EstimateItem[],
  options: {
    wallM2?: number
    ladder?: { days: number; unitPrice?: number }
    sky?: { days: number; unitPrice?: number }
    waste?: { days: number; unitPrice?: number }
  }
): EstimateItem[]

// ── priceData.ts ──
export function getPD(
  matrix: PriceMatrixRaw,
  areaRange: string,
  method: Method,
  pricePerPyeong: number
): UnitCost[]

// ── areaRange.ts ──
export function getAR(m2: number): AreaRange
```

---

## §I. 견적서 컴포넌트 (components/estimate)

### 파일 목록 (15개)

1. `AddItemModal.tsx` — 공종 추가 모달 (프리셋/장비/커스텀 탭)
2. `ChangeLogPanel.tsx` — 수정 이력 패널 (스냅샷 복원)
3. `CompareSheet.tsx` — 복합 vs 우레탄 비교 시트
4. `ContractRefPanel.tsx` — 계약 참조 패널
5. `CoverSheet.tsx` — 표지 시트
6. `EmailModal.tsx` — 이메일 발송 모달
7. `EstimateEditor.tsx` — 메인 에디터 (진입점)
8. `InitialGuide.tsx` — 초기 안내 화면 (면적/단가 입력)
9. `InlineCell.tsx` — 인라인 편집 셀
10. `LoadEstimateModal.tsx` — 견적서 불러오기 모달
11. `MarginGauge.tsx` — 마진 게이지
12. `SettingsPanel.tsx` — 설정 패널 (단가표/기본공종/프리셋/원가/계산규칙/장비단가/보증)
13. `TabBar.tsx` — 탭 바 (복합-표지/세부, 우레탄-표지/세부, 비교)
14. `VoiceGuidePanel.tsx` — 음성 입력 가이드
15. `WorkSheet.tsx` — 세부 작업 시트

### 각 파일 첫 줄 시그니처 (import 생략, Props 인터페이스만)

```typescript
// AddItemModal.tsx
interface AddItemModalProps { open: boolean; onClose: () => void; onAdd: (item: Partial<EstimateItem>) => void }
type Tab = 'preset' | 'equipment' | 'custom'

// ChangeLogPanel.tsx
interface ChangeLogPanelProps { snapshots: Snapshot[]; onRestore: (index: number) => void; onClose: () => void }

// CompareSheet.tsx
interface CompareSheetProps { sheets: EstimateSheet[]; m2: number }

// ContractRefPanel.tsx
interface ContractRefPanelProps { isOpen: boolean; onClose: () => void; currentPyeong?: number }

// CoverSheet.tsx
interface CoverSheetProps { estimate: Estimate; sheet: EstimateSheet; onUpdate: (field: keyof Estimate, value: string | number) => void }

// EmailModal.tsx
interface EmailModalProps { open: boolean; defaultTo?: string; onSend: (to: string) => void; onClose: () => void; sending: boolean }

// EstimateEditor.tsx
interface EstimateEditorProps { initialEstimate: Estimate; priceMatrix: PriceMatrixRaw }

// InitialGuide.tsx
interface InitialGuideProps { onCreateSheets: () => void; onMicClick?: () => void; interimPreview?: string; isRecording?: boolean }

// InlineCell.tsx
interface InlineCellProps { value: number | string; type?: 'number' | 'text'; formatted?: boolean; onSave: (value: number | string) => void; className?: string; readOnly?: boolean }

// LoadEstimateModal.tsx
interface LoadEstimateModalProps { isOpen: boolean; onClose: () => void }

// MarginGauge.tsx
interface MarginGaugeProps { margin: number; className?: string }

// SettingsPanel.tsx
interface SettingsPanelProps { isOpen: boolean; onClose: () => void }

// TabBar.tsx
type TabId = 'complex-cover' | 'complex-detail' | 'urethane-cover' | 'urethane-detail' | 'compare'
interface TabBarProps { activeTab: TabId; onTabChange: (tab: TabId) => void; hasComplex: boolean; hasUrethane: boolean }

// VoiceGuidePanel.tsx
interface VoiceGuidePanelProps { open: boolean; onClose: () => void }

// WorkSheet.tsx
interface RealtimeHighlight { itemName?: string; field?: string; previewValue?: number }
interface WorkSheetProps { sheet: EstimateSheet; m2: number; wallM2?: number; margin: number; modifiedCells?: ModifiedCells; getCellHighlightLevel?: (cellKey: string) => number }
```

---

## §J. Hooks

### 파일 목록 (8개)

| 파일 | export 시그니처 |
|------|----------------|
| `useAutoSave.ts` | `export function useAutoSave(opts: UseAutoSaveOptions)` |
| `useCrm.ts` | `export function useCrm(opts?: UseCrmOptions)` |
| `useEstimate.ts` | `export interface Snapshot`, `export type ModifiedCells`, `export function useEstimate(initialEstimate: Estimate, priceMatrix: PriceMatrixRaw)` |
| `useEstimateVoice.ts` | `export function useEstimateVoice(opts: UseEstimateVoiceOptions)`, `export function getAliases(name: string): string[]` |
| `useRealtimeVoice.ts` | `export type RealtimeStatus`, `export function useRealtimeVoice(opts: UseRealtimeVoiceOptions)` |
| `useVoice.ts` | `export type VoiceStatus`, `export function useVoice(opts?: UseVoiceOptions)` |
| `useVoiceEditMode.ts` | `export function useVoiceEditMode(opts: UseVoiceEditModeOptions)` |
| `useVoiceFlow.ts` | `export interface VoiceFlowCallbacks`, `export function useVoiceFlow(callbacks: VoiceFlowCallbacks)` |

### useEstimate.ts (핵심 첫 50줄)

```typescript
'use client'
import { useState, useCallback, useRef } from 'react'
import type { Estimate, EstimateItem, EstimateSheet, PriceMatrixRaw } from '@/lib/estimate/types'
import { buildItems } from '@/lib/estimate/buildItems'
import { calc } from '@/lib/estimate/calc'
import { getMargin } from '@/lib/estimate/margin'
import { getAR } from '@/lib/estimate/areaRange'
import type { VoiceCommand } from '@/lib/voice/commands'
import { applyCommands } from '@/lib/voice/commands'
import { routeCommands } from '@/lib/voice/confidenceRouter'

export interface Snapshot {
  estimate: Estimate; description: string; type: 'voice' | 'manual' | 'auto'; timestamp: number
}
export type ModifiedCells = Map<string, 'added' | 'changed'>

export function useEstimate(initialEstimate: Estimate, priceMatrix: PriceMatrixRaw) {
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate)
  const [isDirty, setIsDirty] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [modifiedCells, setModifiedCells] = useState<ModifiedCells>(new Map())
  // saveSnapshot, restoreTo, markCell, updateMeta, addSheet, removeSheet,
  // updateItem, addItem, removeItem, applyVoiceCommands, ...
```

### useAutoSave.ts (핵심)

```typescript
'use client'
import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Estimate } from '@/lib/estimate/types'

interface UseAutoSaveOptions {
  estimate: Estimate; isDirty: boolean; onSaved: () => void; debounceMs?: number; enabled?: boolean
}

export function useAutoSave({ estimate, isDirty, onSaved, debounceMs = 1000, enabled = true }: UseAutoSaveOptions) {
  // 디바운스 1초 → supabase upsert (estimates 메타 + sheets + items)
```

### useEstimateVoice.ts (핵심)

```typescript
'use client'
import { useVoice } from '@/hooks/useVoice'

interface UseEstimateVoiceOptions {
  estimate: Estimate; activeSheetIndex: number; setActiveTab: (tab: TabId) => void;
  applyVoiceCommands: (commands: VoiceCommand[], sheetIndex?: number) => { executed: boolean; routing: ConfidenceResult };
  updateMeta: (field: keyof Estimate, value: string | number) => void;
  addSheet: (type: '복합' | '우레탄') => void;
  initFromVoiceFlow: (data: { area: number; wallM2: number; complexPpp: number | null; urethanePpp: number | null }) => void;
  saveSnapshot: (description: string, type?: 'auto' | 'voice' | 'manual') => void;
  undo: () => void; getSheetMargin: (sheetIndex: number) => number;
  onSave: () => Promise<void>; onEmailOpen: () => void;
}
// 3모드(신규플로우/수정모드/리얼타임) + 3단 파이프라인(WebSpeech→Whisper→LLM)
```

### useVoice.ts (핵심)

```typescript
'use client'
export type VoiceStatus = 'idle' | 'recording' | 'processing'

interface UseVoiceOptions {
  sttPrompt?: string; onSegment?: (text: string) => void; onInterim?: (text: string) => void;
  onWebSpeechFinal?: (text: string) => void; onEndingDetected?: (interimText: string) => void;
  onError?: (error: string) => void;
}
// Web Speech API + Whisper 이중 파이프라인
export function useVoice(options: UseVoiceOptions = {})
```

---

## §K. v1 18종 기능 생존 매트릭스

| # | v1 기능 | v4 검색 키워드 | 발견 위치 (최대 3개) | 상태 |
|---|---------|---------------|---------------------|------|
| 1 | PRESETS_DEFAULT | `presets` | `components/estimate/AddItemModal.tsx:35` (DEFAULT_PRESETS), `components/settings/PresetsEditor.tsx` | **부분** — PRESETS_DEFAULT 대신 DEFAULT_PRESETS + DB presets 테이블 |
| 2 | acDB 학습형 자동완성 | `acDB`, `usedCount` | 없음 (acDB 없음, presets.used_count DB에 있으나 미사용) | **없음** |
| 3 | 자동완성 통합 검색 | `autocomplete` | 없음 | **없음** |
| 4 | 단가 잠금 | `locked` | 없음 | **없음** |
| 5 | 공종 숨김 | `hidden` | 없음 (calendar의 hiddenCount만 발견 — 무관) | **없음** |
| 6 | 공종 순서 변경 | `sort_order` | `lib/estimate/buildItems.ts:75,109` | **부분** — sort_order 필드 존재, 드래그 UI 없음 |
| 7 | 단위 오버라이드 | `unitOver` | 없음 | **없음** |
| 8 | 이름·규격 오버라이드 | `nameOver`, `specOver` | 없음 | **없음** |
| 9 | 수량 오버라이드 | `qtyOver` | 없음 | **없음** |
| 10 | 장비 일수 | `EQUIP`, `DEFAULT_EQUIPMENT_PRICES` | `lib/estimate/constants.ts:59`, `lib/estimate/buildItems.ts:64-65` | **있음** — ladder/sky/waste 단가, buildItems에서 적용 |
| 11 | lump 금액 | `lump` | 없음 | **없음** |
| 12 | 자유입력 모드 | `freeMode` | 없음 | **없음** |
| 13 | 우레탄 동기화 | `syncUre` | 없음 | **없음** |
| 14 | Undo/Redo | `undo` | `lib/voice/realtimeParser.ts:785-789`, `hooks/useEstimate.ts` (Snapshot+restoreTo) | **부분** — undo만 (redo 없음), 음성 명령 + 스냅샷 복원 |
| 15 | 자동저장 | `autoSave` | `hooks/useAutoSave.ts:21`, `components/estimate/EstimateEditor.tsx:62` | **있음** — 디바운스 1초, Supabase upsert |
| 16 | CRM 자동채움 | `selectCrmClient` | 없음 | **없음** |
| 17 | 단가 관리 모달 | `priceMatrix`, `PriceMatrix` | `lib/estimate/priceData.ts:1`, `components/settings/PriceMatrixEditor.tsx` | **있음** — SettingsPanel 내 PriceMatrixEditor |
| 18 | 원가 관리 모달 | `cost_config`, `costConfig` | `components/settings/BaseItemsEditor.tsx:81`, `app/api/settings/cost-config/route.ts` | **있음** — SettingsPanel 내 CostEditor |
