import ExcelJS from 'exceljs'
import type { Estimate, EstimateSheet, CalcResult } from '@/lib/estimate/types'
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

/**
 * 견적서 엑셀 워크북 생성
 */
export async function generateWorkbook(estimate: Estimate): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  wb.creator = '방수명가 v4'
  wb.created = new Date()

  // 표지 시트
  addCoverSheet(wb, estimate)

  // 공종 시트
  for (const sheet of estimate.sheets) {
    addWorkSheet(wb, estimate, sheet)
  }

  return wb
}

/**
 * 워크북 → Buffer
 */
export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

// ── 표지 시트 ──

function addCoverSheet(wb: ExcelJS.Workbook, estimate: Estimate) {
  const ws = wb.addWorksheet('표지', { properties: { defaultColWidth: 15 } })

  // 컬럼 너비
  ws.columns = [
    { width: 15 },
    { width: 25 },
    { width: 15 },
    { width: 25 },
  ]

  // 제목
  ws.mergeCells('A1:D1')
  const titleCell = ws.getCell('A1')
  titleCell.value = '견 적 서'
  titleCell.font = { name: FONT_NAME, bold: true, size: 20, color: { argb: `FF${BRAND_COLOR}` } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 50

  // 구분선
  ws.getRow(2).height = 5

  // 정보 행
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

    // 왼쪽
    const labelCell = ws.getCell(row, 1)
    labelCell.value = info[i][0]
    labelCell.font = BOLD_FONT
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    labelCell.border = THIN_BORDER

    const valueCell = ws.getCell(row, 2)
    valueCell.value = info[i][1] ?? ''
    valueCell.font = BODY_FONT
    valueCell.border = THIN_BORDER

    // 오른쪽
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

  // 시트 요약
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

// ── 공종 시트 ──

function addWorkSheet(wb: ExcelJS.Workbook, estimate: Estimate, sheet: EstimateSheet) {
  const sheetName = sheet.title ?? sheet.type
  const ws = wb.addWorksheet(sheetName)

  // 컬럼 설정
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

  // 제목 행
  ws.mergeCells('A1:I1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `${sheetName} — ${estimate.customer_name ?? ''} (${estimate.m2}m²)`
  titleCell.font = { ...BOLD_FONT, size: 13, color: { argb: `FF${BRAND_COLOR}` } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 35

  // 헤더 행
  const headerRow = ws.getRow(2)
  headerRow.height = 24
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = THIN_BORDER
  })

  // 데이터 행
  sheet.items.forEach((item, idx) => {
    const row = ws.getRow(idx + 3)
    row.height = 20

    row.getCell(1).value = item.sort_order
    row.getCell(2).value = item.name
    row.getCell(3).value = item.spec
    row.getCell(4).value = item.unit
    row.getCell(5).value = item.qty
    row.getCell(6).value = item.mat
    row.getCell(7).value = item.labor
    row.getCell(8).value = item.exp
    row.getCell(9).value = item.total

    row.eachCell((cell, colNumber) => {
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

  // 합계 영역
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
