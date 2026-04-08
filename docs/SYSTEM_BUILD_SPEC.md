# SYSTEM_BUILD_SPEC.md — bsmg-v4 → bsmg-v5 (lens 통합) 작업 지시서

> 이 문서는 채팅 클로드(다른 환경)가 작성했고, 클로드 코드가 bsmg-v4 코드베이스 위에서 작업을 수행하기 위한 유일한 지시서입니다.
> 외부 정보·추측 금지. 모르는 건 사용자에게 묻거나 v4 코드 원본을 확인하세요.
> 모든 Phase는 순서대로 진행. 이전 Phase가 완료되지 않으면 다음 Phase로 넘어가지 마세요.

---

## 0. 절대 원칙

1. **v4 코드베이스를 파괴하지 마세요.** v4는 80% 작동 시스템입니다. 기존 파일 수정 시 `git diff`로 변경을 최소화하고, `vitest`와 `playwright`로 검증하세요.
2. **신규 파일은 명확히 분리**하세요. `lib/acdb/`, `lib/lens/`, `components/quote-pdf/` 등 신규 디렉토리로 분리. 기존 `lib/estimate/`, `components/estimate/`는 확장만, 새 구조로 교체 금지.
3. **DB 마이그레이션은 추가만**. 기존 001~006 수정 금지. `007_*.sql`부터 추가.
4. **픽셀 단위 디자인 복제** (Phase 5). "비슷하게"는 실패.
5. **추측 금지**. Figma 좌표, v1 코드 라인, v4 함수 시그니처를 모를 때는 반드시 원본 확인.
6. **lens 인터페이스 절대 변경 금지** (§14).

---

## 1. 작업 개요

### 배경
- **bsmg-v4**: Next.js 14 + Supabase + Tailwind. 80% 완성. GitHub: `hyuntarella/BSMG-V4`.
- **문제**: v4가 음성 최적화하면서 v1(6,688줄 GAS 단일 HTML)의 영업사원 시간 절감 기능 **11개를 잃음**. `BSMG_V4_ANALYSIS.md §K` 참조.
- **추가 요구**: 외부 시스템 "lens 슈퍼앱"과 연동 필요. 브리프 `brief-quote.md §4` 참조.
- **디자인**: v1~v4 모두 Figma 1픽셀 매칭 실패. 원인 규명됨 (§8.1).

### 작전
> **v4 위에 브랜치 생성 → v1에서 11개 기능 부활 → lens 어댑터 추가 → Figma PDF 컴포넌트 신규 → acDB 시드 주입**

### Phase 목록

