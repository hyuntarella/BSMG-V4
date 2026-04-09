/**
 * P값 시드 CSV → price_matrix_seed JSON 변환 스크립트
 *
 * 입력: data/p-value-seed.csv (477행)
 * 출력: supabase/price_matrix_pvalue_seed.json
 *
 * 실행: npx tsx scripts/convert-pvalue-to-seed.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// ── 1. canonical_name → item_index 매핑 ──

/** 복합 공종 11개 (COMPLEX_BASE 순서, 스카이차 제외) */
const COMPLEX_CANONICAL_MAP: Record<string, number> = {
  '바탕정리': 0,
  '바탕조정제부분미장': 1,
  '하도프라이머': 2,
  '복합시트': 3,
  '쪼인트실란트보강포부착': 4,
  '노출우레탄': 5,
  '벽체우레탄': 6,
  '우레탄상도': 7,
  '사다리차': 8,
  '폐기물처리': 9,
  '드라이비트절개': 10,
}

/** 우레탄 공종 10개 (URETHANE_BASE 순서, 스카이차 제외) */
const URETHANE_CANONICAL_MAP: Record<string, number> = {
  '바탕정리': 0,
  '바탕조정제부분미장': 1,
  '하도프라이머': 2,
  '노출우레탄1차': 3,
  '노출우레탄2차': 4,
  '벽체우레탄': 5,
  '우레탄상도': 6,
  '사다리차': 7,
  '폐기물처리': 8,
  '드라이비트절개': 9,
}

const COMPLEX_ITEM_COUNT = 11
const URETHANE_ITEM_COUNT = 10

// ── 2. area_bucket → area_range 매핑 ──

const AREA_MAP: Record<string, string> = {
  '50미만': '50평미만',
  '50~100': '50~100평',
  '100~200': '100~200평',
  '200이상': '200평이상',
}

// ── 3. CSV 파싱 (quoted fields + multiline 처리) ──

interface CsvRow {
  source_file: string
  area_bucket: string
  method: string
  overall_price_per_m2: number
  is_lump_template: boolean
  canonical_name: string
  mat_unit_price: number
  labor_unit_price: number
  exp_unit_price: number
}

function parseCsv(content: string): CsvRow[] {
  const rows: CsvRow[] = []
  const lines = content.split('\n')

  // 첫 줄은 헤더
  const header = parseQuotedLine(lines[0])
  const colIdx: Record<string, number> = {}
  header.forEach((h, i) => { colIdx[h.trim()] = i })

  let i = 1
  while (i < lines.length) {
    let line = lines[i]
    // quoted field가 닫히지 않았으면 다음 줄과 합침
    while (countQuotes(line) % 2 !== 0 && i + 1 < lines.length) {
      i++
      line += '\n' + lines[i]
    }
    i++

    if (line.trim() === '') continue

    const fields = parseQuotedLine(line)
    if (fields.length < 10) continue

    const priceMeta = parseFloat(fields[colIdx['overall_price_per_m2']] || '0')
    const isLump = (fields[colIdx['is_lump_template']] || '').trim() === 'True'

    // 사다리차 등: 단가=0이지만 금액>0인 경우 금액을 단가로 사용
    // (템플릿에서 "일 1건 × 경비 120,000원" 형태로 금액 직접 입력)
    let expUnit = parseFloat(fields[colIdx['exp_unit_price']] || '0')
    if (expUnit === 0) {
      const expAmt = parseFloat(fields[colIdx['exp_amount']] || '0')
      const qty = parseFloat(fields[colIdx['qty']] || '0')
      if (expAmt > 0 && qty > 0) {
        expUnit = expAmt / qty
      }
    }

    rows.push({
      source_file: fields[colIdx['source_file']] || '',
      area_bucket: (fields[colIdx['area_bucket']] || '').trim(),
      method: (fields[colIdx['method']] || '').trim(),
      overall_price_per_m2: priceMeta,
      is_lump_template: isLump,
      canonical_name: (fields[colIdx['canonical_name']] || '').trim(),
      mat_unit_price: parseFloat(fields[colIdx['mat_unit_price']] || '0'),
      labor_unit_price: parseFloat(fields[colIdx['labor_unit_price']] || '0'),
      exp_unit_price: expUnit,
    })
  }

  return rows
}

function countQuotes(s: string): number {
  let count = 0
  for (const c of s) if (c === '"') count++
  return count
}

function parseQuotedLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// ── 4. 변환 메인 ──

type SeedJson = Record<string, Record<string, Record<string, number[][]>>>

