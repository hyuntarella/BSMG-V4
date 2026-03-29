/**
 * 음성 가이드 플로우 상태 기계
 *
 * "견적" → 전체 필드 한 번에 파싱 시도 → 빈 것만 물어봄
 * 한 문장에 4개 다 말하면 즉시 생성
 */

export type FlowStep =
  | 'idle'
  | 'collecting_area'
  | 'collecting_wall'
  | 'collecting_complex_ppp'
  | 'collecting_urethane_ppp'
  | 'generating'
  | 'done'

export interface FlowState {
  step: FlowStep
  area: number | null
  wallM2: number | null
  complexPpp: number | null
  urethanePpp: number | null
}

export interface FlowStepConfig {
  ttsPrompt: string
  parseField: keyof Omit<FlowState, 'step'>
  nextStep: FlowStep
}

export const FLOW_STEPS: Record<string, FlowStepConfig> = {
  collecting_area: {
    ttsPrompt: '면적을 말씀해주세요.',
    parseField: 'area',
    nextStep: 'collecting_wall',
  },
  collecting_wall: {
    ttsPrompt: '벽체 면적은요? 없으면 없다고.',
    parseField: 'wallM2',
    nextStep: 'collecting_complex_ppp',
  },
  collecting_complex_ppp: {
    ttsPrompt: '복합 평단가는요?',
    parseField: 'complexPpp',
    nextStep: 'collecting_urethane_ppp',
  },
  collecting_urethane_ppp: {
    ttsPrompt: '우레탄 평단가는요?',
    parseField: 'urethanePpp',
    nextStep: 'generating',
  },
}

/** 필드 순서 */
const FIELD_ORDER: FlowStep[] = [
  'collecting_area',
  'collecting_wall',
  'collecting_complex_ppp',
  'collecting_urethane_ppp',
]

/** 마디 종료 단어 감지 */
export function isAdvanceCommand(text: string): boolean {
  const t = text.trim()
  // "됐어"가 단독이거나 문장 끝에만 있을 때
  return /^(됐어|넘겨|다음|됐습니다|넘어가)$/.test(t)
}

/** 취소 단어 감지 */
export function isCancelCommand(text: string): boolean {
  const triggers = ['그만', '취소', '중지', '멈춰']
  // "아 됐어"는 취소
  if (/아\s*됐어/.test(text)) return true
  return triggers.some(t => text.includes(t))
}

/** 웨이크워드 감지 */
export function isWakeWord(text: string): boolean {
  return text.includes('견적')
}

/** 초기 상태 */
export function createInitialFlowState(): FlowState {
  return {
    step: 'idle',
    area: null,
    wallM2: null,
    complexPpp: null,
    urethanePpp: null,
  }
}

/**
 * 한 문장에서 모든 필드를 한 번에 파싱
 * "187헤베 벽체 37미터 복합 35000 우레탄 31000" → 4개 다 채움
 */
export function parseAllFields(
  text: string,
  currentState: FlowState,
): Partial<Omit<FlowState, 'step'>> {
  const result: Partial<Omit<FlowState, 'step'>> = {}
  const cleaned = text.replace(/,/g, '').replace(/원/g, '')

  // 면적: "187헤베", "50평", "187제곱미터"
  if (currentState.area === null) {
    const hebeMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:헤베|㎡|제곱미터|m2)/i)
    const pyeongMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*평(?:단가|당)?/)
    // 평단가/평당은 평이 아님
    const purePyeong = cleaned.match(/(\d+(?:\.\d+)?)\s*평(?![단당])/)

    if (hebeMatch) {
      result.area = parseFloat(hebeMatch[1])
    } else if (purePyeong) {
      result.area = Math.round(parseFloat(purePyeong[1]) * 3.306 * 10) / 10
    }
  }

  // 벽체: "벽체 37미터", "벽체 37헤베", "벽체 없어"
  if (currentState.wallM2 === null) {
    const wallMatch = cleaned.match(/(?:벽체|벽)\s*(?:면적)?\s*(\d+(?:\.\d+)?)\s*(?:미터|헤베|m|㎡)?/)
    const wallNone = /(?:벽체|벽)\s*(?:면적)?\s*없/.test(cleaned)
    if (wallNone) {
      result.wallM2 = 0
    } else if (wallMatch) {
      result.wallM2 = parseFloat(wallMatch[1])
    }
  }

  // 복합 평단가: "복합 35000", "복합 3만5천"
  if (currentState.complexPpp === null) {
    const complexMatch = cleaned.match(/복합\s*(?:평단가\s*)?(\d+(?:\.\d+)?)/)
    const complexKorean = cleaned.match(/복합\s*(?:평단가\s*)?(\d+만\d*천?)/)
    const complexMargin = cleaned.match(/복합\s*마진\s*(\d+)/)

    if (complexMargin) {
      result.complexPpp = -parseInt(complexMargin[1]) // 마진은 음수로 표시, 나중에 변환
    } else if (complexKorean) {
      const v = parseKoreanNumber(complexKorean[1])
      if (v) result.complexPpp = v
    } else if (complexMatch) {
      result.complexPpp = parseFloat(complexMatch[1])
    }
  }

  // 우레탄 평단가: "우레탄 31000", "우레탄 3만1천"
  if (currentState.urethanePpp === null) {
    const urethaneMatch = cleaned.match(/우레탄\s*(?:평단가\s*)?(\d+(?:\.\d+)?)/)
    const urethaneKorean = cleaned.match(/우레탄\s*(?:평단가\s*)?(\d+만\d*천?)/)
    const urethaneMargin = cleaned.match(/우레탄\s*마진\s*(\d+)/)

    if (urethaneMargin) {
      result.urethanePpp = -parseInt(urethaneMargin[1])
    } else if (urethaneKorean) {
      const v = parseKoreanNumber(urethaneKorean[1])
      if (v) result.urethanePpp = v
    } else if (urethaneMatch) {
      result.urethanePpp = parseFloat(urethaneMatch[1])
    }
  }

  return result
}