| Phase | 작업 | 종속 |
|---|---|---|
| 0 | 환경 준비 (브랜치, 의존성) | — |
| 1 | DB 마이그레이션 007~010 | 0 |
| 2 | lib/acdb/ — 학습형 자동완성 (#2, #3) | 1 |
| 3 | lib/estimate 확장 (#4, #5, #7-9, #11, #12, #13, #16) | 1 |
| 4 | lib/lens/ + /api/lens/quote (#22) | 3 |
| 5 | components/quote-pdf/ Figma 픽셀 복제 | 0 |
| 6 | UI 보강 (redo, 드래그, 잠금/숨김 토글) | 3 |
| 7 | acDB 시드 import 실행 | 2 |
| 8 | 음성→폼 escalation (#19) | 3 |
| 9 | 통합 테스트 + 픽셀 검증 | 5, 8 |
| 10 | 사장용 단가 시점 이력 | 1 |

---

## 2. 사전 자료

작업 시작 전 다음을 모두 읽으세요:

| 파일 | 역할 |
|---|---|
| `brief-quote.md` | 전체 브리프, lens 인터페이스 계약 |
| `BSMG_V4_ANALYSIS.md` | v4 코드베이스 현황 (A~K) |
| `acdb_seed_final.json` | 519개 공종 시드 (Phase 7) |
| `acdb_summary_final.csv` | TOP 60 요약 |
| `견적서.html` (v1) | 부활시킬 11개 기능의 참조 구현 (6,688줄) |
| Figma `OLxyy4grM15JV5dvQcuHF6` 노드 `542:151`, `542:744` | Figma MCP로 접근 |

v1 특정 기능 찾기:
```bash
grep -n "PRESETS_DEFAULT\|acDB\|lockedC\|hiddenC\|unitOver\|syncUre05\|freeMode" 견적서.html
```

---

## 3. Phase 0 — 환경 준비

### 3.1 폴더 구조 및 브랜치

**중요**: v4는 동결되었고, v5는 v4 저장소를 clone해서 `C:\Users\나\bsmg-v5`에 만든 별도 폴더입니다. 작업 시작 시점의 폴더 구조:

```
C:\Users\나\
├── bsmg-v4-archive\    ← 동결. 참조·검색 전용. 절대 수정 금지.
└── bsmg-v5\            ← 작업 폴더. 모든 변경은 여기서.
    ├── .git\           ← 원격은 hyuntarella/BSMG-V4 (v4와 같은 저장소)
    ├── docs\
    │   └── SYSTEM_BUILD_SPEC.md  ← 이 문서
    ├── data\
    │   └── acdb-seed.json        ← 시드 519개
    └── (v4 코드 전부)
```

**원칙**:
- 모든 `cd` 명령은 `bsmg-v5`에서 실행 (bsmg-v4-archive로 절대 이동 금지)
- v1 원본 참조가 필요할 때는 `bsmg-v4-archive\견적서.html` 등으로 읽기만
- GitHub push는 `feature/lens-integration` 브랜치로만. `main`에 직접 push 금지.
- 이 브랜치는 사용자가 이미 생성해둔 상태이므로, 클로드 코드는 `git checkout feature/lens-integration`만 실행해서 확인.

```bash
cd C:\Users\나\bsmg-v5
git status                          # On branch feature/lens-integration 이어야 함
git branch                          # feature/lens-integration에 * 표시 확인
git remote -v                       # origin = https://github.com/hyuntarella/BSMG-V4.git
```

만약 브랜치가 다르면:
```bash
git checkout feature/lens-integration
```

### 3.2 의존성
```bash
npm install --save react-dnd@16 react-dnd-html5-backend@16 pixelmatch@5 pngjs@7 nanoid@5
npm install --save-dev @types/pngjs
```

- `react-dnd`: Phase 6 드래그 정렬
- `pixelmatch + pngjs`: Phase 9 픽셀 검증
- `nanoid`: Phase 4 임시 ID

### 3.3 환경변수 추가

`.env.local`에 추가 (값은 사용자에게 요청):
```
LENS_WEBHOOK_SECRET=***
LENS_API_BASE_URL=***
LENS_DEFAULT_COMPANY_ID=***
INTERNAL_PDF_SECRET=***
PIXEL_MATCH_THRESHOLD=0.01
```

### 3.4 기존 테스트 녹색
```bash
npm run lint
npm run build
npm test
```
**모두 통과해야 Phase 1 시작.** 깨져 있으면 사용자에게 보고.

### 3.5 완료 조건
- [ ] 브랜치 생성
- [ ] 의존성 설치
- [ ] `.env.local` 신규 변수 5개 (placeholder OK)
- [ ] `npm run build` 성공
- [ ] 사용자에게 "Phase 0 완료" 보고 → Phase 1 승인

---

## 4. Phase 1 — DB 마이그레이션 007~010

### 4.1 파일 구조
```
supabase/migrations/
├── 001_initial_schema.sql              ← 건드리지 말 것
├── 002_voice_logs_corrections.sql      ← 건드리지 말 것
├── 003_voice_dictionary.sql            ← 건드리지 말 것
├── 004_crm_customers.sql               ← 건드리지 말 것
├── 005_calendar.sql                    ← 건드리지 말 것
├── 006_create_inquiries.sql            ← 건드리지 말 것
├── 007_estimate_item_overrides.sql     ← 신규
├── 008_acdb.sql                        ← 신규
├── 009_lens_integration.sql            ← 신규
└── 010_price_matrix_history.sql        ← 신규 (Phase 10에서 사용)
```

### 4.2 `007_estimate_item_overrides.sql`

v1의 #4(단가잠금), #5(공종숨김), #7~9(오버라이드), #11(lump), #12(자유입력), #13(우레탄동기화) 지원 컬럼.

```sql
ALTER TABLE estimate_items
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lump_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS original_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS original_spec TEXT NULL,
  ADD COLUMN IF NOT EXISTS original_unit TEXT NULL,
  ADD COLUMN IF NOT EXISTS original_qty NUMERIC NULL;

ALTER TABLE estimate_sheets
  ADD COLUMN IF NOT EXISTS is_free_mode BOOLEAN DEFAULT FALSE;

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS sync_urethane BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN estimate_items.is_locked IS '단가 잠금. 평단가 변경해도 갱신 안 됨';
COMMENT ON COLUMN estimate_items.is_hidden IS '공종 숨김. UI 미표시 (삭제 아님)';
COMMENT ON COLUMN estimate_items.lump_amount IS '식 단위 lump 금액. NULL이면 단가×수량 사용';
COMMENT ON COLUMN estimate_items.original_name IS '오버라이드 전 원본 이름 (BASE 복원용)';
COMMENT ON COLUMN estimate_sheets.is_free_mode IS 'BASE 없이 자유입력 모드';
COMMENT ON COLUMN estimates.sync_urethane IS '복합 탭 우레탄 항목을 우레탄 탭 단가로 자동 일치';
```

### 4.3 `008_acdb.sql`

```sql
CREATE TABLE IF NOT EXISTS acdb_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  canon TEXT NOT NULL,
  display TEXT NOT NULL,
  aliases TEXT[] DEFAULT ARRAY[]::TEXT[],
  unit TEXT NOT NULL,
  spec_default TEXT DEFAULT '',
  spec_options TEXT[] DEFAULT ARRAY[]::TEXT[],
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  mat_stats JSONB,
  labor_stats JSONB,
  exp_stats JSONB,
  year_history JSONB DEFAULT '{}'::JSONB,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, canon)
);

CREATE INDEX idx_acdb_company ON acdb_entries(company_id);
CREATE INDEX idx_acdb_canon ON acdb_entries(canon);
CREATE INDEX idx_acdb_used_count ON acdb_entries(company_id, used_count DESC);

ALTER TABLE acdb_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY acdb_company_isolation ON acdb_entries
  FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

COMMENT ON TABLE acdb_entries IS 'v1의 acDB (학습형 자동완성). 519개 시드 + 학습된 항목';
COMMENT ON COLUMN acdb_entries.source IS 'seed | manual | learned';
```

### 4.4 `009_lens_integration.sql`

```sql
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS external_quote_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS external_customer_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS input_mode TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_estimates_external_quote_id 
  ON estimates(external_quote_id) 
  WHERE external_quote_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lens_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL,
  endpoint TEXT,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  error TEXT,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lens_webhook_log_created ON lens_webhook_log(created_at DESC);

COMMENT ON COLUMN estimates.external_quote_id IS 'lens 발급 quoteId. NULL이면 직접 생성';
COMMENT ON COLUMN estimates.source IS 'direct | lens';
COMMENT ON COLUMN estimates.input_mode IS 'voice | form';
```

### 4.5 `010_price_matrix_history.sql` (Phase 10에서 사용)

```sql
ALTER TABLE price_matrix
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE NULL,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES price_matrix(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_price_matrix_effective 
  ON price_matrix(company_id, area_range, method, price_per_pyeong, effective_from);
```

### 4.6 마이그레이션 실행
```bash
supabase db push
# 또는
psql $DATABASE_URL -f supabase/migrations/007_estimate_item_overrides.sql
psql $DATABASE_URL -f supabase/migrations/008_acdb.sql
psql $DATABASE_URL -f supabase/migrations/009_lens_integration.sql
psql $DATABASE_URL -f supabase/migrations/010_price_matrix_history.sql
```

### 4.7 타입 동기화

`lib/estimate/types.ts`에 필드 추가:

```typescript
export interface EstimateItem {
  // 기존 필드 ...
  is_locked?: boolean;
  is_hidden?: boolean;
  lump_amount?: number | null;
  original_name?: string | null;
  original_spec?: string | null;
  original_unit?: string | null;
  original_qty?: number | null;
}

export interface EstimateSheet {
  // 기존 필드 ...
  is_free_mode?: boolean;
}

export interface Estimate {
  // 기존 필드 ...
  sync_urethane?: boolean;
  external_quote_id?: string | null;
  external_customer_id?: string | null;
  source?: 'direct' | 'lens';
  input_mode?: 'voice' | 'form' | null;
}
```

### 4.8 Phase 1 완료 조건
- [ ] 007~010 SQL 4개 생성
- [ ] 로컬/스테이징 Supabase 적용
- [ ] `types.ts` 업데이트
- [ ] `npm run build` 성공
- [ ] 기존 견적서 1건 조회 에러 없음
- [ ] 사용자 보고 → Phase 2 승인

---

## 5. Phase 2 — lib/acdb/ 학습형 자동완성

### 5.1 목적
v1 #2(acDB) + #3(통합검색). 시드 519개 활용해 **1일차부터 학습된 상태**.

### 5.2 파일 구조
```
lib/acdb/
├── types.ts              # AcdbEntry, AcdbSearchResult
├── canonical.ts          # 이름 정규화 (canon)
├── search.ts             # 통합 검색 (부분일치 + 초성 + 별칭)
├── client.ts             # Supabase CRUD
├── learn.ts              # 자동 학습 (견적서 저장 시 호출)
├── import.ts             # acdb_seed_final.json import
└── index.ts              # barrel export
```

### 5.3 `canonical.ts`

```typescript
// lib/acdb/canonical.ts

/**
 * 공종명 정규화: 공백 제거, 차수 정리
 * "우 레 탄 상 도" → "우레탄상도"
 * "노출우레탄 1 차" → "노출우레탄1차"
 */
export function canonicalize(name: string): string {
  let s = name.trim();
  // 한글 글자 사이 공백 제거
  while (true) {
    const next = s.replace(/([가-힣])\s+([가-힣])/g, '$1$2');
    if (next === s) break;
    s = next;
  }
  // 숫자 + 공백 + 차/회/년/mm 등 붙이기
  s = s.replace(/(\d)\s+(차|회|년|mm|m|개)/g, '$1$2');
  // 다중 공백 단일화
  s = s.replace(/\s+/g, ' ').trim();
  // 최종 canon은 모든 공백 제거
  return s.replace(/\s+/g, '');
}

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

export function toChosung(s: string): string {
  return Array.from(s).map(c => {
    const code = c.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      return CHOSUNG[Math.floor((code - 0xAC00) / 588)];
    }
    return c;
  }).join('');
}
```

### 5.4 `types.ts`

```typescript
// lib/acdb/types.ts

export interface AcdbStats {
  n: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  mean: number;
}

export interface AcdbYearHistory {
  [year: string]: {
    n: number;
    mat_median: number | null;
    labor_median: number | null;
    exp_median: number | null;
  };
}

export interface AcdbEntry {
  id?: string;
  company_id?: string;
  canon: string;
  display: string;
  aliases: string[];
  unit: string;
  spec_default: string;
  spec_options: string[];
  used_count: number;
  last_used_at?: string;
  mat_stats: AcdbStats | null;
  labor_stats: AcdbStats | null;
  exp_stats: AcdbStats | null;
  year_history: AcdbYearHistory;
  source: 'seed' | 'manual' | 'learned';
}

export interface AcdbSearchResult {
  entry: AcdbEntry;
  matchType: 'exact' | 'prefix' | 'contains' | 'chosung' | 'alias';
  score: number;
}
```

### 5.5 `search.ts`

```typescript
// lib/acdb/search.ts

import { AcdbEntry, AcdbSearchResult } from './types';
import { canonicalize, toChosung } from './canonical';

function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

export function searchAcdb(
  entries: AcdbEntry[], 
  query: string, 
  limit = 20
): AcdbSearchResult[] {
  const q = normalize(query);
  if (!q) return [];
  
  const qChosung = toChosung(query.replace(/\s/g, ''));
  const isAllChosung = /^[ㄱ-ㅎ]+$/.test(qChosung) && qChosung.length >= 2;
  const results: AcdbSearchResult[] = [];

  for (const entry of entries) {
    const canonLower = entry.canon.toLowerCase();
    
    let match: AcdbSearchResult['matchType'] | null = null;
    let score = 0;

    if (canonLower === q) {
      match = 'exact'; score = 1000;
    } else if (canonLower.startsWith(q)) {
      match = 'prefix'; score = 500;
    } else if (canonLower.includes(q)) {
      match = 'contains'; score = 200;
    } else if (isAllChosung && toChosung(entry.canon).startsWith(qChosung)) {
      match = 'chosung'; score = 100;
    } else if (entry.aliases.some(a => normalize(a).includes(q))) {
      match = 'alias'; score = 50;
    }

    if (match) {
      score += Math.log2(entry.used_count + 1) * 10;
      results.push({ entry, matchType: match, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
```

### 5.6 `client.ts`

```typescript
// lib/acdb/client.ts

import { createClient } from '@/lib/supabase/client';
import { AcdbEntry } from './types';

export async function fetchAllAcdb(companyId: string): Promise<AcdbEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('acdb_entries')
    .select('*')
    .eq('company_id', companyId)
    .order('used_count', { ascending: false });
  if (error) throw error;
  return (data || []) as AcdbEntry[];
}

export async function upsertAcdbEntry(entry: AcdbEntry): Promise<AcdbEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('acdb_entries')
    .upsert(entry, { onConflict: 'company_id,canon' })
    .select()
    .single();
  if (error) throw error;
  return data as AcdbEntry;
}

export async function incrementUsedCount(companyId: string, canon: string): Promise<void> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('acdb_entries')
    .select('used_count')
    .eq('company_id', companyId)
    .eq('canon', canon)
    .maybeSingle();
  
  if (existing) {
    await supabase
      .from('acdb_entries')
      .update({ 
        used_count: existing.used_count + 1, 
        last_used_at: new Date().toISOString() 
      })
      .eq('company_id', companyId)
      .eq('canon', canon);
  }
}
```

### 5.7 `learn.ts`

```typescript
// lib/acdb/learn.ts

import { EstimateItem } from '@/lib/estimate/types';
import { upsertAcdbEntry, incrementUsedCount } from './client';
import { AcdbEntry } from './types';
import { canonicalize } from './canonical';

export async function learnFromItem(
  companyId: string, 
  item: EstimateItem
): Promise<void> {
  const canon = canonicalize(item.name);
  if (!canon) return;
  
  try {
    await incrementUsedCount(companyId, canon);
    // already exists
  } catch {
    // create new
    const entry: AcdbEntry = {
      company_id: companyId,
      canon,
      display: item.name,
      aliases: [],
      unit: item.unit,
      spec_default: item.spec || '',
      spec_options: item.spec ? [item.spec] : [],
      used_count: 1,
      mat_stats: item.mat ? singleStat(item.mat) : null,
      labor_stats: item.labor ? singleStat(item.labor) : null,
      exp_stats: item.exp ? singleStat(item.exp) : null,
      year_history: {},
      source: 'learned',
    };
    await upsertAcdbEntry(entry);
  }
}

function singleStat(v: number) {
  return { n: 1, min: v, p25: v, median: v, p75: v, max: v, mean: v };
}
```

### 5.8 `import.ts`

```typescript
// lib/acdb/import.ts

import { createClient } from '@/lib/supabase/server';
import { AcdbEntry, AcdbStats } from './types';

interface SeedEntry {
  canon: string;
  display: string;
  aliases: string[];
  unit: string;
  spec_default: string;
  spec_options: string[];
  usedCount: number;                      // seed는 camelCase
  mat: AcdbStats | null;
  labor: AcdbStats | null;
  exp: AcdbStats | null;
  year_history: any;
}

interface SeedFile {
  meta: any;
  entries: SeedEntry[];
}

export async function importAcdbSeed(
  companyId: string, 
  seed: SeedFile
): Promise<{ imported: number; skipped: number }> {
  const supabase = createClient();
  
  // 이미 seed가 import 되어 있는지 확인
  const { count } = await supabase
    .from('acdb_entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('source', 'seed');
  
  if ((count || 0) > 0) {
    return { imported: 0, skipped: count || 0 };
  }
  
  // seed → DB 매핑
  const entries = seed.entries.map(e => ({
    company_id: companyId,
    canon: e.canon,
    display: e.display,
    aliases: e.aliases,
    unit: e.unit,
    spec_default: e.spec_default,
    spec_options: e.spec_options,
    used_count: e.usedCount,
    mat_stats: e.mat,
    labor_stats: e.labor,
    exp_stats: e.exp,
    year_history: e.year_history,
    source: 'seed' as const,
  }));
  
  // 배치 insert (100개씩)
  const BATCH = 100;
  let imported = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const { error } = await supabase.from('acdb_entries').insert(batch);
    if (error) throw error;
    imported += batch.length;
  }
  
  return { imported, skipped: 0 };
}
```

**주의**: seed JSON의 키는 `usedCount`, `mat`, `labor`, `exp`. DB 컬럼은 `used_count`, `mat_stats`, `labor_stats`, `exp_stats`. 매핑 필수.

### 5.9 유닛 테스트 (vitest)

`lib/acdb/__tests__/search.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { searchAcdb } from '../search';
import { AcdbEntry } from '../types';

const SAMPLE: AcdbEntry[] = [
  { canon: '우레탄상도', display: '우레탄상도', aliases: [], unit: '㎡', spec_default: '탑코팅', spec_options: [], used_count: 191, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
  { canon: '하도프라이머', display: '하도프라이머', aliases: [], unit: '㎡', spec_default: '', spec_options: [], used_count: 190, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
  { canon: '노출우레탄', display: '노출우레탄', aliases: ['노출 우레탄'], unit: '㎡', spec_default: '', spec_options: [], used_count: 100, mat_stats: null, labor_stats: null, exp_stats: null, year_history: {}, source: 'seed' },
];

describe('searchAcdb', () => {
  it('exact match returns highest score', () => {
    const r = searchAcdb(SAMPLE, '우레탄상도');
    expect(r[0].matchType).toBe('exact');
    expect(r[0].entry.canon).toBe('우레탄상도');
  });
  
  it('prefix match works', () => {
    const r = searchAcdb(SAMPLE, '우레탄');
    expect(r[0].matchType).toBe('prefix');
  });
  
  it('contains match works', () => {
    const r = searchAcdb(SAMPLE, '노출');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].entry.canon).toBe('노출우레탄');
  });
  
  it('chosung search works', () => {
    const r = searchAcdb(SAMPLE, 'ㅇㄹㅌ');
    expect(r.length).toBeGreaterThan(0);
  });
  
  it('alias search works', () => {
    const r = searchAcdb(SAMPLE, '노출 우레탄');
    expect(r.length).toBeGreaterThan(0);
  });
  
  it('used_count affects score in ties', () => {
    const r = searchAcdb(SAMPLE, 'ㅎ');
    expect(r[0].entry.canon).toBe('하도프라이머');
  });
});
```

### 5.10 Phase 2 완료 조건
- [ ] `lib/acdb/` 6개 파일 생성
- [ ] `searchAcdb` 유닛 테스트 6개 통과
- [ ] `canonicalize` 유닛 테스트 3개 (공백, 숫자, 다중 공백)
- [ ] `npm test` 전체 통과
- [ ] 사용자 보고 → Phase 3 승인

---

## 6. Phase 3 — lib/estimate 확장 (v1 11개 부활)

### 6.1 우선순위

| P | # | 기능 | v1 라인 참조 | 복잡도 |
|---|---|---|---|---|
| P0 | #4 | 단가 잠금 | 681-682, 3688 | 낮음 |
| P0 | #5 | 공종 숨김 | 677-678 | 낮음 |
| P0 | #16 | CRM 자동채움 | 800, 833-862 | 중간 |
| P1 | #12 | 자유입력 모드 | 881-888, 1354 | 중간 |
| P1 | #13 | 우레탄 동기화 | 659, 1456-1510 | 높음 |
| P1 | #7,8,9 | 오버라이드 (단위/이름/규격/수량) | 666-680 | 낮음 |
| P2 | #11 | lump 금액 | 1354-1355, 1622 | 낮음 |

P0 필수, P1 권장, P2 여유 있을 때.

### 6.2 #4 단가 잠금

**목적**: 평단가 변경해도 `is_locked=true` 행은 갱신 안 됨.

**수정**:
- `lib/estimate/buildItems.ts`: `BuildItemsInput`에 `preserveLockedItems?: EstimateItem[]` 추가
- `hooks/useEstimate.ts`: `toggleLock(itemId)` 액션

**buildItems.ts 패치**:

```typescript
// BuildItemsInput 확장
interface BuildItemsInput {
  // ... 기존 필드
  preserveLockedItems?: EstimateItem[];
}

export function buildItems(input: BuildItemsInput): { items: EstimateItem[]; calcResult: CalcResult } {
  // ... 기존 로직으로 built 생성

  // Lock 보존
  if (input.preserveLockedItems?.length) {
    const lockedMap = new Map<string, EstimateItem>();
    for (const l of input.preserveLockedItems) {
      if (l.is_locked) lockedMap.set(canonicalize(l.name), l);
    }
    
    for (const item of built.items) {
      const locked = lockedMap.get(canonicalize(item.name));
      if (locked) {
        item.mat = locked.mat;
        item.labor = locked.labor;
        item.exp = locked.exp;
        item.mat_amount = item.mat * item.qty;
        item.labor_amount = item.labor * item.qty;
        item.exp_amount = item.exp * item.qty;
        item.total = item.mat_amount + item.labor_amount + item.exp_amount;
        item.is_locked = true;
      }
    }
  }
  
  return { items: built.items, calcResult: calc(built.items) };
}

function canonicalize(name: string): string {
  return name.replace(/\s+/g, '');
}
```

**useEstimate.ts**: `toggleLock(itemId)` 추가. 상태 변경 후 `buildItems(..., { preserveLockedItems: currentItems })` 재호출.

### 6.3 #5 공종 숨김

**목적**: 안 쓰는 BASE 행을 한 클릭으로 숨김 (삭제 아님).

**수정**:
- `hooks/useEstimate.ts`: `toggleHide(itemId)` 액션
- `components/estimate/WorkSheet.tsx`: `is_hidden=true` 행은 **투명도 낮춤** 또는 **접힌 영역으로 이동**. 하단에 "N개 숨김" 배너.

### 6.4 #16 CRM 자동채움

v4는 `crm_customers` 테이블과 `/api/crm`, `/api/crm/search` API 보유. 견적서 생성 시 고객 검색 → 자동 채움만 구현.

**수정**:
- `app/(authenticated)/estimate/new/page.tsx`: 진입 시 "고객 검색" UI (v4에 없는 경우 신규 추가)
- `hooks/useEstimate.ts`: `fillFromCrm(crmCustomerId)` 액션

**매핑**:
```
crm_customers.name        → estimates.customer_name
crm_customers.address     → estimates.site_name
crm_customers.manager     → estimates.manager_name
crm_customers.phone       → estimates.manager_phone
crm_customers.area (평)   → estimates.m2 (= area × 3.3058)
```

**v1 참조**: `견적서.html:800-862` (`openCrmPicker`, `selectCrmClient`)

### 6.5 #12 자유입력 모드

**목적**: BASE 없이 백지에서 견적 작성.

**수정**:
- `lib/estimate/buildItems.ts`: `is_free_mode=true`면 BASE 건너뛰고 `customItems`만 사용
- `components/estimate/EstimateEditor.tsx`: 시트 생성 시 "자유입력" 옵션

```typescript
// buildItems.ts 앞부분
if (input.is_free_mode) {
  const items = input.customItems || [];
  return { items, calcResult: calc(items) };
}
// 이후 기존 로직
```

### 6.6 #13 우레탄 동기화

**목적**: 복합 시트의 우레탄 관련 행(`노출우레탄`, `벽체우레탄`, `우레탄상도`)을 우레탄 시트 단가로 자동 일치.

**신규 파일**: `lib/estimate/syncUrethane.ts`

```typescript
// lib/estimate/syncUrethane.ts

import { EstimateSheet, EstimateItem } from './types';
import { canonicalize } from '@/lib/acdb/canonical';

const URETHANE_SYNC_TARGETS = ['노출우레탄', '벽체우레탄', '우레탄상도'];

export function syncUrethaneItems(
  complexSheet: EstimateSheet,
  urethaneSheet: EstimateSheet
): EstimateSheet {
  const map = new Map<string, EstimateItem>();
  for (const it of urethaneSheet.items) {
    const key = canonicalize(it.name);
    if (URETHANE_SYNC_TARGETS.includes(key)) {
      map.set(key, it);
    }
  }
  
  const updated = complexSheet.items.map(it => {
    const key = canonicalize(it.name);
    const source = map.get(key);
    if (!source) return it;
    return {
      ...it,
      mat: source.mat,
      labor: source.labor,
      exp: source.exp,
      mat_amount: source.mat * it.qty,
      labor_amount: source.labor * it.qty,
      exp_amount: source.exp * it.qty,
      total: (source.mat + source.labor + source.exp) * it.qty,
    };
  });
  
  return { ...complexSheet, items: updated };
}
```

**`useEstimate.ts`**: `estimate.sync_urethane=true`면 우레탄 시트 업데이트 시 복합 시트 자동 재계산 (useEffect 또는 updateItem 액션 내부).

**v1 참조**: `견적서.html:659`(`syncUre05` state), `1456-1510`(동기화 useMemo)

### 6.7 #7,8,9 오버라이드

v4 `InlineCell`은 이미 편집 지원. state에서 백업 컬럼 관리만 추가.

**`useEstimate.ts`의 `updateItem` 수정**:

```typescript
const updateItem = (
  sheetIndex: number, 
  itemId: string, 
  field: keyof EstimateItem, 
  value: any
) => {
  setEstimate(prev => ({
    ...prev,
    sheets: prev.sheets.map((sheet, i) => {
      if (i !== sheetIndex) return sheet;
      return {
        ...sheet,
        items: sheet.items.map(item => {
          if (item.id !== itemId) return item;
          const updated = { ...item, [field]: value };
          // 원본 백업
          if (field === 'name' && !item.original_name) updated.original_name = item.name;
          if (field === 'spec' && !item.original_spec) updated.original_spec = item.spec;
          if (field === 'unit' && !item.original_unit) updated.original_unit = item.unit;
          if (field === 'qty' && item.original_qty == null) updated.original_qty = item.qty;
          return updated;
        }),
      };
    }),
  }));
  markCell(itemId, field);
};
```

### 6.8 #11 lump 금액

**수정**: `lib/estimate/calc.ts`

```typescript
export function calc(items: EstimateItem[]): CalcResult {
  let matTotal = 0, laborTotal = 0, expTotal = 0;
  
  for (const item of items) {
    if (item.is_hidden) continue;  // 숨김 행은 합계 제외
    
    if (item.lump_amount != null) {
      // lump: 총액만 반영, mat/labor/exp 분리 없음
      expTotal += item.lump_amount;  // 또는 labor에 귀속, 사장 확인 필요
      continue;
    }
    
    matTotal += (item.mat_amount || 0);
    laborTotal += (item.labor_amount || 0);
    expTotal += (item.exp_amount || 0);
  }
  
  const subTotal = matTotal + laborTotal + expTotal;
  const overhead = Math.round(subTotal * 0.03);
  const profit = Math.round(subTotal * 0.06);
  const grandTotalRaw = subTotal + overhead + profit;
  const grandTotal = Math.floor(grandTotalRaw / 100000) * 100000;
  
  return { matTotal, laborTotal, expTotal, subTotal, overhead, profit, grandTotal };
}
```

**주의**: lump이 재료/노무/경비 중 어디에 귀속되는지 사장 확인 필요. 기본값 `exp`(경비)로 가되, 다르면 사용자에게 질문.

### 6.9 Phase 3 완료 조건
- [ ] 7개 기능 구현
- [ ] 각 기능별 vitest 유닛 테스트 1개 이상
- [ ] 기존 견적서 생성 플로우 깨지지 않음 (playwright e2e 1회 통과)
- [ ] `npm run build` 성공
- [ ] 사용자 보고 → Phase 4 승인

---

## 7. Phase 4 — lib/lens/ + /api/lens/quote

### 7.1 파일 구조
```
lib/lens/
├── types.ts              # QuoteInput, QuoteItem, QuoteOutput
├── adapter.ts            # QuoteInput ↔ Estimate 변환
├── auth.ts               # 웹훅 인증
└── index.ts

app/api/lens/
└── quote/
    ├── route.ts          # POST /api/lens/quote
    └── [quoteId]/
        └── pdf/
            └── route.ts  # GET /api/lens/quote/[quoteId]/pdf
```

### 7.2 `types.ts` — 절대 변경 금지

```typescript
// lib/lens/types.ts

/**
 * ⚠ 이 타입들은 lens 슈퍼앱과의 계약입니다.
 * 변경 시 반드시 사용자 승인 + lens 쪽 동시 변경 + 버전 마이그레이션 경로 필요.
 * 필드 추가는 optional로만. 기존 필드 삭제·이름변경·타입변경 금지.
 */

export interface QuoteInput {
  quoteId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  siteAddress: string;
  buildingType?: string;
  visitDate: string;
  salesPersonId: string;
  salesPersonName: string;
  items: QuoteItem[];
  discountAmount?: number;
  notes?: string;
}

export interface QuoteItem {
  workTypeCode: string;
  workTypeName: string;
  area: number;
  unitPrice: number;
  subtotal: number;
}

export interface QuoteOutput {
  quoteId: string;
  pdfUrl: string;
  pdfHash: string;
  totalAmount: number;
  vatAmount: number;
  grandTotal: number;
  generatedAt: string;
  inputMode: 'voice' | 'form';
  rawTranscript?: string;
}

export interface VoiceParseResult {
  transcript: string;
  confidence: number;
  parsed: Partial<QuoteInput>;
  unparsedFields: string[];
  needsConfirmation: boolean;
}
```

### 7.3 `adapter.ts`

```typescript
// lib/lens/adapter.ts

import { QuoteInput, QuoteOutput } from './types';
import { Estimate, EstimateItem, EstimateSheet } from '@/lib/estimate/types';
import { calc } from '@/lib/estimate/calc';
import { nanoid } from 'nanoid';

export function lensInputToEstimate(
  input: QuoteInput, 
  companyId: string
): Estimate {
  const items: EstimateItem[] = input.items.map((it, idx) => ({
    id: `temp-${nanoid(8)}`,
    sheet_id: '',
    sort_order: idx,
    name: it.workTypeName,
    spec: '',
    unit: '㎡',
    qty: it.area,
    mat: 0,
    labor: it.unitPrice,     // lens는 unitPrice 단일 → 초기엔 labor에 몰아넣음. Phase 10에서 개선
    exp: 0,
    mat_amount: 0,
    labor_amount: it.unitPrice * it.area,
    exp_amount: 0,
    total: it.subtotal,
    is_base: false,
    is_equipment: false,
    is_fixed_qty: false,
  }));
  
  const calcResult = calc(items);
  
  const sheet: EstimateSheet = {
    id: `temp-sheet-${nanoid(8)}`,
    estimate_id: '',
    type: '복합',
    title: input.buildingType || '방수공사',
    plan: '제 1안',
    price_per_pyeong: 0,
    warranty_years: 5,
    warranty_bond: 3,
    grand_total: calcResult.grandTotal,
    sort_order: 0,
    items,
  };
  
  return {
    id: '',
    company_id: companyId,
    customer_id: null,
    created_by: null,
    mgmt_no: '',     // 나중에 발급
    status: 'draft',
    date: input.visitDate,
    customer_name: input.customerName,
    site_name: input.siteAddress,
    m2: input.items.reduce((s, it) => s + it.area, 0),
    wall_m2: 0,
    manager_name: input.salesPersonName,
    manager_phone: '',
    memo: input.notes || '',
    excel_url: null,
    pdf_url: null,
    folder_path: null,
    email_sent_at: null,
    email_viewed_at: null,
    email_to: null,
    voice_session_id: null,
    external_quote_id: input.quoteId,
    external_customer_id: input.customerId,
    source: 'lens',
    input_mode: null,
    sheets: [sheet],
  };
}

export function estimateToLensOutput(
  estimate: Estimate,
  pdfUrl: string,
  pdfHash: string,
  inputMode: 'voice' | 'form'
): QuoteOutput {
  const grandTotal = estimate.sheets.reduce((s, sh) => s + (sh.grand_total || 0), 0);
  const vatAmount = Math.round(grandTotal * 0.1);
  
  return {
    quoteId: estimate.external_quote_id!,
    pdfUrl,
    pdfHash,
    totalAmount: grandTotal,
    vatAmount,
    grandTotal: grandTotal + vatAmount,
    generatedAt: new Date().toISOString(),
    inputMode,
  };
}
```

### 7.4 `auth.ts`

```typescript
// lib/lens/auth.ts

import crypto from 'crypto';

export function verifyLensWebhook(
  rawBody: string, 
  signature: string | null
): boolean {
  const secret = process.env.LENS_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  
  if (signature.length !== expected.length) return false;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 7.5 `app/api/lens/quote/route.ts`

```typescript
// app/api/lens/quote/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyLensWebhook } from '@/lib/lens/auth';
import { lensInputToEstimate, estimateToLensOutput } from '@/lib/lens/adapter';
import { QuoteInput } from '@/lib/lens/types';
import { createClient } from '@/lib/supabase/server';
import { generateQuotePdf } from '@/lib/pdf/generateQuotePdf';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-lens-signature');
  
  if (!verifyLensWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  let input: QuoteInput;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  
  if (!input.quoteId || !input.customerId || !input.items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  const supabase = createClient();
  
  // Idempotency
  const { data: existing } = await supabase
    .from('estimates')
    .select('id, pdf_url, external_quote_id')
    .eq('external_quote_id', input.quoteId)
    .maybeSingle();
  
  if (existing?.pdf_url) {
    // 이미 생성됨 → 기존 PDF URL 반환
    return NextResponse.json({
      quoteId: input.quoteId,
      pdfUrl: existing.pdf_url,
      pdfHash: '',      // 재계산 생략
      totalAmount: 0,
      vatAmount: 0,
      grandTotal: 0,
      generatedAt: new Date().toISOString(),
      inputMode: 'form',
    });
  }
  
  const companyId = process.env.LENS_DEFAULT_COMPANY_ID;
  if (!companyId) {
    return NextResponse.json({ error: 'Server misconfigured: LENS_DEFAULT_COMPANY_ID' }, { status: 500 });
  }
  
  // Estimate 생성
  const estimate = lensInputToEstimate(input, companyId);
  const today = new Date().toISOString().slice(2,10).replace(/-/g,'');
  const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  estimate.mgmt_no = `BS-${today}-${seq}`;
  
  // DB insert (estimates)
  const { data: inserted, error: insertError } = await supabase
    .from('estimates')
    .insert({
      company_id: estimate.company_id,
      mgmt_no: estimate.mgmt_no,
      status: 'draft',
      date: estimate.date,
      customer_name: estimate.customer_name,
      site_name: estimate.site_name,
      m2: estimate.m2,
      manager_name: estimate.manager_name,
      memo: estimate.memo,
      external_quote_id: estimate.external_quote_id,
      external_customer_id: estimate.external_customer_id,
      source: 'lens',
      input_mode: 'form',
    })
    .select()
    .single();
  
  if (insertError) {
    await logWebhook(supabase, 'inbound', '/api/lens/quote', input, null, 500, insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  
  estimate.id = inserted.id;
  
  // sheets + items insert (v4의 기존 저장 로직 참조)
  for (const sheet of estimate.sheets) {
    sheet.estimate_id = inserted.id;
    const { data: sheetRow, error: sheetErr } = await supabase
      .from('estimate_sheets')
      .insert({
        estimate_id: inserted.id,
        type: sheet.type,
        title: sheet.title,
        plan: sheet.plan,
        price_per_pyeong: sheet.price_per_pyeong,
        warranty_years: sheet.warranty_years,
        warranty_bond: sheet.warranty_bond,
        grand_total: sheet.grand_total,
        sort_order: sheet.sort_order,
      })
      .select()
      .single();
    if (sheetErr) {
      await logWebhook(supabase, 'inbound', '/api/lens/quote', input, null, 500, sheetErr.message);
      return NextResponse.json({ error: sheetErr.message }, { status: 500 });
    }
    sheet.id = sheetRow.id;
    
    const itemRows = sheet.items.map(it => ({
      sheet_id: sheetRow.id,
      sort_order: it.sort_order,
      name: it.name,
      spec: it.spec,
      unit: it.unit,
      qty: it.qty,
      mat: it.mat,
      labor: it.labor,
      exp: it.exp,
      mat_amount: it.mat_amount,
      labor_amount: it.labor_amount,
      exp_amount: it.exp_amount,
      total: it.total,
      is_base: it.is_base,
      is_equipment: it.is_equipment,
      is_fixed_qty: it.is_fixed_qty,
    }));
    await supabase.from('estimate_items').insert(itemRows);
  }
  
  // PDF 생성 (Phase 5 완료 후 실제 작동)
  const pdfBuffer = await generateQuotePdf(estimate);
  const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex').slice(0, 16);
  const pdfPath = `quotes/${input.quoteId}/${pdfHash}.pdf`;
  
  const { error: uploadError } = await supabase.storage
    .from('estimates')
    .upload(pdfPath, pdfBuffer, { 
      contentType: 'application/pdf', 
      upsert: true 
    });
  
  if (uploadError) {
    await logWebhook(supabase, 'inbound', '/api/lens/quote', input, null, 500, uploadError.message);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }
  
  const { data: urlData } = supabase.storage
    .from('estimates')
    .getPublicUrl(pdfPath);
  const pdfUrl = urlData.publicUrl;
  
  await supabase
    .from('estimates')
    .update({ pdf_url: pdfUrl, status: 'saved' })
    .eq('id', inserted.id);
  
  const output = estimateToLensOutput(estimate, pdfUrl, pdfHash, 'form');
  
  await logWebhook(supabase, 'inbound', '/api/lens/quote', input, output, 200, null, inserted.id);
  
  return NextResponse.json(output);
}

async function logWebhook(
  supabase: any,
  direction: string,
  endpoint: string,
  requestBody: any,
  responseBody: any,
  statusCode: number,
  error: string | null,
  estimateId?: string
) {
  await supabase.from('lens_webhook_log').insert({
    direction, endpoint,
    request_body: requestBody,
    response_body: responseBody,
    status_code: statusCode,
    error,
    estimate_id: estimateId || null,
  });
}
```

### 7.6 `app/api/lens/quote/[quoteId]/pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  const supabase = createClient();
  const { data } = await supabase
    .from('estimates')
    .select('pdf_url')
    .eq('external_quote_id', params.quoteId)
    .maybeSingle();
  
  if (!data?.pdf_url) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  return NextResponse.redirect(data.pdf_url);
}
```

### 7.7 Phase 4 완료 조건
- [ ] `lib/lens/` 4개 파일
- [ ] `/api/lens/quote` POST, `/api/lens/quote/[quoteId]/pdf` GET 라우트 생성
- [ ] HMAC 인증 테스트 (curl 샘플)
- [ ] Idempotency 테스트 (같은 quoteId로 두 번 호출)
- [ ] `lens_webhook_log` 기록 확인
- [ ] **PDF 생성 부분은 Phase 5 완료 후 실제 동작** (현재는 stub 가능)
- [ ] 사용자 보고

---

## 8. Phase 5 — components/quote-pdf/ Figma 픽셀 복제

### 8.1 결정적 발견: 회전

Figma 파일 `OLxyy4grM15JV5dvQcuHF6`의 모든 노드는 **`-90도 회전 상태`**로 저장되어 있음. 이전 4차례 시도가 실패한 근본 원인.

```
Figma 캔버스: 1552 × 1097 (가로)
실제 출력 A4: 1097 × 1552 (세로)

회전 풀기 공식:
  real_x = rotated_y
  real_y = 1552 - rotated_x - rotated_w
  real_w = rotated_h
  real_h = rotated_w
```

검증: 1097 × √2 ≈ 1551.7 ≈ 1552 → A4 세로 비율 정확히 일치.

### 8.2 작업 순서

#### Step 1. Figma raw 수집

Figma MCP가 클로드 코드 환경에 있다고 가정. 없으면 사용자에게 보고하고, 채팅 클로드가 대신 raw 추출해서 전달.

대상:
- fileKey: `OLxyy4grM15JV5dvQcuHF6`
- 표지: `542:151`
- 세부 견적: `542:744`

각 노드에 `get_metadata` + `get_design_context` 호출. 결과를 저장:
- `data/figma-raw/cover.json`
- `data/figma-raw/detail.json`

수집할 것:
- id, name, type
- left, top, width, height
- text 내용 (텍스트 노드)
- font-family, font-size, font-weight, color
- background, border
- image URL (이미지 노드)

#### Step 2. 회전 변환 유틸

```typescript
// lib/figma/unrotate.ts

const FIGMA_CANVAS_WIDTH = 1552;

export interface FigmaRotatedNode {
  id: string;
  name: string;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  background?: string;
  imageUrl?: string;
}

export interface UnrotatedNode extends Omit<FigmaRotatedNode, 'left' | 'top'> {
  x: number;
  y: number;
}

export function unrotate(node: FigmaRotatedNode): UnrotatedNode {
  return {
    ...node,
    x: node.top,
    y: FIGMA_CANVAS_WIDTH - node.left - node.width,
    width: node.height,
    height: node.width,
  };
}

export function unrotateAll(nodes: FigmaRotatedNode[]): UnrotatedNode[] {
  return nodes.map(unrotate);
}
```

**테스트**: 한 노드의 변환 결과가 캔버스 범위(1097×1552) 안에 들어가는지 확인. 안 들어가면 부호 검토.

#### Step 3. 변환 스크립트

```typescript
// scripts/unrotate-figma.ts

import fs from 'fs';
import path from 'path';
import { unrotateAll } from '@/lib/figma/unrotate';

const RAW_DIR = 'data/figma-raw';
const OUT_DIR = 'data/figma-unrotated';

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const file of ['cover.json', 'detail.json']) {
  const raw = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf-8'));
  const nodes = Array.isArray(raw) ? raw : raw.nodes;
  const unrotated = unrotateAll(nodes);
  
  // 범위 검증
  for (const n of unrotated) {
    if (n.x < 0 || n.y < 0 || n.x + n.width > 1097 || n.y + n.height > 1552) {
      console.warn(`OUT OF BOUNDS: ${n.name} (${n.x}, ${n.y}, ${n.width}, ${n.height})`);
    }
  }
  
  fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(unrotated, null, 2));
  console.log(`${file}: ${unrotated.length} nodes converted`);
}
```

#### Step 4. 디자인 토큰 확장

v4가 이미 Tailwind 디자인 토큰을 가지고 있고, `brand: '#A11D1F'`가 Figma 특기사항 빨강과 **정확히 일치**. 그대로 사용.

`tailwind.config.js`의 `extend` 섹션에 PDF 전용 토큰 추가:

```javascript
module.exports = {
  // ... 기존
  theme: {
    extend: {
      colors: {
        brand: { /* 기존 그대로 */ },
        accent: { /* 기존 */ },
        surface: { /* 기존 */ },
        ink: { /* 기존 */ },
        
        // PDF 전용 추가
        quote: {
          'black': '#121212',
          'label-bg': 'rgba(217, 217, 217, 0.53)',
          'secondary-bg': 'rgba(235, 235, 235, 0.5)',
          'logo-red': '#c83030',
          'logo-navy': '#0d173f',
          'brand-box': 'rgba(52, 60, 97, 0.55)',
          'muted-label': 'rgba(0, 0, 0, 0.3)',
        },
      },
      fontSize: {
        'quote-micro': ['14.753px', { lineHeight: '1' }],
        'quote-body': ['16.597px', { lineHeight: '1.2' }],
        'quote-meta': ['19.724px', { lineHeight: '1.2' }],
        'quote-subtitle': ['27.662px', { lineHeight: '1.2' }],
        'quote-title': ['43.741px', { lineHeight: '1.2' }],
        'quote-hanja': ['8.858px', { lineHeight: '1' }],
      },
      width: { 'a4-w': '1097px' },
      height: { 'a4-h': '1552px' },
    },
  },
};
```

#### Step 5. PDF 컴포넌트

```
components/quote-pdf/
├── CoverPagePdf.tsx       # 표지 한 페이지
├── DetailPagePdf.tsx      # 세부 견적 한 페이지
├── BrandLogos.tsx         # 하단 6개 브랜드 로고
└── QuotePdfRoot.tsx       # 두 페이지 합치기 (CSS page break)
```

**구조**: `position: absolute` + 변환된 좌표 직접 지정.

```tsx
// components/quote-pdf/CoverPagePdf.tsx

import { Estimate } from '@/lib/estimate/types';
import { toKoreanAmount } from '@/lib/utils/numberToKorean';
import { fm } from '@/lib/utils/format';
import unrotatedNodes from '@/data/figma-unrotated/cover.json';

interface Props { estimate: Estimate; }

export function CoverPagePdf({ estimate }: Props) {
  const grandTotal = estimate.sheets[0]?.grand_total || 0;
  
  return (
    <div 
      className="relative bg-white w-a4-w h-a4-h overflow-hidden"
      style={{ fontFamily: '"Pretendard", "Noto Sans KR", "Inter", sans-serif' }}
    >
      {/* 정적 요소들은 unrotated JSON에서 좌표 가져와 렌더 */}
      {/* 예시: 견 적 서 큰 타이틀 */}
      <div 
        className="absolute text-quote-title font-semibold text-black whitespace-nowrap"
        style={{ left: /* from JSON */, top: /* from JSON */ }}
      >
        견 적 서
      </div>
      
      {/* 동적 요소들은 데이터 바인딩 */}
      {/* 관리번호 */}
      <div className="absolute text-quote-meta font-normal text-black" style={{ /* from JSON */ }}>
        {estimate.mgmt_no}
      </div>
      
      {/* 견적일 */}
      <div className="absolute text-quote-meta font-normal text-black" style={{ /* from JSON */ }}>
        {formatKoreanDate(estimate.date)}
      </div>
      
      {/* 주소 */}
      <div className="absolute text-quote-meta font-normal text-black" style={{ /* from JSON */ }}>
        {estimate.site_name}
      </div>
      
      {/* 공사명 */}
      <div className="absolute text-quote-meta font-normal text-black" style={{ /* from JSON */ }}>
        {estimate.sheets[0]?.title || '방수공사'}
      </div>
      
      {/* 공급자 정보 (하드코딩 OK — 방수명가 본사 고정) */}
      <CompanyInfoBlock />
      
      {/* 공사금액 큰 합계 */}
      <div 
        className="absolute text-quote-subtitle font-semibold text-black"
        style={{ /* from JSON */ }}
      >
        {toKoreanAmount(grandTotal)}
      </div>
      
      {/* 시공 항목 표 (항목 수가 동적) */}
      <ItemTable items={estimate.sheets[0]?.items || []} />
      
      {/* 특기사항 (빨간 글씨) */}
      <div className="absolute text-quote-body font-semibold text-brand" style={{ /* from JSON */ }}>
        특기사항
      </div>
      <div className="absolute text-quote-body text-black leading-relaxed" style={{ /* from JSON */ }}>
        1. 하자보수기간 5년 (하자이행증권 3년)<br/>
        2. 견적서 제출 30일 유효<br/>
        * 부가가치세별도
      </div>
      
      {/* 브랜드 로고 */}
      <BrandLogos />
      
      {/* 좌측 사이드 방수 로고 */}
      <BangsuLogo />
    </div>
  );
}

function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
}
```

**중요**: 실제 좌표는 `data/figma-unrotated/cover.json`에서 가져와야 함. 위 JSX는 구조 예시. Step 1~3이 완료되어야 실제 좌표 대입 가능.

```tsx
// components/quote-pdf/DetailPagePdf.tsx (요약)

export function DetailPagePdf({ estimate }: Props) {
  const sheet = estimate.sheets[0];
  if (!sheet) return null;
  
  return (
    <div className="relative bg-white w-a4-w h-a4-h overflow-hidden">
      {/* 12열 표: 비고 / 품명 / 규격 / 단위 / 수량 / 재료단가·금액 / 노무단가·금액 / 경비단가·금액 / 합계 */}
      {/* 헤더 행 */}
      <TableHeader />
      
      {/* 데이터 행 (sheet.items) */}
      {sheet.items.map((item, idx) => (
        <ItemRow key={item.id} item={item} rowIndex={idx} />
      ))}
      
      {/* 소계 / 공과잡비(3%) / 기업이윤(6%) / 합계 */}
      <CalcRows calcResult={calc(sheet.items)} />
      
      {/* 좌측 사이드 */}
      <BangsuLogo />
      <WorkTitleBox mgmtNo={estimate.mgmt_no} title={sheet.title} />
    </div>
  );
}
```

#### Step 6. 내부 렌더링 페이지

```tsx
// app/estimate/[id]/pdf-render/page.tsx

import { CoverPagePdf } from '@/components/quote-pdf/CoverPagePdf';
import { DetailPagePdf } from '@/components/quote-pdf/DetailPagePdf';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

// 내부 시크릿으로 보호 (외부 직접 접근 방지)
export default async function PdfRenderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { secret?: string };
}) {
  if (searchParams.secret !== process.env.INTERNAL_PDF_SECRET) {
    notFound();
  }
  
  const supabase = createClient();
  // ... estimate + sheets + items 로드
  
  return (
    <>
      <CoverPagePdf estimate={estimate} />
      <div style={{ pageBreakAfter: 'always' }} />
      <DetailPagePdf estimate={estimate} />
    </>
  );
}
```

#### Step 7. 폰트 로드

```tsx
// app/estimate/[id]/pdf-render/layout.tsx

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" 
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+KR:wght@400;600;700&display=block" 
          rel="stylesheet" 
        />
        <style>{`
          @page { size: 1097px 1552px; margin: 0; }
          html, body { margin: 0; padding: 0; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`display=block`은 폰트 로드 전 텍스트 숨김 → PDF flash 방지.

#### Step 8. PDF 생성 함수

```typescript
// lib/pdf/generateQuotePdf.ts

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { Estimate } from '@/lib/estimate/types';

export async function generateQuotePdf(estimate: Estimate): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
    executablePath: await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.tar'
    ),
    headless: true,
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1097, height: 1552, deviceScaleFactor: 2 });
    
    const url = new URL(
      `/estimate/${estimate.id}/pdf-render`,
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    );
    url.searchParams.set('secret', process.env.INTERNAL_PDF_SECRET!);
    
    await page.goto(url.toString(), { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');
    
    const pdfBuffer = await page.pdf({
      width: '1097px',
      height: '1552px',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
```

#### Step 9. 자산 다운로드

Figma 이미지 URL은 7일 유효 → 즉시 다운로드:

```typescript
// scripts/download-figma-assets.ts

import fs from 'fs';
import path from 'path';
import https from 'https';

const ASSETS = [
  // Figma URL (cover.json에서 추출) → 로컬 경로
  { url: '...ci1.png', dest: 'public/quote-assets/ci.png' },
  { url: '...samsung.png', dest: 'public/quote-assets/samsung.png' },
  // ... 6개 브랜드 로고 + 방수 로고
];

async function download(url: string, dest: string) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(null); });
    }).on('error', reject);
  });
}

