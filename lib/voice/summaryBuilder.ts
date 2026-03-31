/**
 * 상태 요약 키워드 매칭 결과
 * - 'read_summary': 전체 상태 요약
 * - 'read_margin': 마진만 읽기
 */
export type SummaryAction = 'read_summary' | 'read_margin';

/**
 * 정규화된 텍스트에서 상태 요약 키워드를 감지한다.
 * LLM 호출 없이 로컬에서 처리하기 위한 사전 분류.
 */
export function matchSummaryKeyword(normalized: string): SummaryAction | null {
  throw new Error('Not implemented');
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
  throw new Error('Not implemented');
}

/**
 * 마진율만 텍스트로 생성한다.
 * @param sheetType - 시트 타입
 * @param margin - 마진율 (%)
 */
export function buildMarginText(sheetType: string, margin: number): string {
  throw new Error('Not implemented');
}
