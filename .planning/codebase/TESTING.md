# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- tsx (no formal test framework configured)
- Direct script execution: `npx tsx tests/buildItems.test.ts`
- No Jest/Vitest configuration in project

**Run Commands:**
```bash
npx tsx tests/buildItems.test.ts     # Run buildItems tests
npx tsx tests/costBreakdown.test.ts  # Run cost breakdown tests
```

**Current Test Files:**
- `tests/buildItems.test.ts` — Core calculation logic
- `tests/costBreakdown.test.ts` — Cost margin calculations

## Test File Organization

**Location:**
- `/tests/` directory at project root (not co-located with source)

**Naming:**
- Pattern: `{moduleName}.test.ts`
- Example: `buildItems.test.ts` for `lib/estimate/buildItems.ts`

**Structure:**
```
tests/
├── buildItems.test.ts
└── costBreakdown.test.ts
```

## Test Structure

**Suite Organization:**

Tests use custom assertion pattern (not Jest/Vitest) with explicit console output:

```typescript
// From buildItems.test.ts
let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${msg}`)
  } else {
    failed++
    console.log(`  ❌ ${msg}`)
  }
}

// ── Test Suite with emoji header ──
console.log('\n🧪 getAR (면적대 판별)')
assert(getAR(50) === '20평이하', '50m² (15평) → 20평이하')
assert(getAR(150) === '50평미만', '150m² (45평) → 50평미만')

// ── Test 2: getPD ──
console.log('\n🧪 getPD (P매트릭스 조회)')
const pd = getPD(priceMatrix, '50평미만', '복합', 38000)
assert(pd.length === 11, `50평미만/복합/38000 → ${pd.length}개 항목`)
```

**Patterns:**
- Setup: Load external data (price matrix from JSON seed file)
- Test groups: Grouped by function with emoji headers (`🧪`)
- Assertions: Custom `assert(condition, message)` function
- Console output: Human-readable pass/fail with checkmarks
- Final summary: Implied from pass/fail counters

## Fixtures and Data

**Test Data:**
- Price matrix loaded from `price_matrix_seed.json` at runtime
- Real P매트릭스 structure used (not mocked)
- Pattern:
```typescript
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { PriceMatrixRaw } from '../lib/estimate/types'

