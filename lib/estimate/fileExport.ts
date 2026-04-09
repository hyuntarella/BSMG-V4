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

/** 파일명 사용 불가 문자 제거 */
function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '').trim()
}

/** 평단가를 k 단위 문자열로 변환 (예: 35000 → "35k") */
function formatPriceK(price: number): string {
  if (!price || price <= 0) return '0k'
  return `${Math.round(price / 1000)}k`
}

/**
 * 엑셀 파일명 생성
 * 규칙: {견적일}_{고객명}_{공사명}_복합{평단가}_우레탄{평단가}.xlsx
 */
export function getExcelFileName(estimate: Estimate): string {
  const dateStr = estimate.date || 'unknown'
  const customer = sanitizeFileName(estimate.customer_name || '미지정')
  const site = sanitizeFileName(estimate.site_name || '방수공사')

  const complexSheet = estimate.sheets.find((s) => s.type === '복합')
  const urethaneSheet = estimate.sheets.find((s) => s.type === '우레탄')

  const complexPrice = formatPriceK(complexSheet?.price_per_pyeong ?? 0)
  const urethanePrice = formatPriceK(urethaneSheet?.price_per_pyeong ?? 0)

  return `${dateStr}_${customer}_${site}_복합${complexPrice}_우레탄${urethanePrice}.xlsx`
}

/**
 * PDF 파일명 생성
 * 규칙: {견적일}_{고객명}_{공사명}_{공법}{평단가}.pdf
 */
export function getPdfFileName(estimate: Estimate, sheetType: Method): string {
  const dateStr = estimate.date || 'unknown'
  const customer = sanitizeFileName(estimate.customer_name || '미지정')
  const site = sanitizeFileName(estimate.site_name || '방수공사')

  const sheet = estimate.sheets.find((s) => s.type === sheetType)
  const price = formatPriceK(sheet?.price_per_pyeong ?? 0)

  return `${dateStr}_${customer}_${site}_${sheetType}${price}.pdf`
}
