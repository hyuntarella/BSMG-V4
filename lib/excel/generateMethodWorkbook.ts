/**
 * Phase 3-A — 공법별 단일 XLSX 생성 (엑셀 주입 엔진)
 *
 * 템플릿 기반: templates/complex.xlsx 또는 templates/urethane.xlsx
 * 견적 데이터를 주입하여 단일 공법 XLSX를 반환한다.
 *
 * Sheet1 (갑지): 관리번호·견적일·고객명·공사명·현장주소·금액·특기사항
 * Sheet2 (을지): 공종 행 + 소계/공과잡비/기업이윤/계/합계
 *
 * 동적 행 처리:
 *   - 유효 아이템 < 템플릿 행 → 남는 행 삭제 (spliceRows)
 *   - 유효 아이템 > 템플릿 행 → 행 삽입 (spliceRows)
 *   - 소계·합계 수식을 동적 범위로 재설정
 *
 * 수식 보존: 금액 열(G/I/K/L/M)은 수식으로 유지.
 *   앱이 계산값을 직접 쓰지 않는다 (Excel이 계산).
 */
import ExcelJS from 'exceljs'
import path from 'path'
import type { Estimate, EstimateSheet, EstimateItem, Method } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'
import { toKoreanAmount } from '@/lib/utils/numberToKorean'

// ── 상수 ──
const ITEM_START_ROW = 7
const TEMPLATE_ZONE_SIZE = 11 // 복합·우레탄 공통: rows 7-17
const SUMMARY_START_ROW = 18  // 소계 행 (템플릿 기본)

// 행 높이: 품명에 \n 포함 또는 15자 이상이면 2줄 행 높이 적용
const ROW_HEIGHT_SINGLE = 20
const ROW_HEIGHT_DOUBLE = 36
const ROW_HEIGHT_TRIPLE = 52
const NAME_LENGTH_2LINE = 15
const NAME_LENGTH_3LINE = 30

/** 품명 길이/줄바꿈 기반 행 높이 계산 */
function computeRowHeight(name: string): number {
  const newlineCount = (name.match(/\n/g) || []).length
  if (newlineCount >= 2 || name.length >= NAME_LENGTH_3LINE) return ROW_HEIGHT_TRIPLE
  if (newlineCount >= 1 || name.length >= NAME_LENGTH_2LINE) return ROW_HEIGHT_DOUBLE
  return ROW_HEIGHT_SINGLE
}

function getTemplatePath(method: Method): string {
  const file = method === '우레탄' ? 'urethane.xlsx' : 'complex.xlsx'
  return path.join(process.cwd(), 'templates', file)
}

/**
 * 공법별 단일 XLSX Buffer 생성
 *
 * @param estimate - 견적서 전체 데이터
 * @param method   - '복합' | '우레탄'
 * @returns XLSX Buffer
 */