async function main() {
  fs.mkdirSync('public/quote-assets', { recursive: true });
  for (const a of ASSETS) {
    console.log(`Downloading ${a.dest}...`);
    await download(a.url, a.dest);
  }
}
main();
```

### 8.3 Phase 5 완료 조건
- [ ] `data/figma-raw/cover.json`, `detail.json`
- [ ] `data/figma-unrotated/cover.json`, `detail.json`
- [ ] `lib/figma/unrotate.ts` + 유닛 테스트 (한 노드 샘플 검증)
- [ ] `components/quote-pdf/` 4개 컴포넌트
- [ ] `public/quote-assets/` 최소 7개 이미지
- [ ] `lib/pdf/generateQuotePdf.ts` 동작
- [ ] 샘플 Estimate로 PDF 생성 → 파일 저장 확인
- [ ] 사용자 보고 (픽셀 검증은 Phase 9)

---

## 9. Phase 6 — UI 보강

### 9.1 작업 목록

1. **redo 추가** (`useEstimate.ts`): v4는 undo만 있음. `redoStack: Snapshot[]` 추가, `undo()`가 pop한 상태를 `redoStack`에 push, `redo()`에서 역순.

2. **드래그 정렬** (`WorkSheet.tsx`): `react-dnd`로 공종 행 drag. drop 시 `sort_order` 업데이트.

3. **단가 잠금 토글** (`WorkSheet.tsx`): 각 행 우측에 자물쇠 아이콘. 클릭 시 `toggleLock(itemId)`.

4. **공종 숨김 UI** (`WorkSheet.tsx`): 각 행에 눈 아이콘. 숨긴 행은 접힘 + 하단 "N개 숨김" 배너.

5. **자유입력 진입** (`app/(authenticated)/estimate/new/page.tsx`): 새 견적서 시 "BASE 사용 / 자유입력 / 음성 시작" 3개 버튼.

6. **우레탄 동기화 체크박스** (`TabBar.tsx` 또는 `EstimateEditor.tsx` 상단): `sync_urethane` 토글.

### 9.2 Phase 6 완료 조건
- [ ] 6개 UI 요소 구현
- [ ] 드래그 e2e 1회 통과
- [ ] 수동 QA (사용자 검증)

---

## 10. Phase 7 — acDB 시드 import 실행

### 10.1 스크립트

```typescript
// scripts/import-acdb-seed.ts

