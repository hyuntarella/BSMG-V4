/**
 * 트리거 단어 매칭 — 한국어 종결 어미 전체 감지
 * STT 텍스트 끝부분에서 종결 어미를 찾아 실행 트리거로 사용.
 */

/** "넣어" 계열 트리거 (기존 호환) */
const TRIGGER_PATTERNS = /(?:넣어|너어|넣은|넣을|너를|넣자|넣어줘|넣어라)\s*[.?!。？！]*\s*$/

/** 한국어 종결 어미 전체 패턴 (실행 트리거) */
const ENDING_TRIGGER = /(?:넣어|바꿔|해줘?|올려|내려|빼|추가|수정|맞춰|변경|삭제|제거)(?:줘|라|봐)?[.!?]?\s*$/

/** "으로" 종결 (의도 완결: "500원으로") */
const ABSOLUTE_ENDING = /\d[\d,.]*\s*(?:원|만원|만)?\s*으로\s*[.!?]?\s*$/

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
 * 텍스트 끝에 종결 어미가 있는지 검사한다 (확장된 전체 패턴).
 * "넣어", "바꿔줘", "올려", "빼", "추가해줘", "500원으로" 등.
 */
export function hasEndingTrigger(text: string): boolean {
  const trimmed = text.trim()
  return ENDING_TRIGGER.test(trimmed) || ABSOLUTE_ENDING.test(trimmed)
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
