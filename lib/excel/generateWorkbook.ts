import ExcelJS from 'exceljs'
import path from 'path'
import type { Estimate, EstimateSheet, EstimateItem, CalcResult } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'

const FONT_NAME = '맑은 고딕'
const BRAND_COLOR = 'A11D1F'
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_COLOR}` } }
const HEADER_FONT: Partial<ExcelJS.Font> = { name: FONT_NAME, bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
const BODY_FONT: Partial<ExcelJS.Font> = { name: FONT_NAME, size: 10 }
const BOLD_FONT: Partial<ExcelJS.Font> = { name: FONT_NAME, bold: true, size: 10 }
const NUMBER_FMT = '#,##0'
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
}

// ── 템플릿 기반 상수 ──
// Sheet2 item rows 7~N, summary starts at row 18 (both complex and urethane)
const TEMPLATE_ITEM_START_ROW = 7
const TEMPLATE_SUMMARY_START_ROW = 18 // 소계 행 위치 (복합/우레탄 공통)

// 복합 템플릿: 11개 공종 (rows 7-17)
const COMPLEX_TEMPLATE_ITEM_COUNT = 11
// 우레탄 템플릿: 10개 공종 (rows 7-16), row 17은 빈 행
const URETHANE_TEMPLATE_ITEM_COUNT = 10

interface TemplateConfig {
  templatePath: string
  templateItemCount: number
}

function getTemplateConfig(sheetType: string): TemplateConfig {
  if (sheetType === '우레탄') {
    return {
      templatePath: path.join(process.cwd(), 'public/templates/urethane-template.xlsx'),
      templateItemCount: URETHANE_TEMPLATE_ITEM_COUNT,
    }
  }
  return {
    templatePath: path.join(process.cwd(), 'public/templates/complex-template.xlsx'),
    templateItemCount: COMPLEX_TEMPLATE_ITEM_COUNT,
  }
}

/**
 * 견적서 엑셀 워크북 생성
 *
 * estimate.sheets[0] 의 공법에 맞는 템플릿을 로드한다.
 * - 복합: complex-template.xlsx (Sheet2 아이템 11행)
 * - 우레탄: urethane-template.xlsx (Sheet2 아이템 10행)
 *
 * 두 번째 시트가 있는 경우(복합+우레탄 동시) 두 번째 시트는
 * 스크래치 방식으로 워크북에 추가한다.
 *
 * 템플릿 파일이 존재하지 않으면 전체 스크래치 방식으로 폴백한다.
 */
export async function generateWorkbook(estimate: Estimate): Promise<ExcelJS.Workbook> {
  const firstSheet = estimate.sheets[0]
  if (!firstSheet) {
    return generateFromScratch(estimate)
  }

  const config = getTemplateConfig(firstSheet.type)

  try {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(config.templatePath)
    return generateFromTemplate(wb, estimate, config)
  } catch {
    // 템플릿 없으면 기존 방식 폴백
    return generateFromScratch(estimate)
  }
}

/**
 * 워크북 → Buffer
 */
export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

// ── 템플릿 기반 생성 ──

/**
 * 템플릿 기반으로 견적 데이터를 채운다.
 *
 * Sheet1 (표지): 관리번호·견적일·공사명·고객명 업데이트
 * Sheet2 (상세): 첫 번째 시트 데이터 + 합계 영역 채움
 *
 * 두 번째 시트(복합+우레탄 동시)는 기존 addWorkSheet 방식으로 추가한다.
 */
function generateFromTemplate(
  wb: ExcelJS.Workbook,
  estimate: Estimate,
  config: TemplateConfig,
): ExcelJS.Workbook {
  // ── Sheet1 (표지) 업데이트 ──
  const coverWs = wb.getWorksheet(1)
  if (coverWs) {
    fillCoverFromTemplate(coverWs, estimate)
  }

  // ── Sheet2 (상세) 업데이트 — 첫 번째 시트 ──
  const detailWs = wb.getWorksheet(2)
  if (detailWs && estimate.sheets[0]) {
    fillDetailFromTemplate(detailWs, estimate, estimate.sheets[0], config.templateItemCount)
  }

  // ── 두 번째 시트가 있으면 스크래치 방식으로 추가 ──
  if (estimate.sheets.length >= 2) {
    for (let i = 1; i < estimate.sheets.length; i++) {
      addWorkSheet(wb, estimate, estimate.sheets[i])
    }
  }

  return wb
}

/**
 * Sheet1 (표지) 셀 값 업데이트.
 * 템플릿 레이아웃:
 *   Row 6 col D: 관리번호
 *   Row 7 col D: 견적일
 *   Row 8 col D: 고객명 (귀하)
 *   Row 9 col D: 공사명
 */
function fillCoverFromTemplate(ws: ExcelJS.Worksheet, estimate: Estimate): void {
  // 관리번호 (Row 6, col D=4)
  ws.getCell(6, 4).value = estimate.mgmt_no ?? ''

  // 견적일 (Row 7, col D=4)
  ws.getCell(7, 4).value = estimate.date ?? ''

  // 고객명 (Row 8, col D=4) — 원본은 "귀하" 텍스트, 고객명으로 교체
  const customerText = estimate.customer_name ? `${estimate.customer_name} 귀하` : '귀하'
  ws.getCell(8, 4).value = customerText

  // 공사명 (Row 9, col D=4)
  const siteText = estimate.site_name ?? '방수공사'
  ws.getCell(9, 4).value = siteText
}

/**
 * Sheet2 (상세) 아이템 + 합계 채움.
 *
 * 템플릿 구조 (복합/우레탄 공통):
 *   Row 3 col C: 공사명
 *   Rows 5-6: 헤더 (건드리지 않음)
 *   Rows 7~(7+templateItemCount-1): 아이템 행
 *   Row 18: 소계 — M열 formula SUM(M7:M1x)
 *   Row 19: 공과잡비 3%
 *   Row 20: 기업이윤 6%
 *   Row 21: 계
 *   Row 22: 합계 (10만원 절사)
 *
 * 채움 전략:
 *   - 아이템 수 <= templateItemCount: 아이템 행 직접 채움, 남는 행은 숨김+클리어
 *   - 아이템 수 > templateItemCount: 합계 행 위에 행 삽입 후 추가 행 직접 값 입력
 *   - 0 값은 빈 문자열로 처리하여 셀이 비어 보이게 함
 *   - 단가(F,H,J)/수량(E)만 직접 입력, 금액(G,I,K,M)은 수식이 계산
 *     단, 삽입된 추가 행은 수식 없으므로 금액도 직접 입력
 *
 * @param templateItemCount - 복합=11, 우레탄=10
 */
function fillDetailFromTemplate(
  ws: ExcelJS.Worksheet,
  estimate: Estimate,
  sheet: EstimateSheet,
  templateItemCount: number,
): void {
  const items = sheet.items

  // 공사명 업데이트 (Row 3, col C=3)
  const siteTitle = estimate.site_name ?? '방수공사'
  const methodTitle = sheet.title ?? sheet.type
  ws.getCell(3, 3).value = `${siteTitle} — ${methodTitle}`

  const actualItemCount = items.length

  if (actualItemCount <= templateItemCount) {
    // ── 케이스 A: 템플릿 행 이하 — 직접 채움 + 남는 행 숨김 ──
    for (let i = 0; i < templateItemCount; i++) {
      const rowNum = TEMPLATE_ITEM_START_ROW + i
      const item = items[i]

      if (item) {
        setItemRowValues(ws, rowNum, item)
        // 혹시 이전에 숨겨졌을 행 복원
        ws.getRow(rowNum).hidden = false
      } else {
        // 사용하지 않는 행: 클리어 + 숨김
        clearItemRow(ws, rowNum)
        ws.getRow(rowNum).hidden = true
      }
    }
    // 합계 행은 기존 수식이 자동 계산 — 건드리지 않음
    // (우레탄 템플릿 row 17은 빈 행이므로 항상 숨김)
    if (templateItemCount === URETHANE_TEMPLATE_ITEM_COUNT) {
      // row 17은 빈 행으로 유지 (이미 비어있음)
      ws.getRow(TEMPLATE_ITEM_START_ROW + URETHANE_TEMPLATE_ITEM_COUNT).hidden = true
    }
  } else {
    // ── 케이스 B: 템플릿 행 초과 — 행 삽입 후 합계 행 이동 ──
    const extraRows = actualItemCount - templateItemCount

    // 합계 영역을 아래로 밀기: row 18(소계) 위치에 행 삽입
    ws.spliceRows(TEMPLATE_SUMMARY_START_ROW, 0, ...Array(extraRows).fill([]))

    // 이제 합계 행 위치가 밀려남
    const newSubtotalRow = TEMPLATE_SUMMARY_START_ROW + extraRows
    const newOverheadRow = newSubtotalRow + 1
    const newProfitRow = newSubtotalRow + 2
    const newTotalRow = newSubtotalRow + 3
    const newGrandTotalRow = newSubtotalRow + 4

    // 기존 템플릿 행 채움 (수식 있음)
    for (let i = 0; i < templateItemCount; i++) {
      const rowNum = TEMPLATE_ITEM_START_ROW + i
      setItemRowValues(ws, rowNum, items[i])
      ws.getRow(rowNum).hidden = false
    }

    // 추가 행 채움 (수식 없음 — 직접 값 입력)
    for (let i = templateItemCount; i < actualItemCount; i++) {
      const rowNum = TEMPLATE_ITEM_START_ROW + i
      const item = items[i]
      setItemRowValues(ws, rowNum, item)
      ws.getRow(rowNum).hidden = false
      // 추가 행 금액도 직접 채움 (템플릿 수식이 없으므로)
      ws.getCell(rowNum, 7).value = item.mat_amount > 0 ? item.mat_amount : ''
      ws.getCell(rowNum, 9).value = item.labor_amount > 0 ? item.labor_amount : ''
      ws.getCell(rowNum, 11).value = item.exp_amount > 0 ? item.exp_amount : ''
      ws.getCell(rowNum, 13).value = item.total > 0 ? item.total : ''
    }

    // 합계 수식 재설정 (행 번호가 바뀌었으므로 직접 값 입력)
    const calcResult: CalcResult = calc(items)
    setTemplateSummaryValues(ws, newSubtotalRow, newOverheadRow, newProfitRow, newTotalRow, newGrandTotalRow, calcResult)
  }
}

/**
 * 아이템 행 값 설정 (단가·수량만, 금액은 수식에 맡김)
 * col B=2: 품명, C=3: 규격, D=4: 단위, E=5: 수량
 * col F=6: 재료비단가, H=8: 인건비단가, J=10: 경비단가
 */
function setItemRowValues(ws: ExcelJS.Worksheet, rowNum: number, item: EstimateItem): void {
  ws.getCell(rowNum, 2).value = item.name
  ws.getCell(rowNum, 3).value = item.spec || ''
  ws.getCell(rowNum, 4).value = item.unit
  ws.getCell(rowNum, 5).value = item.qty > 0 ? item.qty : ''
  ws.getCell(rowNum, 6).value = item.mat > 0 ? item.mat : ''
  ws.getCell(rowNum, 8).value = item.labor > 0 ? item.labor : ''
  ws.getCell(rowNum, 10).value = item.exp > 0 ? item.exp : ''
}

/**
 * 아이템 행 수치 클리어 (빈 행 처리)
 */
function clearItemRow(ws: ExcelJS.Worksheet, rowNum: number): void {
  ;[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].forEach(col => {
    ws.getCell(rowNum, col).value = ''
  })
}

/**
 * 합계 영역 직접 값 설정 (11개 초과로 행 삽입된 경우)
 */
function setTemplateSummaryValues(
  ws: ExcelJS.Worksheet,
  subtotalRow: number,
  overheadRow: number,
  profitRow: number,
  totalRow: number,
  grandTotalRow: number,
  cr: CalcResult,
): void {
  ws.getCell(subtotalRow, 13).value = cr.subtotal
  ws.getCell(overheadRow, 13).value = cr.overhead
  ws.getCell(profitRow, 13).value = cr.profit
  ws.getCell(totalRow, 13).value = cr.totalBeforeRound
  ws.getCell(grandTotalRow, 13).value = cr.grandTotal
}

// ── 기존 방식 (스크래치) 폴백 ──

async function generateFromScratch(estimate: Estimate): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  wb.creator = '방수명가 v4'
  wb.created = new Date()

  addCoverSheet(wb, estimate)

  for (const sheet of estimate.sheets) {
    addWorkSheet(wb, estimate, sheet)
  }

  return wb
}

// ── 표지 시트 (스크래치) ──

function addCoverSheet(wb: ExcelJS.Workbook, estimate: Estimate) {
  const ws = wb.addWorksheet('표지', { properties: { defaultColWidth: 15 } })

  ws.columns = [
    { width: 15 },
    { width: 25 },
    { width: 15 },
    { width: 25 },
  ]

  ws.mergeCells('A1:D1')
  const titleCell = ws.getCell('A1')
  titleCell.value = '견 적 서'
  titleCell.font = { name: FONT_NAME, bold: true, size: 20, color: { argb: `FF${BRAND_COLOR}` } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 50

  ws.getRow(2).height = 5

  const info: [string, string | number | undefined][] = [
    ['관리번호', estimate.mgmt_no],
    ['일자', estimate.date],
    ['고객명', estimate.customer_name],
    ['현장명', estimate.site_name],
    ['담당자', estimate.manager_name],
    ['연락처', estimate.manager_phone],
    ['면적', `${estimate.m2} m²`],
    ['벽체면적', `${estimate.wall_m2} m`],
    ['메모', estimate.memo],
  ]

  let row = 3
  for (let i = 0; i < info.length; i += 2) {
    const r = ws.getRow(row)
    r.height = 22

    const labelCell = ws.getCell(row, 1)
    labelCell.value = info[i][0]
    labelCell.font = BOLD_FONT
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    labelCell.border = THIN_BORDER

    const valueCell = ws.getCell(row, 2)
    valueCell.value = info[i][1] ?? ''
    valueCell.font = BODY_FONT
    valueCell.border = THIN_BORDER

    if (i + 1 < info.length) {
      const labelCell2 = ws.getCell(row, 3)
      labelCell2.value = info[i + 1][0]
      labelCell2.font = BOLD_FONT
      labelCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
      labelCell2.border = THIN_BORDER

      const valueCell2 = ws.getCell(row, 4)
      valueCell2.value = info[i + 1][1] ?? ''
      valueCell2.font = BODY_FONT
      valueCell2.border = THIN_BORDER
    }

    row++
  }

  row += 1
  ws.mergeCells(row, 1, row, 4)
  const summaryTitle = ws.getCell(row, 1)
  summaryTitle.value = '견적 요약'
  summaryTitle.font = { ...BOLD_FONT, size: 12 }
  row++

  for (const sheet of estimate.sheets) {
    const calcResult = calc(sheet.items)
    const r = ws.getRow(row)
    r.height = 22

    ws.getCell(row, 1).value = sheet.title ?? sheet.type
    ws.getCell(row, 1).font = BOLD_FONT
    ws.getCell(row, 1).border = THIN_BORDER

    ws.mergeCells(row, 2, row, 3)
    const amtCell = ws.getCell(row, 2)
    amtCell.value = calcResult.grandTotal
    amtCell.numFmt = `${NUMBER_FMT}"원"`
    amtCell.font = { ...BOLD_FONT, size: 12, color: { argb: `FF${BRAND_COLOR}` } }
    amtCell.alignment = { horizontal: 'right' }
    amtCell.border = THIN_BORDER

    ws.getCell(row, 4).value = `평단가 ${sheet.price_per_pyeong.toLocaleString()}원`
    ws.getCell(row, 4).font = BODY_FONT
    ws.getCell(row, 4).border = THIN_BORDER

    row++
  }
}

// ── 공종 시트 (스크래치) ──

function addWorkSheet(wb: ExcelJS.Workbook, estimate: Estimate, sheet: EstimateSheet) {
  const sheetName = sheet.title ?? sheet.type
  const ws = wb.addWorksheet(sheetName)

  ws.columns = [
    { header: '#',    key: 'no',     width: 5 },
    { header: '품명', key: 'name',   width: 18 },
    { header: '규격', key: 'spec',   width: 16 },
    { header: '단위', key: 'unit',   width: 6 },
    { header: '수량', key: 'qty',    width: 9 },
    { header: '재료비', key: 'mat',  width: 10 },
    { header: '노무비', key: 'labor', width: 10 },
    { header: '경비', key: 'exp',    width: 10 },
    { header: '금액', key: 'total',  width: 14 },
  ]

  ws.mergeCells('A1:I1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `${sheetName} — ${estimate.customer_name ?? ''} (${estimate.m2}m²)`
  titleCell.font = { ...BOLD_FONT, size: 13, color: { argb: `FF${BRAND_COLOR}` } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 35

  const headerRow = ws.getRow(2)
  headerRow.height = 24
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = THIN_BORDER
  })

  sheet.items.forEach((item, idx) => {
    const r = ws.getRow(idx + 3)
    r.height = 20

    r.getCell(1).value = item.sort_order
    r.getCell(2).value = item.name
    r.getCell(3).value = item.spec
    r.getCell(4).value = item.unit
    r.getCell(5).value = item.qty
    r.getCell(6).value = item.mat
    r.getCell(7).value = item.labor
    r.getCell(8).value = item.exp
    r.getCell(9).value = item.total

    r.eachCell((cell, colNumber) => {
      cell.font = colNumber === 2 ? BOLD_FONT : BODY_FONT
      cell.border = THIN_BORDER
      if (colNumber >= 5) {
        cell.numFmt = NUMBER_FMT
        cell.alignment = { horizontal: 'right' }
      }
      if (colNumber <= 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
      if (colNumber === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      }
    })
  })

  const calcResult: CalcResult = calc(sheet.items)
  const startRow = sheet.items.length + 3

  const summaryData: [string, number][] = [
    ['소계', calcResult.subtotal],
    ['공과잡비 (3%)', calcResult.overhead],
    ['기업이윤 (6%)', calcResult.profit],
    ['계', calcResult.totalBeforeRound],
    ['합계 (10만원 절사)', calcResult.grandTotal],
  ]

  summaryData.forEach(([label, value], idx) => {
    const rowNum = startRow + idx
    const row = ws.getRow(rowNum)
    row.height = 22

    ws.mergeCells(rowNum, 1, rowNum, 8)
    const labelCell = ws.getCell(rowNum, 1)
    labelCell.value = label
    labelCell.font = idx === 4 ? { ...BOLD_FONT, size: 12, color: { argb: `FF${BRAND_COLOR}` } } : BOLD_FONT
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' }
    labelCell.border = THIN_BORDER

    const valueCell = ws.getCell(rowNum, 9)
    valueCell.value = value
    valueCell.numFmt = NUMBER_FMT
    valueCell.font = idx === 4 ? { ...BOLD_FONT, size: 12, color: { argb: `FF${BRAND_COLOR}` } } : BOLD_FONT
    valueCell.alignment = { horizontal: 'right', vertical: 'middle' }
    valueCell.border = THIN_BORDER
  })
}