import fs from 'fs';
import path from 'path';
import { importAcdbSeed } from '@/lib/acdb/import';

async function main() {
  const companyId = process.argv[2];
  if (!companyId) {
    console.error('Usage: tsx scripts/import-acdb-seed.ts <companyId>');
    process.exit(1);
  }
  
  const seedPath = path.join(process.cwd(), 'data/acdb-seed.json');
  if (!fs.existsSync(seedPath)) {
    console.error(`Not found: ${seedPath}`);
    console.error('Run: cp /path/to/acdb_seed_final.json data/acdb-seed.json');
    process.exit(1);
  }
  
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  console.log(`Importing ${seed.entries.length} entries for company ${companyId}...`);
  
  const result = await importAcdbSeed(companyId, seed);
  console.log(`Imported: ${result.imported}, Skipped: ${result.skipped}`);
}

main().catch(console.error);
```

### 10.2 실행 순서

```bash
# 1. 시드 파일 배치
cp /path/to/acdb_seed_final.json data/acdb-seed.json

# 2. companyId 확인
psql $DATABASE_URL -c "SELECT id, name FROM companies LIMIT 5"

# 3. import 실행
npx tsx scripts/import-acdb-seed.ts <companyId>

# 4. 검증
psql $DATABASE_URL -c "SELECT COUNT(*), source FROM acdb_entries GROUP BY source"
# 예상: seed | 519
```

### 10.3 Phase 7 완료 조건
- [ ] `data/acdb-seed.json` 배치
- [ ] 519개 entry import 성공
- [ ] 자동완성 "우레탄" 검색 → 10+개 결과 확인

---

## 11. Phase 8 — 음성 → 폼 escalation

### 11.1 목적
영업사원이 음성으로 시작했다가 복잡해지면 그 시점까지의 데이터를 들고 폼 모드로 점프.

### 11.2 구현

- `hooks/useEstimateVoice.ts`에 `escalateToForm()` 액션 추가
- 현재 `estimate` state는 그대로, `input_mode: 'voice' → 'form'`으로 변경
- DB에 `estimates.input_mode` 업데이트
- UI: 음성 모드 화면 우상단 "폼으로 전환" 버튼

```typescript
// useEstimateVoice.ts 내부