export async function generateMethodWorkbook(
  estimate: Estimate,
  method: Method,
): Promise<Buffer> {
  const sheet = estimate.sheets.find(s => s.type === method)
  if (!sheet) {
    throw new Error(`시트 타입 '${method}'을 찾을 수 없습니다`)
  }

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(getTemplatePath(method))

  // 필터: is_hidden인 항목만 제외. is_locked는 단가 잠금이지 출력 제외 아님.
  const items = sheet.items.filter(it => !it.is_hidden)

  // Sheet1 (갑지) 주입
  const coverWs = wb.getWorksheet(1)
  if (coverWs) {
    fillCover(coverWs, estimate, sheet, items)
    enforceLandscape(coverWs)
  }

  // Sheet2 (을지) 주입
  const detailWs = wb.getWorksheet(2)
  if (detailWs) {
    fillDetail(detailWs, estimate, sheet, items)
    enforceLandscape(detailWs)
  }

  // Config 시트 제거
  const configSheet = wb.getWorksheet('Config')
  if (configSheet) wb.removeWorksheet(configSheet.id)

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * 이슈 작업 3 — PDF 가로 변환 보장.
 *
 * exceljs 의 readFile/writeBuffer 가 템플릿의 pageSetup.orientation 을
 * 유실하는 경우가 있어 명시 재설정.
 *
 * Google Drive API 의 xlsx → Google Sheets → PDF 경로에서
 * pageSetup.orientation='landscape' 를 존중하므로 xlsx 레벨에서 강제.
 *
 * paperSize 9 = A4. fitToPage 로 한 페이지에 가로로 맞춤.
 */
function enforceLandscape(ws: ExcelJS.Worksheet): void {
  ws.pageSetup = {
    ...(ws.pageSetup ?? {}),
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    verticalCentered: false,
  }
}

// ── Sheet1 (갑지) ──

function fillCover(
  ws: ExcelJS.Worksheet,
  estimate: Estimate,
  sheet: EstimateSheet,
  items: EstimateItem[],
): void {
  // ── 이슈 #5: 좌측 정렬 유실 방지 ──
  // 값 주입 전 기존 수식/alignment 리셋 후 좌측 정렬 명시.
  // ── 이슈 #1: META 라벨 침범 방지 ──
  // shrinkToFit 으로 긴 값이 옆 셀 침범하지 않도록 수축.
  const metaAlign: Partial<ExcelJS.Alignment> = {
    horizontal: 'left',
    vertical: 'middle',
    shrinkToFit: true,
    wrapText: false,
  }

  const setCell = (row: number, col: number, value: ExcelJS.CellValue) => {
    const cell = ws.getCell(row, col)
    cell.value = null // 기존 수식/값 제거 (NUMBERSTRING 등 잔존 수식 제거)
    cell.value = value
    cell.alignment = { ...cell.alignment, ...metaAlign }
  }

  // D6: 관리번호
  setCell(6, 4, estimate.mgmt_no ?? '')

  // D7: 견적일
  setCell(7, 4, estimate.date ?? '')

  // D8: 고객명 귀하
  setCell(8, 4, estimate.customer_name ? `${estimate.customer_name} 귀하` : '귀하')

  // D9: 공사명
  setCell(9, 4, estimate.site_name ?? '방수공사')

  // J9: 현장주소
  setCell(9, 10, estimate.site_name ?? '')

  // ── 금액 (수식이 Node에서 평가 안 되므로 직접 값) ──
  const cr = calc(items)

  // ── 이슈 #6: 한글금액 #NAME? 에러 방지 ──
  // 템플릿 E11 의 NUMBERSTRING 수식을 완전히 제거 후 값 주입.
  // 주변 셀 병합 범위에도 수식이 잔존할 수 있으므로 11행 E~J 전체 null 초기화.
  for (let col = 5; col <= 10; col++) {
    const cell = ws.getCell(11, col)
    // 기존 수식 제거 — .value = null 만으로는 formula 가 유지되는 경우가 있어 type 명시
    if (cell.type === ExcelJS.ValueType.Formula) {
      cell.value = null
    }
  }
  // E11: 한글 금액
  const koreanCell = ws.getCell(11, 5)
  koreanCell.value = null
  koreanCell.value = toKoreanAmount(cr.grandTotal)
  koreanCell.alignment = { ...koreanCell.alignment, horizontal: 'center', vertical: 'middle', shrinkToFit: true }

  // K14: 계
  const totalCell = ws.getCell(14, 11)
  totalCell.value = null
  totalCell.value = cr.totalBeforeRound
  totalCell.alignment = { ...totalCell.alignment, horizontal: 'right', vertical: 'middle' }

  // K18: 합계
  const grandCell = ws.getCell(18, 11)
  grandCell.value = null
  grandCell.value = cr.grandTotal
  grandCell.alignment = { ...grandCell.alignment, horizontal: 'right', vertical: 'middle' }

  // D19: 특기사항
  const memo = estimate.memo?.trim() ?? ''
  const specialCell = ws.getCell(19, 4)
  specialCell.value = null
  specialCell.value =
    `  1. 하자보수기간 ${sheet.warranty_years}년 (하자이행증권 ${sheet.warranty_bond}년)\n` +
    `  2. 견적서 제출 30일 유효\n` +
    `  3. ${memo}`
  specialCell.alignment = { ...specialCell.alignment, horizontal: 'left', vertical: 'top', wrapText: true }
}

// ── Sheet2 (을지) ──

function fillDetail(
  ws: ExcelJS.Worksheet,
  estimate: Estimate,
  sheet: EstimateSheet,
  items: EstimateItem[],
): void {
  // C3: 공사명 치환
  const site = estimate.site_name ?? '방수공사'
  const methodLabel = sheet.type === '복합'
    ? '이중복합방수 3.8mm (제 1안)'
    : '우레탄방수 3mm (제 2안)'
  ws.getCell(3, 3).value = `${site} ${methodLabel}`

  const count = items.length

  if (count <= TEMPLATE_ZONE_SIZE) {
    // ── Case A: 템플릿 행 이하 — 채움 + 남는 행 삭제 ──
    // 이슈 #3 (빈 행 방치) + #4 (이미지 앵커 틀어짐) 대응:
    // spliceRows 직전 이미지 앵커 snapshot → 직후 anchor row 보정.
    for (let i = 0; i < count; i++) {
      const row = ITEM_START_ROW + i
      setItemRow(ws, row, items[i])
      setItemFormulas(ws, row)
    }

    const deleteCount = TEMPLATE_ZONE_SIZE - count
    if (deleteCount > 0) {
      const deleteStart = ITEM_START_ROW + count
      const deleteEnd = deleteStart + deleteCount - 1
      preserveImagesAcrossSplice(ws, deleteStart, deleteEnd, -deleteCount, () => {
        ws.spliceRows(deleteStart, deleteCount)
      })
    }

    const lastItemRow = ITEM_START_ROW + count - 1
    const newSummaryStart = ITEM_START_ROW + count
    updateSummaryFormulas(ws, newSummaryStart, ITEM_START_ROW, lastItemRow)

  } else {
    // ── Case B: 템플릿 행 초과 — 합계 행 위에 행 삽입 ──
    const extraRows = count - TEMPLATE_ZONE_SIZE
    preserveImagesAcrossSplice(ws, SUMMARY_START_ROW, Number.POSITIVE_INFINITY, extraRows, () => {
      ws.spliceRows(SUMMARY_START_ROW, 0, ...Array(extraRows).fill([]))
    })

    for (let i = 0; i < TEMPLATE_ZONE_SIZE; i++) {
      const row = ITEM_START_ROW + i
      setItemRow(ws, row, items[i])
      setItemFormulas(ws, row)
    }

    for (let i = TEMPLATE_ZONE_SIZE; i < count; i++) {
      const row = ITEM_START_ROW + i
      setItemRow(ws, row, items[i])
      setItemFormulas(ws, row)
    }

    const lastItemRow = ITEM_START_ROW + count - 1
    const newSummaryStart = SUMMARY_START_ROW + extraRows
    updateSummaryFormulas(ws, newSummaryStart, ITEM_START_ROW, lastItemRow)
  }
}

/**
 * spliceRows 전후 이미지 앵커 보정 헬퍼 (이슈 #4).
 *
 * exceljs 는 spliceRows 후 이미지 anchor 를 자동 재계산하지 않아
 * 로고/브랜드 이미지가 원래 위치에서 틀어질 수 있다.
 * splice 범위 이하 (또는 삽입 이상) 에 위치한 이미지의 row 오프셋을 명시 보정한다.
 *
 * @param affectedStartRow splice 시작 행 (0-based 내부, 1-based 외부 기준 그대로 전달)
 * @param affectedEndRow   splice 끝 행 (삭제 Case A) 또는 Infinity (삽입 Case B)
 * @param rowDelta         행 이동량 (삭제: 음수, 삽입: 양수)
 */
function preserveImagesAcrossSplice(
  ws: ExcelJS.Worksheet,
  affectedStartRow: number,
  affectedEndRow: number,
  rowDelta: number,
  splice: () => void,
): void {
  const images = ws.getImages()
  const snapshot = images.map(img => ({
    imageId: img.imageId,
    range: img.range,
  }))

  splice()

  // splice 후 worksheet 내부 이미지 앵커 재계산 보정.
  // exceljs 의 range 는 { tl: {col, row}, br: {col, row} } 구조 (0-based).
  // 삭제 범위 이후에 위치한 이미지는 row 를 rowDelta 만큼 이동.
  // ※ exceljs 1-based vs 0-based 혼재 — getImages 결과는 0-based.
  //   affectedStartRow 는 1-based 로 들어오므로 비교 시 -1 보정.
  const splice0 = affectedStartRow - 1
  const end0 = affectedEndRow === Number.POSITIVE_INFINITY ? Infinity : affectedEndRow - 1

  for (const snap of snapshot) {
    const r = snap.range as { tl?: { row?: number; col?: number }; br?: { row?: number; col?: number } }
    const tlRow = r?.tl?.row
    const brRow = r?.br?.row
    if (typeof tlRow !== 'number') continue

    // splice 이후 범위에 있으면 보정
    if (tlRow >= splice0 && (end0 === Infinity || tlRow <= end0 + Math.abs(rowDelta))) {
      if (r.tl) r.tl.row = Math.max(0, tlRow + rowDelta)
      if (r.br && typeof brRow === 'number') r.br.row = Math.max(0, brRow + rowDelta)
    }
  }
}

/**
 * 아이템 행 입력값 설정 (단가·수량 — 금액은 수식)
 * 0 값은 빈 문자열로 처리하여 셀이 비어 보이게 함.
 *
 * 이슈 #2 대응: 품명이 2줄 이상이면 row.height 를 명시해 잘림 방지.
 * wrapText=true 를 품명 셀에 보장해 \n 또는 긴 문자열이 정상 wrap 되도록 함.
 */
function setItemRow(ws: ExcelJS.Worksheet, r: number, item: EstimateItem): void {
  const nameCell = ws.getCell(r, 2)
  nameCell.value = item.name
  nameCell.alignment = { ...nameCell.alignment, wrapText: true, vertical: 'middle' }

  ws.getCell(r, 3).value = item.spec || ''        // C: 규격
  ws.getCell(r, 4).value = item.unit              // D: 단위
  ws.getCell(r, 5).value = item.qty > 0 ? item.qty : ''  // E: 수량
  ws.getCell(r, 6).value = item.mat > 0 ? item.mat : ''  // F: 재료단가
  ws.getCell(r, 8).value = item.labor > 0 ? item.labor : ''  // H: 인건단가
  ws.getCell(r, 10).value = item.exp > 0 ? item.exp : ''  // J: 경비단가

  // 행 높이 — 품명 기준 동적 산정
  const desired = computeRowHeight(item.name)
  const row = ws.getRow(r)
  if ((row.height ?? 0) < desired) {
    row.height = desired
  }
}

/**
 * 아이템 행 수식 설정 (G/I/K/L/M 열)
 * 템플릿 기존 수식 여부 무관하게 일관된 수식 재설정
 */
function setItemFormulas(ws: ExcelJS.Worksheet, r: number): void {
  ws.getCell(r, 7).value = { formula: `E${r}*F${r}` }           // G: 재료금액
  ws.getCell(r, 9).value = { formula: `E${r}*H${r}` }           // I: 인건금액
  ws.getCell(r, 11).value = { formula: `E${r}*J${r}` }          // K: 경비금액
  ws.getCell(r, 12).value = { formula: `F${r}+H${r}+J${r}` }   // L: 합단가
  ws.getCell(r, 13).value = { formula: `G${r}+I${r}+K${r}` }   // M: 합금액
}

/**
 * 소계~합계 수식 재설정 (5행: 소계/공과잡비/기업이윤/계/합계)
 */
function updateSummaryFormulas(
  ws: ExcelJS.Worksheet,
  summaryStart: number,
  firstItem: number,
  lastItem: number,
): void {
  // 소계 (G/I/K/M 열 SUM)
  for (const col of [7, 9, 11, 13]) {
    const colLetter = String.fromCharCode(64 + col) // G=71-64=7 → G
    ws.getCell(summaryStart, col).value = {
      formula: `SUM(${colLetter}${firstItem}:${colLetter}${lastItem})`,
    }
  }

  // 공과잡비 3%
  ws.getCell(summaryStart + 1, 13).value = {
    formula: `M${summaryStart}*0.03`,
  }

  // 기업이윤 6%
  ws.getCell(summaryStart + 2, 13).value = {
    formula: `M${summaryStart}*0.06`,
  }

  // 계
  ws.getCell(summaryStart + 3, 13).value = {
    formula: `SUM(M${summaryStart}:M${summaryStart + 2})`,
  }

  // 합계 (10만원 절사)
  ws.getCell(summaryStart + 4, 13).value = {
    formula: `FLOOR(M${summaryStart + 3},100000)`,
  }
}
