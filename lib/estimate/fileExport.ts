/**
 * Phase 4G — 견적서 3포맷 저장 (JSON / Excel / PDF)
 *
 * - generateJson: jsonIO.exportToJson 래퍼 (메타 포함)
 * - generateExcel: 기존 generateWorkbook 재사용
 * - generateTempPdf: 시트별 PDF 생성 (복합/우레탄 분리)
 * - getExcelFileName: 파일명 규칙
 * - getPdfFileName: PDF 파일명 규칙
 */

import { exportToJson } from '@/lib/estimate/jsonIO'
import { generateWorkbook, workbookToBuffer } from '@/lib/excel/generateWorkbook'
import { generateEstimateHtml, generatePdfBuffer } from '@/lib/pdf/generatePdf'
import type { Estimate, Method } from '@/lib/estimate/types'
export { getExcelFileName, getPdfFileName } from '@/lib/estimate/fileNames'

/** JSON 직렬화 (jsonIO.exportToJson 재사용) */
export function generateJson(estimate: Estimate): string {
  return exportToJson(estimate)
}

/** Excel Buffer 생성 (복합+우레탄 2시트 워크북) */
export async function generateExcel(estimate: Estimate): Promise<Buffer> {
  const wb = await generateWorkbook(estimate)
  return workbookToBuffer(wb)
}

/**
 * 시트별 임시 PDF 생성
 *
 * estimate를 복사하고 sheets를 해당 sheetType 1개만 포함시킨 후
 * generateEstimateHtml → generatePdfBuffer 호출.
 */
export async function generateTempPdf(
  estimate: Estimate,
  sheetType: Method,
): Promise<Buffer> {
  const targetSheet = estimate.sheets.find((s) => s.type === sheetType)
  if (!targetSheet) {
    throw new Error(`시트 타입 '${sheetType}'을 찾을 수 없습니다`)
  }

  const singleSheetEstimate: Estimate = {
    ...estimate,
    sheets: [targetSheet],
  }

  const html = generateEstimateHtml(singleSheetEstimate)
  return generatePdfBuffer(html)
}