const escalateToForm = async () => {
  await updateEstimateMeta('input_mode', 'form');
  setActiveTab('complex-detail');  // 폼 탭으로 전환
};
```

### 11.3 Phase 8 완료 조건
- [ ] `escalateToForm` 동작
- [ ] e2e 1회 (음성 3필드 입력 → 전환 → 폼에서 계속)

---

## 12. Phase 9 — 통합 테스트 + 픽셀 검증

### 12.1 픽셀 검증 스크립트

```typescript
// scripts/verify-pixel-match.ts

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import puppeteer from 'puppeteer';

async function capture(url: string, outPath: string, clipSelector?: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1097, height: 1552, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 500));   // 안전 대기
  await page.screenshot({ path: outPath, fullPage: false });
  await browser.close();
}

function compare(aPath: string, bPath: string, diffPath: string): number {
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Dimension mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }
  
  const diff = new PNG({ width: a.width, height: a.height });
  const diffPixels = pixelmatch(
    a.data, b.data, diff.data, 
    a.width, a.height, 
    { threshold: 0.1 }
  );
  
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return diffPixels / (a.width * a.height);
}

async function main() {
  const threshold = parseFloat(process.env.PIXEL_MATCH_THRESHOLD || '0.01');
  fs.mkdirSync('verify', { recursive: true });
  
  // 1. 샘플 견적서 URL 준비 (seed 데이터에서 추출)
  const sampleId = process.env.SAMPLE_ESTIMATE_ID || 'sample';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const secret = process.env.INTERNAL_PDF_SECRET;
  
  // 2. 우리 시스템 캡처
  await capture(
    `${baseUrl}/estimate/${sampleId}/pdf-render?page=cover&secret=${secret}`,
    'verify/our-cover.png'
  );
  await capture(
    `${baseUrl}/estimate/${sampleId}/pdf-render?page=detail&secret=${secret}`,
    'verify/our-detail.png'
  );
  
  // 3. Figma 스크린샷은 사전에 준비되어 있어야 함
  //    (Figma MCP의 get_screenshot 호출 결과 또는 사용자가 수동 export)
  //    verify/figma-cover.png, verify/figma-detail.png
  
  if (!fs.existsSync('verify/figma-cover.png')) {
    console.error('Missing verify/figma-cover.png. Use Figma MCP get_screenshot to prepare.');
    process.exit(1);
  }
  
  // 4. 비교
  const coverDiff = compare('verify/figma-cover.png', 'verify/our-cover.png', 'verify/diff-cover.png');
  const detailDiff = compare('verify/figma-detail.png', 'verify/our-detail.png', 'verify/diff-detail.png');
  
  console.log(`Cover diff: ${(coverDiff*100).toFixed(3)}%`);
  console.log(`Detail diff: ${(detailDiff*100).toFixed(3)}%`);
  
  if (coverDiff > threshold || detailDiff > threshold) {
    console.error(`FAIL: threshold ${(threshold*100).toFixed(1)}% exceeded`);
    process.exit(1);
  }
  console.log('PASS');
}

