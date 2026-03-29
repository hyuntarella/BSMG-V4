/**
 * 견적서 JSON 저장/불러오기
 */

import type { Estimate } from './types'

export interface EstimateJson {
  version: string
  exportedAt: string
  estimate: Estimate
}

/** 견적서 → JSON 문자열 */
export function exportToJson(estimate: Estimate): string {
  const data: EstimateJson = {
    version: '4.0',
    exportedAt: new Date().toISOString(),
    estimate,
  }
  return JSON.stringify(data, null, 2)
}

/** JSON 문자열 → 견적서 (검증 포함) */
export function importFromJson(jsonStr: string): Estimate {
  const data = JSON.parse(jsonStr) as EstimateJson

  if (!data.estimate) throw new Error('유효하지 않은 견적서 JSON입니다')
  if (!data.estimate.sheets) throw new Error('시트 데이터가 없습니다')

  // 기본값 보정
  const est = data.estimate
  est.status = 'draft'
  est.m2 = est.m2 ?? 0
  est.wall_m2 = est.wall_m2 ?? 0
  est.sheets = est.sheets.map(s => ({
    ...s,
    items: s.items.map(it => ({
      ...it,
      mat_amount: Math.round((it.qty ?? 0) * (it.mat ?? 0)),
      labor_amount: Math.round((it.qty ?? 0) * (it.labor ?? 0)),
      exp_amount: Math.round((it.qty ?? 0) * (it.exp ?? 0)),
      total: Math.round((it.qty ?? 0) * ((it.mat ?? 0) + (it.labor ?? 0) + (it.exp ?? 0))),
    })),
  }))

  return est
}

/** JSON 파일 다운로드 */
export function downloadJson(estimate: Estimate, filename: string) {
  const json = exportToJson(estimate)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
