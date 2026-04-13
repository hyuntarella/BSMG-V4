/**
 * c8 런타임 검증 — 엑셀 샘플 3종 생성
 *
 * 페이즈 4.5 작업 2 (엑셀 서식 복구) 효과 확인용.
 * generateMethodWorkbook 으로 3가지 케이스 xlsx 생성 → samples/ 에 저장.
 * PM 이 엑셀에서 열어 PM 스크린샷 이슈 6건 해결 확인.
 *
 * 실행: npx tsx scripts/gen-excel-samples.ts
 *
 * 생성 파일:
 *   samples/sample-basic.xlsx       — 기본공종만 (8행)
 *   samples/sample-extras.xlsx      — 기본 + 추가공종 3개 (11행, 템플릿 정확 매칭)
 *   samples/sample-fewrows.xlsx     — 기본공종 3개만 (8행 중 5행 삭제 케이스)
 */
import fs from 'fs'
import path from 'path'
import { generateMethodWorkbook } from '../lib/excel/generateMethodWorkbook'
import type { Estimate, EstimateItem, EstimateSheet } from '../lib/estimate/types'

const OUT_DIR = path.join(process.cwd(), 'samples')

function mkItem(overrides: Partial<EstimateItem>): EstimateItem {
  return {
    sort_order: 1,
    name: '기본 공종',
    spec: '3.8mm',
    unit: 'm²',
    qty: 100,
    mat: 15000,
    labor: 8000,
    exp: 2000,
    mat_amount: 0,
    labor_amount: 0,
    exp_amount: 0,
    total: 0,
    is_base: true,
    is_equipment: false,
    is_fixed_qty: false,
    ...overrides,
  }
}

function buildBasicItems(): EstimateItem[] {
  const names = [
    '프라이머 도포',
    '이중복합시트 3.8mm',
    '줄눈·크랙 실란트 보강포', // 2줄 케이스 — 이슈 #2
    '중도 1mm(2회)',             // 2줄 케이스
    '상도 우레탄 노출마감',
    '벽체 우레탄',
    '우레탄 상도',
    '바탕조정제',
  ]
  return names.map((name, i) =>
    mkItem({ sort_order: i + 1, name, qty: 100 + i * 5, mat: 12000 + i * 500 }),
  )
}

function buildSheet(type: '복합' | '우레탄', items: EstimateItem[]): EstimateSheet {
  return {
    type,
    title: type === '복합' ? '이중복합방수 3.8mm' : '우레탄방수 3mm',
    price_per_pyeong: 32000,
    warranty_years: 5,
    warranty_bond: 3,
    grand_total: 0,
    sort_order: 1,
    items,
  }
}

function buildEstimate(sheet: EstimateSheet): Estimate {
  return {
    status: 'draft',
    mgmt_no: 'B-2026-0413-SAMPLE',
    date: '2026-04-13',
    customer_name: '방수명가 샘플 고객',
    site_name: '테스트 현장 아파트 옥상 방수공사',
    m2: 330,
    wall_m2: 60,
    manager_name: '홍길동',
    manager_phone: '010-1234-5678',
    memo: '2026년 봄 방수공사 샘플 메모',
    sheets: [sheet],
  }
}

async function writeSample(name: string, estimate: Estimate) {
  const buf = await generateMethodWorkbook(estimate, estimate.sheets[0].type)
  const outPath = path.join(OUT_DIR, name)
  fs.writeFileSync(outPath, buf)
  console.log(`✓ ${name} (${buf.length.toLocaleString()} bytes)`)
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  // 1) 기본공종 8행만 — 템플릿 11행 기준 3행 삭제 케이스
  const basic = buildBasicItems()
  await writeSample('sample-1-basic-8rows.xlsx', buildEstimate(buildSheet('복합', basic)))

  // 2) 기본 + 추가공종 3개 = 11행 — 템플릿 정확 매칭 (삽입·삭제 없음)
  const extras: EstimateItem[] = [
    ...basic,
    mkItem({ sort_order: 9, name: '사다리차', unit: '일', qty: 2, mat: 0, labor: 0, exp: 120000, is_base: false, is_equipment: true, is_fixed_qty: true }),
    mkItem({ sort_order: 10, name: '폐기물처리비', unit: '식', qty: 1, mat: 0, labor: 0, exp: 200000, is_base: false, is_equipment: true, is_fixed_qty: true }),
    mkItem({ sort_order: 11, name: '드라이비트 하부절개(2층 외벽)', unit: '식', qty: 1, mat: 0, labor: 0, exp: 0, is_base: false }),
  ]
  await writeSample('sample-2-extras-11rows.xlsx', buildEstimate(buildSheet('복합', extras)))

  // 3) 기본 3행만 — 템플릿 11행 중 8행 삭제 케이스 (가장 많은 빈 행)
  const few = basic.slice(0, 3)
  await writeSample('sample-3-fewrows-3rows.xlsx', buildEstimate(buildSheet('우레탄', few)))

  console.log(`\n완료: ${OUT_DIR} 에 3개 xlsx 생성됨.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
