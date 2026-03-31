/**
 * 키워드 매칭 결과 액션
 * - 'enter_edit': 수정 모드 진입
 * - 'exit_edit': 수정 모드 종료
 * - 'confirm': 수정 확정 (됐어/확인)
 */
export type KeywordAction = 'enter_edit' | 'exit_edit' | 'confirm';

/**
 * STT 텍스트 정규화: trim + 끝부분 마침표/물음표/공백 제거
 */
export function normalizeText(raw: string): string {
  throw new Error('Not implemented');
}

/**
 * 정규화된 텍스트에서 키워드 감지 -> 액션 반환
 * @param normalized - normalizeText()로 정규화된 텍스트
 * @param isEditMode - 현재 수정 모드 여부
 * @param hasSheets - 시트가 1개 이상 존재하는지
 * @returns 매칭된 액션 또는 null (LLM으로 전달)
 */
export function matchKeyword(
  normalized: string,
  isEditMode: boolean,
  hasSheets: boolean,
): KeywordAction | null {
  throw new Error('Not implemented');
}