/** 현재 상태에서 첫 번째 빈 필드의 step 반환. 다 채워져 있으면 'generating' */
export function getNextEmptyStep(state: FlowState): FlowStep {
  if (state.area === null) return 'collecting_area'
  if (state.wallM2 === null) return 'collecting_wall'
  if (state.complexPpp === null) return 'collecting_complex_ppp'
  if (state.urethanePpp === null) return 'collecting_urethane_ppp'
  return 'generating'
}

/**
 * 단일 필드 파싱 (특정 단계에서 하나만 물어볼 때)
 */
export function parseFlowInput(
  text: string,
  field: keyof Omit<FlowState, 'step'>,
): { value: number; type: 'absolute' | 'margin' } | null {
  const cleaned = text.replace(/\s+/g, '').replace(/,/g, '').replace(/원/g, '')

  // "없어", "없다"
  if (/없/.test(cleaned)) {
    return { value: 0, type: 'absolute' }
  }

  // 마진 기반
  const marginMatch = cleaned.match(/마진\s*(\d+)/)
  if (marginMatch && (field === 'complexPpp' || field === 'urethanePpp')) {
    return { value: parseInt(marginMatch[1]), type: 'margin' }
  }

  // 평 → m²
  if (field === 'area') {
    const pyeongMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*평/)
    if (pyeongMatch) {
      return { value: Math.round(parseFloat(pyeongMatch[1]) * 3.306 * 10) / 10, type: 'absolute' }
    }
  }

  // 헤베
  const hebeMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:헤베|㎡|제곱미터|m2|미터)/i)
  if (hebeMatch) {
    return { value: parseFloat(hebeMatch[1]), type: 'absolute' }
  }

  // 한국어 숫자
  const koreanNum = parseKoreanNumber(cleaned)
  if (koreanNum !== null) {
    return { value: koreanNum, type: 'absolute' }
  }

  // 순수 숫자
  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/)
  if (numMatch) {
    return { value: parseFloat(numMatch[1]), type: 'absolute' }
  }

  return null
}

/**
 * 한국어 숫자 파싱
 */
export function parseKoreanNumber(text: string): number | null {
  // "3만5천" 같은 혼합 표기
  const mixedMatch = text.match(/(\d+)\s*만\s*(\d+)?\s*천?/)
  if (mixedMatch) {
    const man = parseInt(mixedMatch[1]) * 10000
    const rest = mixedMatch[2] ? parseInt(mixedMatch[2]) * 1000 : 0
    return man + rest
  }

  // "만이천" = 12000
  if (text.includes('만')) {
    const parts = text.split('만')
    const upper = parseSimpleKorean(parts[0]) || 1
    const lower = parseSimpleKorean(parts[1]) || 0
    return upper * 10000 + lower
  }

  return parseSimpleKorean(text)
}

function parseSimpleKorean(text: string): number | null {
  if (!text) return null

  const map: Record<string, number> = {
    '일': 1, '이': 2, '삼': 3, '사': 4, '오': 5,
    '육': 6, '칠': 7, '팔': 8, '구': 9,
  }

  let result = 0
  let current = 0

  for (const char of text) {
    if (map[char]) {
      current = map[char]
    } else if (char === '천') {
      result += (current || 1) * 1000
      current = 0
    } else if (char === '백') {
      result += (current || 1) * 100
      current = 0
    } else if (char === '십') {
      result += (current || 1) * 10
      current = 0
    }
  }

  result += current
  return result > 0 ? result : null
}

/** TTS 피드백 텍스트 생성 */
export function getApplyFeedback(field: string, value: number): string {
  switch (field) {
    case 'area':
      return `면적 ${value}제곱미터.`
    case 'wallM2':
      return value > 0 ? `벽체 ${value}미터.` : '벽체 없음.'
    case 'complexPpp':
      return `복합 ${Math.round(value).toLocaleString()}원.`
    case 'urethanePpp':
      return `우레탄 ${Math.round(value).toLocaleString()}원.`
    default:
      return '반영.'
  }
}
