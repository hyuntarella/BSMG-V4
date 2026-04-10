/**
 * 견적서 파일명 생성 유틸리티
 * 클라이언트 번들에서 puppeteer 의존성 없이 사용 가능
 */

import type { Estimate, Method } from '@/lib/estimate/types'

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
