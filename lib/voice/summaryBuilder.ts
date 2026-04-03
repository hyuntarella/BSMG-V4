/**
 * 상태 요약 키워드 매칭 결과
 * - 'read_summary': 전체 상태 요약
 * - 'read_margin': 마진만 읽기
 */
export type SummaryAction = 'read_summary' | 'read_margin'

/**
 * 정규화된 텍스트에서 상태 요약 키워드를 감지한다.
 * LLM 호출 없이 로컬에서 처리하기 위한 사전 분류.
 */
export function matchSummaryKeyword(normalized: string): SummaryAction | null {
  if (/현재\s*상태|상태\s*알려|요약|^총액$/.test(normalized)) {
    return 'read_summary'
  }
  if (/마진\s*얼마|^마진$/.test(normalized)) {
    return 'read_margin'
  }
  return null
}

/**
 * 시트 데이터에서 전체 요약 텍스트를 생성한다.
 * @param sheetType - 시트 타입 ('복합' | '우레탄')
 * @param m2 - 면적 (m²)
 * @param itemCount - 공종 수
 * @param grandTotal - 총액 (원)
 * @param margin - 마진율 (%)
 */
export function buildSummaryText(
  sheetType: string,
  m2: number,
  itemCount: number,
  grandTotal: number,
  margin: number,
): string {
  const totalManWon = Math.round(grandTotal / 10000)
  return `${sheetType} 면적 ${m2}제곱미터, 공종 ${itemCount}개, 총액 ${totalManWon.toLocaleString()}만원, 마진 ${Math.round(margin)}퍼센트.`
}

/**
 * 마진율만 텍스트로 생성한다.
 * @param sheetType - 시트 타입
 * @param margin - 마진율 (%)
 */
export function buildMarginText(sheetType: string, margin: number): string {
  return `${sheetType} 마진 ${Math.round(margin)}퍼센트.`
}
