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
  }

  // Sheet2 (을지) 주입
  const detailWs = wb.getWorksheet(2)
  if (detailWs) {
    fillDetail(detailWs, estimate, sheet, items)
  }

  // Config 시트 제거
  const configSheet = wb.getWorksheet('Config')
  if (configSheet) wb.removeWorksheet(configSheet.id)

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

// ── Sheet1 (갑지) ──

function fillCover(
  ws: ExcelJS.Worksheet,
  estimate: Estimate,
  sheet: EstimateSheet,
  items: EstimateItem[],
): void {
  // D6: 관리번호
  ws.getCell(6, 4).value = estimate.mgmt_no ?? ''

  // D7: 견적일
  ws.getCell(7, 4).value = estimate.date ?? ''

  // D8: 고객명 귀하
  ws.getCell(8, 4).value = estimate.customer_name
    ? `${estimate.customer_name} 귀하`
    : '귀하'

  // D9: 공사명
  ws.getCell(9, 4).value = estimate.site_name ?? '방수공사'

  // J9: 현장주소 (현재 Estimate에 address 필드 없음 → site_name 사용)
  ws.getCell(9, 10).value = estimate.site_name ?? ''

  // ── 금액 (수식이 Node에서 평가 안 되므로 직접 값) ──
  const cr = calc(items)

  // E11: 한글 금액 (NUMBERSTRING 수식 대체)
  ws.getCell(11, 5).value = toKoreanAmount(cr.grandTotal)

  // K14: 계 (Sheet2!M21 수식 대체 — 행 번호 바뀌므로 직접 값)
  ws.getCell(14, 11).value = cr.totalBeforeRound

  // K18: 합계 (Sheet2!M22 수식 대체)
  ws.getCell(18, 11).value = cr.grandTotal

  // D19: 특기사항 (B19:C22는 라벨 머지, D19:R22가 내용 머지)
  const memo = estimate.memo?.trim() ?? ''
  ws.getCell(19, 4).value =
    `  1. 하자보수기간 ${sheet.warranty_years}년 (하자이행증권 ${sheet.warranty_bond}년)\n` +
    `  2. 견적서 제출 30일 유효\n` +
    `  3. ${memo}`
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
    // 1) 아이템 행 채움
    for (let i = 0; i < count; i++) {
      const row = ITEM_START_ROW + i
      setItemRow(ws, row, items[i])
      setItemFormulas(ws, row)
    }

    // 2) 남는 행 삭제 (아래에서 위로)
    const deleteCount = TEMPLATE_ZONE_SIZE - count
    if (deleteCount > 0) {
      // spliceRows(startRow, deleteCount) 로 한 번에 삭제
      ws.spliceRows(ITEM_START_ROW + count, deleteCount)
    }

    // 3) 합계 수식 재설정 (행 번호가 바뀜)
    const lastItemRow = ITEM_START_ROW + count - 1
    const newSummaryStart = ITEM_START_ROW + count
    updateSummaryFormulas(ws, newSummaryStart, ITEM_START_ROW, lastItemRow)

  } else {
    // ── Case B: 템플릿 행 초과 — 합계 행 위에 행 삽입 ──
    const extraRows = count - TEMPLATE_ZONE_SIZE

    // 1) 소계 행(18) 위에 빈 행 삽입
    ws.spliceRows(SUMMARY_START_ROW, 0, ...Array(extraRows).fill([]))

    // 2) 기존 템플릿 행 (7-17) 채움
    for (let i = 0; i < TEMPLATE_ZONE_SIZE; i++) {
      const row = ITEM_START_ROW + i
      setItemRow(ws, row, items[i])
      setItemFormulas(ws, row)
    }

    // 3) 삽입된 행 채움 + 수식
    for (let i = TEMPLATE_ZONE_SIZE; i < count; i++) {
      const row = ITEM_START_ROW + i
      setItemRow(ws, row, items[i])
      setItemFormulas(ws, row)
    }

    // 4) 합계 수식 재설정
    const lastItemRow = ITEM_START_ROW + count - 1
    const newSummaryStart = SUMMARY_START_ROW + extraRows
    updateSummaryFormulas(ws, newSummaryStart, ITEM_START_ROW, lastItemRow)
  }
}

/**
 * 아이템 행 입력값 설정 (단가·수량 — 금액은 수식)
 * 0 값은 빈 문자열로 처리하여 셀이 비어 보이게 함
 */
function setItemRow(ws: ExcelJS.Worksheet, r: number, item: EstimateItem): void {
  ws.getCell(r, 2).value = item.name             // B: 품명
  ws.getCell(r, 3).value = item.spec || ''        // C: 규격
  ws.getCell(r, 4).value = item.unit              // D: 단위
  ws.getCell(r, 5).value = item.qty > 0 ? item.qty : ''  // E: 수량
  ws.getCell(r, 6).value = item.mat > 0 ? item.mat : ''  // F: 재료단가
  ws.getCell(r, 8).value = item.labor > 0 ? item.labor : ''  // H: 인건단가
  ws.getCell(r, 10).value = item.exp > 0 ? item.exp : ''  // J: 경비단가
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
