# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `EstimateEditor.tsx`, `VoiceBar.tsx`)
- Utilities/libraries: camelCase (e.g., `buildItems.ts`, `priceData.ts`)
- Types: PascalCase with `.ts` extension (e.g., `types.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useEstimate.ts`, `useVoice.ts`)
- API routes: kebab-case or descriptive (e.g., `/api/stt/route.ts`, `/api/llm/route.ts`)

**Functions:**
- camelCase for all functions: `getPD()`, `buildItems()`, `calc()`, `getMargin()`
- Prefix with action verb: `get*`, `build*`, `apply*`, `update*`, `handle*`
- Single responsibility — function names describe one action

**Variables:**
- camelCase for local variables: `priceMatrix`, `estimateContext`, `clarificationCount`
- CONST_ALL_CAPS for module-level constants: `OVERHEAD_RATE`, `PROFIT_RATE`, `ROUND_UNIT`, `DEFAULT_EQUIPMENT_PRICES`
- `Ref` suffix for refs: `mediaRecorderRef`, `callbacksRef`, `timerRef`, `chunksRef`
- `Id` suffix for identifiers: `company_id`, `estimate_id`, `sheet_id`

**Types:**
- PascalCase for interfaces and types: `EstimateItem`, `EstimateSheet`, `VoiceCommand`, `CalcResult`
- Descriptive names matching domain: `PriceMatrixRaw`, `BuildItemsInput`, `ConfidenceResult`, `VoiceStatus`
- Union types for status: `type VoiceStatus = 'idle' | 'recording' | 'processing' | 'speaking'`
- Database row types suffix with `Row`: `PriceMatrixRow`, `PresetRow`

## Code Style

**Formatting:**
- Prettier (via Next.js default, though not explicitly configured)
- 2-space indentation
- Single quotes for strings: `'복합'`, `'견적서'`
- Semicolons required
- Max line length ~100-120 characters

**Linting:**
- Next.js default ESLint rules (no explicit `.eslintrc` file)
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- `jsx: "preserve"` in tsconfig for Next.js App Router compatibility

**Comments Style:**
- JSDoc for public functions and complex logic
- Single-line comments for inline explanations: `// ──`와 `// 내용`
- Divider comments: `// ── Section Name ──` for major logical blocks
- No commented-out code — remove or use git history

## Import Organization