main().catch(err => { console.error(err); process.exit(1); });
```

### 12.2 E2E 시나리오 (Playwright)

```
e2e/complete-flow.spec.ts:
1. /estimate/new 접속
2. 고객 검색 → 선택 → 자동 채움 확인
3. "복합방수" 시트 추가
4. 공종 자동완성 "우레탄" 입력 → 드롭다운에서 선택
5. 면적 입력, 단가 입력
6. 단가 잠금 토글
7. 한 행 숨김 → 합계에서 제외됨 확인
8. 우레탄 동기화 토글 활성화
9. 저장 → DB 확인
10. PDF 생성 버튼 → PDF URL 반환
11. PDF URL 접근 → 200 확인
```

### 12.3 lens webhook 테스트 (curl)

```bash
#!/bin/bash
# scripts/test-lens-webhook.sh

BODY='{
  "quoteId": "test-lens-001",
  "customerId": "cust-abc",
  "customerName": "홍길동",
  "customerPhone": "010-1234-5678",
  "siteAddress": "서울시 강남구 테스트동 123",
  "visitDate": "2026-04-10",
  "salesPersonId": "sales-01",
  "salesPersonName": "박민우",
  "items": [
    { "workTypeCode": "URE-01", "workTypeName": "우레탄 방수", "area": 150, "unitPrice": 12000, "subtotal": 1800000 }
  ],
  "notes": "하자보수 5년"
}'

SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$LENS_WEBHOOK_SECRET" | awk '{print $2}')

curl -X POST http://localhost:3000/api/lens/quote \
  -H "Content-Type: application/json" \
  -H "x-lens-signature: $SIG" \
  -d "$BODY"
```

### 12.4 Phase 9 완료 조건
- [ ] 픽셀 diff < 1% (cover, detail)
- [ ] E2E 11개 시나리오 통과
- [ ] lens webhook curl 테스트 200 응답
- [ ] `npm run build` 성공
- [ ] `npm test` 전체 통과
- [ ] 사용자 보고

---

## 13. Phase 10 — 사장용 단가 시점 이력

### 13.1 목적
"작년 견적서를 다시 출력" 시 현재 단가가 아닌 그 당시 단가로 복원.

### 13.2 수정

**`lib/estimate/priceData.ts`**: `getPD()`에 `effectiveDate?: Date` 파라미터 추가. 해당 날짜에 유효한 price_matrix 레코드 선택:

```typescript
SELECT * FROM price_matrix
WHERE company_id = $1
  AND area_range = $2
  AND method = $3
  AND price_per_pyeong = $4
  AND effective_from <= $5
  AND (effective_to IS NULL OR effective_to > $5)
```

**`components/settings/PriceMatrixEditor.tsx`**: 단가 변경 시
1. 기존 레코드에 `effective_to = TODAY` 업데이트
2. 새 레코드 insert (effective_from = TODAY, effective_to = NULL)
3. 기존 레코드의 `superseded_by`에 새 레코드 id 저장

**신규 화면 `components/settings/PriceHistoryView.tsx`**: 공종·면적대 선택 → 시점별 단가 라인 차트. 단가 변경 시기 마커 표시.

### 13.3 Phase 10 완료 조건
- [ ] 단가 변경 시 이력 유지 (DB 검증)
- [ ] 이력 뷰 UI 동작
- [ ] 과거 견적서 재출력 시 당시 단가 사용 (e2e 1회)

---

## 14. 절대 변경 금지 — lens 인터페이스

`lib/lens/types.ts`의 `QuoteInput`, `QuoteItem`, `QuoteOutput`, `VoiceParseResult` 4개 인터페이스는 lens 슈퍼앱과의 계약. 다음 조건 하에만 변경:

1. 사용자 명시적 승인
2. lens 쪽 시스템 동시 변경 확인
3. 버전 마이그레이션 경로 명시

필드 추가는 **optional로만**. 기존 필드 삭제·이름변경·타입변경 **금지**.

---

## 15. 막힐 때 행동 지침

0. **v4 코드 참조가 필요할 때** → `C:\Users\나\bsmg-v4-archive\` 폴더를 **읽기 전용으로만** 사용. 절대 수정·이동·삭제 금지. v1 원본 (`견적서.html`)도 여기 있음. grep 예: `grep -n "syncUre05" C:\Users\나\bsmg-v4-archive\견적서.html` (실제 파일 이름 확인 필요).
1. **v4의 함수 이름이 이 문서와 다름** → 실제 v5 폴더(bsmg-v5) 내 코드에서 grep으로 찾아서 실제 이름 사용. 이 문서 이름 고집 금지.
2. **Figma MCP가 클로드 코드에 없음** → 사용자에게 보고. 채팅 클로드가 대신 raw 추출해서 전달 가능.
3. **Supabase 마이그레이션 충돌** → 기존 006까지와 컬럼명 충돌 재확인. 충돌 시 중단하고 보고.
4. **회전 변환 후 좌표가 캔버스 밖** → 부호 검토. 한 노드만 수동 샘플링해서 Figma 스크린샷과 대조. 공식 부호 틀렸으면 수정.
5. **폰트가 PDF에서 깨짐** → `document.fonts.ready` 대기 + `display=block` + 네트워크 안정 후 screenshot.
6. **lens 어댑터: unitPrice 단일을 mat/labor/exp 3열로** → 사용자에게 질문. 초기엔 임시로 `labor`에 몰아넣고 `mat=0, exp=0`. 이후 개선.
7. **acDB의 `used_count` 증가 레이스 컨디션** → 간단 해결: upsert + increment. 부하 심하면 RPC 함수로 원자적 증가.
8. **Phase 4 `/api/lens/quote`가 Phase 5 완료 전 호출됨** → `generateQuotePdf`를 stub으로 교체해서 임시 PDF Buffer 반환. Phase 5 완료 후 실제 구현으로 교체.

---

## 16. 각 Phase 보고 양식

Phase 완료 시 사용자에게 다음 양식으로 보고:

```
## Phase N 완료 보고