function convert(): void {
  const csvPath = resolve(__dirname, '..', 'data', 'p-value-seed.csv')
  const outPath = resolve(__dirname, '..', 'supabase', 'price_matrix_pvalue_seed.json')

  console.log('📖 CSV 읽기:', csvPath)
  const content = readFileSync(csvPath, 'utf-8')
  const allRows = parseCsv(content)
  console.log(`   전체 행: ${allRows.length}`)

  // lump template / price=0 필터
  const filtered = allRows.filter(r => !r.is_lump_template && r.overall_price_per_m2 > 0)
  console.log(`   필터 후: ${filtered.length} (lump ${allRows.length - filtered.length}건 제외)`)

  // 매핑 실패 추적
  const mappingFailures: string[] = []
  let mappedCount = 0

  // area_bucket 매핑 불가 추적
  const areaFailures = new Set<string>()

  // 결과 seed JSON
  const seed: SeedJson = {}

  // (area_range, method, price) 조합별로 그룹화
  const groups = new Map<string, CsvRow[]>()

  for (const row of filtered) {
    const areaRange = AREA_MAP[row.area_bucket]
    if (!areaRange) {
      areaFailures.add(row.area_bucket)
      continue
    }

    const key = `${areaRange}|${row.method}|${row.overall_price_per_m2}`
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }

  if (areaFailures.size > 0) {
    console.log(`⚠️  area_bucket 매핑 실패: ${[...areaFailures].join(', ')}`)
  }

  // 각 그룹을 seed 형식으로 변환
  for (const [key, rows] of groups) {
    const [areaRange, method, priceStr] = key.split('|')
    const price = String(Math.round(parseFloat(priceStr)))

    const canonMap = method === '복합' ? COMPLEX_CANONICAL_MAP : URETHANE_CANONICAL_MAP
    const itemCount = method === '복합' ? COMPLEX_ITEM_COUNT : URETHANE_ITEM_COUNT

    // item_index 배열 초기화 (전부 [0, 0, 0])
    const items: number[][] = Array.from({ length: itemCount }, () => [0, 0, 0])

    for (const row of rows) {
      const idx = canonMap[row.canonical_name]
      if (idx === undefined) {
        mappingFailures.push(`${row.canonical_name} (${method}/${areaRange}/${price})`)
        continue
      }
      items[idx] = [
        Math.round(row.mat_unit_price),
        Math.round(row.labor_unit_price),
        Math.round(row.exp_unit_price),
      ]
      mappedCount++
    }

    // seed JSON에 추가
    if (!seed[areaRange]) seed[areaRange] = {}
    if (!seed[areaRange][method]) seed[areaRange][method] = {}
    seed[areaRange][method][price] = items
  }

  // 매핑 실패율 체크
  const uniqueFailures = [...new Set(mappingFailures.map(f => f.split(' (')[0]))]
  const failureRate = mappingFailures.length / filtered.length
  if (failureRate > 0.05) {
    console.error(`❌ 매핑 실패율 ${(failureRate * 100).toFixed(1)}% > 5% — 즉시 중단`)
    console.error('   실패 canonical:', uniqueFailures)
    process.exit(1)
  }

  // 결과 저장
  writeFileSync(outPath, JSON.stringify(seed, null, 2), 'utf-8')

  // ── 5. 통계 보고 ──
  const comboCount = groups.size
  const areaRanges = [...new Set([...groups.keys()].map(k => k.split('|')[0]))]
  const methods = [...new Set([...groups.keys()].map(k => k.split('|')[1]))]

  console.log('\n📊 변환 통계:')
  console.log(`   입력 행 수: ${allRows.length}`)
  console.log(`   필터 후 행 수: ${filtered.length}`)
  console.log(`   매핑 성공: ${mappedCount}`)
  console.log(`   매핑 실패: ${mappingFailures.length}건`)
  if (uniqueFailures.length > 0) {
    console.log(`   실패 canonical: ${uniqueFailures.join(', ')}`)
  }
  console.log(`   (area_range × method × price) 조합 수: ${comboCount}`)
  console.log(`   면적대: ${areaRanges.join(', ')}`)
  console.log(`   공법: ${methods.join(', ')}`)

  // 조합별 상세
  console.log('\n📋 조합별 상세:')
  for (const area of areaRanges.sort()) {
    for (const method of methods.sort()) {
      const prices = [...groups.keys()]
        .filter(k => k.startsWith(`${area}|${method}|`))
        .map(k => parseInt(k.split('|')[2]))
        .sort((a, b) => a - b)
      if (prices.length > 0) {
        console.log(`   ${area} / ${method}: ${prices.length}단계 [${prices[0]}~${prices[prices.length - 1]}]`)
      }
    }
  }

  console.log(`\n✅ 출력: ${outPath}`)

  // 파일 크기
  const stat = readFileSync(outPath)
  console.log(`   파일 크기: ${(stat.length / 1024).toFixed(1)} KB`)
}

convert()
