/**
 * 트리거 단어 매칭 — "넣어" 및 유사 발음 감지
 * STT 텍스트 끝부분에서 트리거 단어를 찾아 제거하고 나머지를 반환한다.
 */

/** 트리거 단어 및 유사 발음 패턴 */
const TRIGGER_PATTERNS = /(?:넣어|너어|넣은|넣을|너를|넣자|넣어줘|넣어라)\s*[.?!。？！]*\s*$/

/** 종료 단어 패턴 */
const STOP_PATTERNS = /^(?:됐어|끝|그만|종료|멈춰|끝내)[.?!。？！]*$/

/**
 * 텍스트 끝에 트리거 단어("넣어" 등)가 있는지 검사한다.
 * @param text - STT 결과 텍스트
 * @returns 트리거 매칭 여부
 */
export function hasTriggerWord(text: string): boolean {
  return TRIGGER_PATTERNS.test(text.trim())
}

/**
 * 트리거 단어를 제거하고 나머지 텍스트를 반환한다.
 * @param text - STT 결과 텍스트
 * @returns 트리거 단어가 제거된 텍스트
 */
export function removeTriggerWord(text: string): string {
  return text.trim().replace(TRIGGER_PATTERNS, '').trim()
}

/**
 * 종료 단어("됐어", "끝" 등)인지 검사한다.
 * @param text - STT 결과 텍스트 (정규화된)
 * @returns 종료 신호 여부
 */
export function isStopWord(text: string): boolean {
  return STOP_PATTERNS.test(text.trim())
}
