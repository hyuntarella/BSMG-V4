/**
 * buildItems 테스트
 * 실행: npx tsx tests/buildItems.test.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { buildItems } from '../lib/estimate/buildItems'
import { calc } from '../lib/estimate/calc'
import { getAR } from '../lib/estimate/areaRange'
import { getPD } from '../lib/estimate/priceData'
import { getMargin } from '../lib/estimate/margin'
import { fm } from '../lib/utils/format'
import { n2k } from '../lib/utils/numberToKorean'
import type { PriceMatrixRaw } from '../lib/estimate/types'

const matrixPath = resolve(__dirname, '..', 'price_matrix_seed.json')
const priceMatrix: PriceMatrixRaw = JSON.parse(readFileSync(matrixPath, 'utf-8'))

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

// ── Test 1: getAR ──
console.log('\n🧪 getAR (면적대 판별)')
assert(getAR(50) === '20평이하', '50m² (15평) → 20평이하')
assert(getAR(150) === '50평미만', '150m² (45평) → 50평미만')
assert(getAR(200) === '50~100평', '200m² (60평) → 50~100평')
assert(getAR(500) === '100~200평', '500m² (151평) → 100~200평 확인')
// 500m² = 151평 → 100~200평
const ar500 = getAR(500)
assert(ar500 === '100~200평', `500m² (151평) → ${ar500}`)
assert(getAR(1000) === '200평이상', '1000m² (302평) → 200평이상')

// ── Test 2: getPD ──
console.log('\n🧪 getPD (P매트릭스 조회)')
const pd = getPD(priceMatrix, '50평미만', '복합', 38000)
assert(pd.length === 11, `50평미만/복합/38000 → ${pd.length}개 항목`)
assert(pd[0][0] === 300 && pd[0][1] === 700, `바탕정리 mat=300, labor=700`)

// 보간 테스트: 38500 (38000~39000 사이)
const pdInterp = getPD(priceMatrix, '50평미만', '복합', 38500)
assert(pdInterp.length === 11, '보간 결과도 11개')

// ── Test 3: buildItems (핵심 테스트) ──
console.log('\n🧪 buildItems (면적 150m², 복합, 평단가 35000)')

// 150m² = 45.4평 → 50평미만
// 50평미만/복합에서 가장 낮은 평단가가 38000이므로
// 35000은 범위 밖 → 가장 가까운 38000 사용
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
console.log(`  공과잡비: ${fm(result.calcResult.overhead)}`)
console.log(`  기업이윤: ${fm(result.calcResult.profit)}`)
console.log(`  절사 전: ${fm(result.calcResult.totalBeforeRound)}`)
console.log(`  합계: ${fm(result.calcResult.grandTotal)}`)

assert(result.items.length > 0, '공종이 1개 이상 생성됨')
assert(result.calcResult.subtotal > 0, '소계가 0보다 큼')
assert(result.calcResult.grandTotal % 100000 === 0, '10만원 단위 절사')
assert(result.calcResult.grandTotal <= result.calcResult.totalBeforeRound, '절사 후 ≤ 절사 전')

// 기본 공종(바탕정리) qty = m2
const batang = result.items.find(i => i.name === '바탕정리')
assert(batang !== undefined, '바탕정리 공종 존재')
assert(batang!.qty === 150, `바탕정리 qty = ${batang!.qty} (150이어야 함)`)

// 사다리차 qty = 1
const ladder = result.items.find(i => i.name === '사다리차')
assert(ladder !== undefined, '사다리차 공종 존재')
assert(ladder!.qty === 1, `사다리차 qty = ${ladder!.qty} (1이어야 함)`)

// 스카이차는 옵션 없으므로 제외되어야 함
const sky = result.items.find(i => i.name === '스카이차')
assert(sky === undefined, '스카이차 옵션 없으면 제외')

// ── Test 4: buildItems (우레탄) ──
console.log('\n🧪 buildItems (면적 300m², 우레탄, 평단가 32000)')
const resultU = buildItems({
  method: '우레탄',
  m2: 300,
  pricePerPyeong: 32000,
  priceMatrix,
  options: {
    ladder: { days: 2 },
    sky: { days: 1, unitPrice: 400000 },
    waste: { days: 2 },
  },
})

console.log(`  공종 수: ${resultU.items.length}`)
console.log(`  합계: ${fm(resultU.calcResult.grandTotal)}`)

assert(resultU.items.length > 0, '우레탄 공종 생성됨')
assert(resultU.calcResult.grandTotal > 0, '우레탄 합계 > 0')

const skyU = resultU.items.find(i => i.name === '스카이차')
assert(skyU !== undefined, '스카이차 옵션 있으면 포함')
assert(skyU!.qty === 1, `스카이차 qty = ${skyU!.qty}`)
assert(skyU!.labor === 400000, `스카이차 unitPrice 오버라이드 = ${skyU!.labor}`)

// ── Test 5: margin ──
console.log('\n🧪 getMargin')
const margin = getMargin('복합', 150, result.calcResult.grandTotal)
console.log(`  마진율: ${margin.toFixed(1)}%`)
assert(margin > 0 && margin < 100, `마진율 범위 정상: ${margin.toFixed(1)}%`)

// ── Test 6: n2k ──
console.log('\n🧪 n2k (숫자→한국어)')
assert(n2k(3900000) === '삼백구십만', `3900000 → ${n2k(3900000)}`)
assert(n2k(0) === '영', `0 → ${n2k(0)}`)
assert(n2k(12345) === '일만이천삼백사십오', `12345 → ${n2k(12345)}`)

// ── Test 7: fm ──
console.log('\n🧪 fm (천단위 콤마)')
assert(fm(3900000) === '3,900,000', `3900000 → ${fm(3900000)}`)

// ── 결과 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`결과: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
