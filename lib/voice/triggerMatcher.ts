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

// ── 빠른 교정 루프 ──

export interface CorrectionResult {
  type: 'undo_only' | 'undo_and_replace_value' | 'undo_and_replace_field'
  newValue?: number
  newField?: string
}

const FIELD_NAMES: Record<string, string> = {
  '재료비': 'mat', '재료': 'mat', '자재': 'mat',
  '노무비': 'labor', '노무': 'labor', '인건비': 'labor',
  '경비': 'exp', '단가': 'mat', '수량': 'qty',
}

/**
 * "아니" 계열 교정 명령을 감지한다.
 * "아니" / "아니야" / "아닌데" → 직전 명령 취소
 * "아니 600원" → 취소 + 새 값
 * "아니 재료비" → 취소 + 필드 변경
 * "X 아니고 Y" → 취소 + 새 값
 */
export function detectCorrection(text: string): CorrectionResult | null {
  const trimmed = text.trim()

  // "X 아니고 Y" pattern (아니로 시작하지 않을 수 있으므로 먼저 체크)
  const anigoMatch = trimmed.match(/(\d[\d,]*)\s*(?:원|만원|만)?\s*아니고\s*(\d[\d,]*)\s*(원|만원|만)?/)
  if (anigoMatch) {
    let val = parseInt(anigoMatch[2].replace(/,/g, ''))
    if (anigoMatch[3] === '만원' || anigoMatch[3] === '만') val *= 10000
    return { type: 'undo_and_replace_value', newValue: val }
  }

  // 이하 "아니"로 시작해야 함
  if (!/^(?:아니|아니야|아닌데|취소)/.test(trimmed)) return null

  // "취소" alone → undo
  if (trimmed === '취소') return { type: 'undo_only' }

  const afterNi = trimmed.replace(/^(?:아니야|아닌데|아니)\s*/, '').trim()

  // "아니" alone → just undo
  if (!afterNi) return { type: 'undo_only' }

  // "아니 600원" / "아니 600" → undo + new value
  const numMatch = afterNi.match(/^(\d[\d,]*)\s*(원|만원|만)?/)
  if (numMatch) {
    const val = parseInt(numMatch[1].replace(/,/g, ''))
    const unit = numMatch[2]
    let finalVal = val
    if (unit === '만원' || unit === '만') finalVal = val * 10000
    return { type: 'undo_and_replace_value', newValue: finalVal }
  }

  // "아니 재료비" / "아니 노무비" → undo + field change
  if (FIELD_NAMES[afterNi]) {
    return { type: 'undo_and_replace_field', newField: FIELD_NAMES[afterNi] }
  }

  return null
}
