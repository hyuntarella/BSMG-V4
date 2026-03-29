/**
 * costBreakdown 테스트
 * 실행: npx tsx tests/costBreakdown.test.ts
 */

import {
  getCostBreakdown,
  getAdjustedCost,
  getMarginDisplay,
  findPriceForMargin,
  pricePerM2ToPyeong,
} from '../lib/estimate/costBreakdown'
import { LABOR_COST_PER_PUM } from '../lib/estimate/constants'

let passed = 0
let failed = 0

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── getCostBreakdown ──
console.log('\n📦 getCostBreakdown')

const c30 = getCostBreakdown(30)
assert('30평 하도 = 80000', c30.hado === 80000, `got ${c30.hado}`)
assert('30평 중도 = 500000', c30.jungdo15 === 500000, `got ${c30.jungdo15}`)
assert('30평 상도 = 120000', c30.sangdo === 120000, `got ${c30.sangdo}`)
assert('30평 시트 = 620000', c30.sheet === 620000, `got ${c30.sheet}`)
assert('30평 경비 = 350000', c30.misc === 350000, `got ${c30.misc}`)
assert('30평 품수 = 6', c30.pum === 6, `got ${c30.pum}`)
assert('30평 인건비 = 6×220000', c30.labor === 6 * LABOR_COST_PER_PUM, `got ${c30.labor}`)

const materialTotal30 = 80000 + 500000 + 120000 + 620000
assert('30평 재료비소계', c30.materialTotal === materialTotal30, `got ${c30.materialTotal}`)
assert('30평 총원가', c30.total === materialTotal30 + c30.labor + 350000, `got ${c30.total}`)

const c50 = getCostBreakdown(50)
assert('50평 하도 = 170000', c50.hado === 170000, `got ${c50.hado}`)
assert('50평 품수 = 7', c50.pum === 7, `got ${c50.pum}`)

const c100 = getCostBreakdown(100)
assert('100평 하도 = 320000', c100.hado === 320000, `got ${c100.hado}`)
assert('100평 중도 = 1500000', c100.jungdo15 === 1500000, `got ${c100.jungdo15}`)

// 보간 테스트
const c40 = getCostBreakdown(40)
assert('40평 하도 보간 = 125000', c40.hado === 125000, `got ${c40.hado}`)
assert('40평 중도 보간 = 650000', c40.jungdo15 === 650000, `got ${c40.jungdo15}`)

// 경계값
const c20 = getCostBreakdown(20)
assert('20평 → 30평 값', c20.hado === 80000, `got ${c20.hado}`)
const c150 = getCostBreakdown(150)
assert('150평 → 100평 값', c150.hado === 320000, `got ${c150.hado}`)

// ── getAdjustedCost ──
console.log('\n📦 getAdjustedCost')

const adj30 = getAdjustedCost(30)
assert('30평 인상후 하도 = 96000', adj30.hado === Math.round(80000 * 1.2), `got ${adj30.hado}`)
assert('30평 인상후 중도 = 600000', adj30.jungdo15 === Math.round(500000 * 1.2), `got ${adj30.jungdo15}`)
assert('인건비 변화 없음', adj30.labor === c30.labor, `got ${adj30.labor}`)
assert('경비 변화 없음', adj30.misc === c30.misc, `got ${adj30.misc}`)
assert('총원가 증가', adj30.total > c30.total, `adj=${adj30.total}, base=${c30.total}`)

// ── getMarginDisplay ──
console.log('\n📦 getMarginDisplay')

const margin = getMarginDisplay(50000, 50)
assert('마진 포맷 정상', /\d+% \(인상 전 \d+%\)/.test(margin.formatted), `got "${margin.formatted}"`)
assert('인상전 마진 ≥ 현 마진', margin.beforeIncrease >= margin.current)

// ── findPriceForMargin ──
console.log('\n📦 findPriceForMargin')

const price50 = findPriceForMargin(50, 50)
assert('마진50% 평단가 > 0', price50 > 0, `got ${price50}`)
assert('1000원 단위', price50 % 1000 === 0, `got ${price50}`)

const verify50 = getMarginDisplay(price50, 50)
assert('역산 후 마진 ≥ 50%', verify50.current >= 50, `got ${verify50.current}%`)
console.log(`  ℹ️  50평 마진50% → 평단가 ${price50}원/㎡, 실제 마진 ${verify50.formatted}`)

const price30 = findPriceForMargin(30, 100)
assert('마진30% 평단가 > 0', price30 > 0, `got ${price30}`)
const verify30 = getMarginDisplay(price30, 100)
assert('역산 후 마진 ≥ 30%', verify30.current >= 30, `got ${verify30.current}%`)

const priceImpossible = findPriceForMargin(100, 50)
assert('마진100% → 0', priceImpossible === 0)

// ── pricePerM2ToPyeong ──
console.log('\n📦 pricePerM2ToPyeong')

const ppyeong = pricePerM2ToPyeong(30000, 165.3)
assert('㎡→평 단가 > 0', ppyeong > 0, `got ${ppyeong}`)
const expectedPP = Math.round((30000 * 165.3) / (165.3 / 3.306))
assert('계산 정확', ppyeong === expectedPP, `got ${ppyeong}, expected ${expectedPP}`)

// ── 결과 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`총 ${passed + failed}건: ✅ ${passed} / ❌ ${failed}`)
if (failed > 0) process.exit(1)