const matrixPath = resolve(__dirname, '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))
```

**Location:**
- Seed data at project root: `price_matrix_seed.json`
- Loaded once per test file
- Real data ensures calculations valid against actual pricing

## Test Coverage

**What IS Tested:**

1. **Area Range Classification (getAR)**
   - m² → area range mapping
   - Boundary conditions (20평이하, 50평미만, etc.)
   - Examples: `50m² → 20평이하`, `500m² → 100~200평`

2. **Price Matrix Lookup (getPD)**
   - Direct price lookup from matrix
   - Linear interpolation between prices
   - Out-of-range handling (clamping to nearest)
   - Example: `PDInterp = getPD(matrix, '50평미만', '복합', 38500)` (38000-39000 interpolation)

3. **Item Building (buildItems)** — Core test
   - Area + method + pricePerPyeong → EstimateItem[]
   - Options override (ladder days, waste days, sky, dryvit)
   - Calculation flow: buildItems → calc → rounddown to 10만원
   - Assertions on: item count, subtotal >0, rounding, specific item qty

4. **Cost Calculation (calc)**
   - Subtotal calculation
   - Overhead (3%) and profit (6%) application
   - Equipment items excluded from overhead/profit base
   - Rounding to 10만원 unit

**What is NOT Tested:**

- UI components (no Jest/React Testing Library)
- API routes (no HTTP mocking)
- Database operations (no Supabase mocking)
- Voice/TTS functionality
- Integration tests between modules
- Error edge cases (malformed input to functions)
- Performance/load tests

## Test Examples

**Example 1: Area Range Test**
```typescript
console.log('\n🧪 getAR (면적대 판별)')
assert(getAR(50) === '20평이하', '50m² (15평) → 20평이하')
assert(getAR(150) === '50평미만', '150m² (45평) → 50평미만')
assert(getAR(200) === '50~100평', '200m² (60평) → 50~100평')
assert(getAR(500) === '100~200평', '500m² (151평) → 100~200평 확인')
assert(getAR(1000) === '200평이상', '1000m² (302평) → 200평이상')
```

**Example 2: Price Matrix Interpolation**
```typescript
const pdInterp = getPD(priceMatrix, '50평미만', '복합', 38500)
assert(pdInterp.length === 11, '보간 결과도 11개')
```
- Tests that interpolation between 38000 and 39000 (implied) returns correct array length
- Uses real matrix data

**Example 3: buildItems Full Flow**
```typescript
const result = buildItems({
  method: '복합',
  m2: 150,
  pricePerPyeong: 35000,
  priceMatrix,
  options: {
    ladder: { days: 1 },
    waste: { days: 1 },
  },
})

console.log(`  공종 수: ${result.items.length}`)
console.log(`  소계: ${fm(result.calcResult.subtotal)}`)
console.log(`  합계: ${fm(result.calcResult.grandTotal)}`)

assert(result.items.length > 0, '공종이 1개 이상 생성됨')
assert(result.calcResult.subtotal > 0, '소계가 0보다 큼')
assert(result.calcResult.grandTotal % 100000 === 0, '10만원 단위 절사')
assert(result.calcResult.grandTotal <= result.calcResult.totalBeforeRound, '절사 후 ≤ 절사 전')

// Specific item checks
const batang = result.items.find(i => i.name === '바탕정리')
assert(batang !== undefined, '바탕정리 공종 존재')
assert(batang!.qty === 150, `바탕정리 qty = ${batang!.qty} (150이어야 함)`)

const ladder = result.items.find(i => i.name === '사다리차')
assert(ladder !== undefined, '사다리차 공종 존재')
assert(ladder!.qty === 1, `사다리차 qty = ${ladder!.qty} (1이어야 함)`)
```

- Tests multiple concerns in one scenario
- Console output shows actual values (공종 수, 소계, 합계)
- Specific item assertions (바탕정리, 사다리차)
- Equipment filtering (스카이차 제외 when not in options)

## Mocking Strategy

**Current Approach:**
- NO mocking — all tests use real/seed data
- Price matrix loaded from JSON file (not mocked)
- Pure functions called directly without stubs

**Why No Mocks:**
- Core functions are pure (no side effects)
- External dependency (price matrix) is deterministic
- Tests verify real data flow

**If Needed (Future):**
- Mock `fetch()` for API tests using `jest-fetch-mock` or similar
- Mock Supabase client for integration tests
- Mock `fs.readFileSync` if testing seed data validation

## Adding New Tests

**Checklist:**
1. Create `tests/{moduleName}.test.ts`
2. Import functions and types: `import { functionName } from '../lib/path/module'`
3. Load fixtures if needed: `const matrix = JSON.parse(readFileSync(...))`
4. Define assertion counter:
```typescript
let passed = 0, failed = 0
function assert(condition: boolean, msg: string) { ... }
```
5. Group tests with emoji header: `console.log('\n🧪 Feature Name')`
6. Write assertions: `assert(result === expected, 'description')`
7. Run: `npx tsx tests/myModule.test.ts`

**Example Structure:**
```typescript
import { testFunction } from '../lib/path/testFunction'

let passed = 0, failed = 0
function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`) }
  else { failed++; console.log(`  ❌ ${msg}`) }
}

console.log('\n🧪 testFunction (description)')
const result = testFunction(input)
assert(result === expected, 'description of what was tested')

console.log(`\n✨ ${passed} passed, ${failed} failed`)
```

## Known Gaps

**Not Covered by Tests:**
- `applyOverrides.ts` — No test file (should add)
- `calc.ts` — Partially tested through buildItems
- `voiceFlow.ts` — No test (voice/TTS/STT logic)
- `commands.ts` — No test (voice command parsing and application)
- `EstimateEditor` component — No unit tests
- `useEstimate` hook — No test
- API routes (`/api/stt`, `/api/llm`, `/api/tts`) — No test

**Improvement Opportunities:**
1. Add unit tests for `applyOverrides` (options → item quantity/price changes)
2. Add test for `confidenceRouter` (confidence threshold logic)
3. Add integration test for voice flow (STT → LLM → command execution)
4. Add component snapshot tests for UI stability
5. Mock Supabase and test CRUD operations

## Running Tests

**Current:**
```bash
# Terminal, project root
npx tsx tests/buildItems.test.ts
npx tsx tests/costBreakdown.test.ts
```

**Output Format:**
```
🧪 getAR (면적대 판별)
  ✅ 50m² (15평) → 20평이하
  ✅ 150m² (45평) → 50평미만
  ❌ Some assertion failed

✨ N passed, M failed
```

**Debugging:**
- Add `console.log()` in test to inspect values
- All test data printed (not hidden)
- Check actual vs expected in assertion messages

---

*Testing analysis: 2026-03-30*