### 변경된 파일
- 생성: ...
- 수정: ...
- 삭제: ... (없어야 함)

### 테스트 결과
- unit: X/Y 통과
- e2e: X/Y 통과
- build: ✅ / ❌
- typecheck: ✅ / ❌

### 막힌 점 / 사용자 확인 필요
- ...

### 다음 Phase 준비 상태
- 종속 조건: ...
- 예상 작업: ...

Phase N+1 진행 승인 요청.
```

---

## 17. 전체 완료 정의

모든 Phase가 끝나면:

1. ✅ `feature/lens-integration` 브랜치 (v4 위 11개 기능 부활 + lens 어댑터 + Figma PDF + acDB 시드)
2. ✅ `main` 머지 가능 상태
3. ✅ 모든 테스트 통과 (vitest + playwright)
4. ✅ 픽셀 diff < 1% (cover, detail)
5. ✅ lens webhook 실제 호출 테스트 성공
6. ✅ README.md 업데이트:
   - lens 인터페이스 스펙 (QuoteInput/Output 원본)
   - 환경변수 목록 (기존 20 + 신규 5)
   - 마이그레이션 007~010 설명
   - acDB 시드 import 절차
   - PDF 검증 절차
   - Phase 1~10 체크리스트

---

## 18. 작업 시작 체크리스트

클로드 코드가 이 문서를 읽고 작업 시작 전 확인:

- [ ] **현재 작업 폴더가 `C:\Users\나\bsmg-v5` 인지 확인** (bsmg-v4-archive 아님)
- [ ] `git branch` 결과가 `* feature/lens-integration` 인지 확인
- [ ] `git remote -v`가 `hyuntarella/BSMG-V4` 저장소를 가리키는지 확인
- [ ] `BSMG_V4_ANALYSIS.md` 읽음 (bsmg-v5 내부에 있어야 함. 없으면 사용자가 배치)
- [ ] `brief-quote.md` 읽음
- [ ] `data/acdb-seed.json` 파일 존재 확인 (519개 entry)
- [ ] `bsmg-v4-archive\견적서.html` (v1 원본) 접근 가능 확인 (참조용)
- [ ] Figma MCP 연결 상태 확인 (없으면 사용자에게 알림)
- [ ] `npm run build` 성공 확인
- [ ] Phase 0부터 시작, 각 Phase 완료마다 사용자 승인 대기

준비 끝나면 Phase 0 시작.

---

**END OF SPEC**