**Order:**
1. External dependencies (React, Next.js): `import { useState } from 'react'`
2. Absolute path aliases (@/*): `import { buildItems } from '@/lib/estimate/buildItems'`
3. Type imports: `import type { Estimate } from '@/lib/estimate/types'`
4. Local relative imports (rare): Avoid in favor of absolute paths

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json`)
- Always use absolute paths: `@/lib/`, `@/components/`, `@/hooks/`
- Never use relative `../` paths

**Pattern Example:**
```typescript
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Estimate, EstimateSheet } from '@/lib/estimate/types'
import { buildItems } from '@/lib/estimate/buildItems'
import { calc } from '@/lib/estimate/calc'
import EstimateEditor from '@/components/estimate/EstimateEditor'
```

## Error Handling

**API Routes:**
- Return `NextResponse.json({ error: string }, { status: number })`
- Error messages include context: `{ error: 'STT 실패: ${err}' }`
- Check required fields first: `if (!audio) return NextResponse.json({ error: ... }, { status: 400 })`
- Try/catch for external API calls with informative messages

**Hooks (Client Components):**
- Use callbacks with proper error handling: `try/catch` + `finally`
- Callbacks set error state or log to console
- State updated in `finally` to unlock UI (e.g., `setSaving(false)`)

**Library Functions:**
- No try/catch in calculation/transformation functions (let caller handle)
- Validation at function entry: `if (!methodData || Object.keys(methodData).length === 0) { console.warn(...) }`
- Return sensible defaults for missing data: `Array.from({ length: 11 }, (): UnitCost => [0, 0, 0])`

**Example Pattern (from `useEstimate`):**
```typescript
const handleSave = useCallback(async () => {
  if (!estimate.id || saving) return
  setSaving(true)
  try {
    const res = await fetch(`/api/estimates/${estimate.id}/generate`, { method: 'POST' })
    const data = await res.json()
    const msg = data.success ? `저장 완료. 관리번호 ${estimate.mgmt_no ?? ''}.` : '저장 실패.'
    addLog('assistant', msg)
    voice.playTts(msg)
  } catch {
    addLog('assistant', '저장 오류')
  } finally {
    setSaving(false)
  }
}, [estimate.id, estimate.mgmt_no, saving, addLog])
```

## Logging

**Framework:** Console (no external logging library)

**Patterns:**
- Development: `console.log()`, `console.warn()`
- API errors: Include context in error message
- Calculation warnings: Log to console with `console.warn()` when P매트릭스 data missing
- No logging in production-critical paths (calculation functions)

**Example:**
```typescript
console.warn(`P매트릭스에 ${areaRange}/${method} 데이터 없음 — 기본값 사용`)
```

## Comments

**When to Comment:**
- Complex algorithm logic (e.g., interpolation in `getPD`)
- Non-obvious design decisions (e.g., why equipment items excluded from overhead calculation)
- v1 legacy code references: "v1 원본(파일명:라인) 로직을 TypeScript로 이식"
- Business logic context (e.g., "면적대 경계값 (평 기준)")

**JSDoc/TSDoc:**
- Used for public functions with complex signatures
- Include parameter types and return description
- Example (from `buildItems.ts`):
```typescript
/**
 * 핵심 함수: 면적·공법·평단가 → 견적서 공종 배열 + 계산 결과
 *
 * v1 L392-534 로직을 TypeScript로 이식
 *
 * 1. 면적대(getAR) → P매트릭스에서 단가 배열 조회(getPD)
 * 2. BASE 배열과 단가 배열을 결합 → EstimateItem[] 생성
 * ...
 */
export function buildItems(input: BuildItemsInput): {
  items: EstimateItem[]
  calcResult: CalcResult
}
```

## Function Design

**Size:**
- Prefer <50 lines per function
- Complex operations (buildItems, applyCommands) 50-120 lines acceptable
- Split long functions into sub-functions with descriptive names

**Parameters:**
- Prefer objects over multiple primitives: `BuildItemsInput` instead of 6 individual params
- Use `Partial<T>` for optional configs: `options?: { leak?: boolean, rooftop?: boolean }`
- Type all parameters explicitly (strict TypeScript)

**Return Values:**
- Return objects with clear structure: `{ items: EstimateItem[], calcResult: CalcResult }`
- Don't return nullable values from core functions — return empty array or default object
- Use unions for conditional returns: `ConfidenceResult` with `level: 'high' | 'medium' | 'low'`

**Example Pattern (Good):**
```typescript
export function getPD(
  matrix: PriceMatrixRaw,
  areaRange: string,
  method: Method,
  pricePerPyeong: number
): UnitCost[] {
  // Validation
  const methodData = matrix[areaRange]?.[method]
  if (!methodData || Object.keys(methodData).length === 0) {
    console.warn(`P매트릭스에 ${areaRange}/${method} 데이터 없음 — 기본값 사용`)
    return Array.from({ length: 11 }, (): UnitCost => [0, 0, 0])
  }

  // Main logic
  const prices = Object.keys(methodData).map(Number).sort((a, b) => a - b)

  // ... implementation

  return result
}
```

## Module Design

**Exports:**
- Named exports for reusable functions: `export function calc()`, `export function buildItems()`
- Default export for React components: `export default function EstimateEditor()`
- Type exports with `export type`: `export type VoiceStatus = 'idle' | ...`
- Group related functions in same file (e.g., `commands.ts` has `applyCommand`, `applyCommands`)

**Barrel Files:**
- Not used in this codebase — import directly from source files
- Example: `import { buildItems } from '@/lib/estimate/buildItems'` (not from index.ts)

**File Organization by Layer:**
- `lib/estimate/*`: Calculation/transformation functions (pure, no side effects)
- `lib/voice/*`: Voice processing (STT parsing, command routing, prompts)
- `lib/utils/*`: Format utilities (numbers, lerp, Korean conversion)
- `lib/supabase/*`: Database client initialization
- `lib/excel/*`, `lib/pdf/*`: File generation
- `hooks/`: React state management hooks
- `components/`: React UI components
- `app/api/`: Next.js API routes
- `app/(authenticated)/`: Protected pages (app router groups)

## React-Specific Conventions

**Hooks Usage:**
- `useCallback` for event handlers and memoized functions
- `useRef` for refs explicitly documented: `const timerRef = useRef<ReturnType<typeof setInterval>>`
- Dependencies array carefully managed — use ESLint rule `exhaustive-deps` (comment when intentional)
- Example comment: `// eslint-disable-next-line react-hooks/exhaustive-deps` when needed

**Component Props:**
- Define interface: `interface EstimateEditorProps { initialEstimate: Estimate; priceMatrix: PriceMatrixRaw }`
- Use destructuring in function params: `export default function ({ estimate, isDirty }: Props)`
- No boolean trap parameters — use object: `{ enabled: boolean }` over `(enabled: boolean)`

**State Management:**
- useState for component-level state
- Multiple useState calls for independent values (not single object)
- Example from `EstimateEditor.tsx`:
```typescript
const [activeTab, setActiveTab] = useState<TabId>('complex-cover')
const [saving, setSaving] = useState(false)
const [emailOpen, setEmailOpen] = useState(false)
```

## TypeScript Conventions

**strict Mode:**
- All code written with `"strict": true`
- No `any` types — use `unknown` with type narrowing if necessary
- Type all function parameters and returns
- Use `satisfies` operator for type inference

**Utility Types:**
- `Partial<T>`: Optional configurations
- `Record<K, V>`: Maps (e.g., `CostTable = Record<string, number>`)
- `Omit<T, K>`: Exclude certain fields
- Type unions instead of optional: `'복합' | '우레탄'` over `Method | null`

**Enum Alternative:**
- Use literal union types instead of enums
- Example: `type TabId = 'complex-cover' | 'complex-detail' | 'urethane-cover' | 'urethane-detail' | 'compare'`
- Reason: Better for JSON serialization and tree-shaking

---

*Convention analysis: 2026-03-30*
