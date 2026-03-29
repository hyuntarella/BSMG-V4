/**
 * 음성 가이드 플로우 상태 기계
 *
 * idle → "견적" → collecting_area → "됐어" → TTS → 2초 →
 * collecting_wall → "됐어" → TTS → 2초 →
 * collecting_complex_ppp → "됐어" → TTS → 2초 →
 * collecting_urethane_ppp → "됐어" → TTS → generating → done
 *
 * 어느 단계든 "그만" → idle (취소)
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
    ttsPrompt: '면적을 말씀해주세요. 헤베 또는 평으로.',
    parseField: 'area',
    nextStep: 'collecting_wall',
  },
  collecting_wall: {
    ttsPrompt: '벽체 면적을 말씀해주세요. 없으면 없다고 하세요.',
    parseField: 'wallM2',
    nextStep: 'collecting_complex_ppp',
  },
  collecting_complex_ppp: {
    ttsPrompt: '복합 평단가를 말씀해주세요. 마진율로도 가능합니다.',
    parseField: 'complexPpp',
    nextStep: 'collecting_urethane_ppp',
  },
  collecting_urethane_ppp: {
    ttsPrompt: '우레탄 평단가를 말씀해주세요.',
    parseField: 'urethanePpp',
    nextStep: 'generating',
  },
}

/** 마디 종료 단어 감지 */
export function isAdvanceCommand(text: string): boolean {
  const triggers = ['됐어', '넘겨', '다음', '됐습니다', '넘어가']
  return triggers.some(t => text.includes(t))
}

/** 취소 단어 감지 */
export function isCancelCommand(text: string): boolean {
  const triggers = ['그만', '취소', '중지', '멈춰', '아 됐어']
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
 * STT 텍스트에서 숫자 파싱
 * "150헤베" → 150, "50평" → 165.3, "3만5천" → 35000
 * "없어" / "없다" → 0
 * "마진 50%" → { type: 'margin', value: 50 }
 */
export function parseFlowInput(
  text: string,
  field: keyof Omit<FlowState, 'step'>,
): { value: number; type: 'absolute' | 'margin' } | null {
  const cleaned = text.replace(/\s+/g, '')

  // "없어", "없다", "없음"
  if (/없/.test(cleaned)) {
    return { value: 0, type: 'absolute' }
  }

  // 마진 기반: "마진 50%", "마진 50에 맞춰줘"
  const marginMatch = cleaned.match(/마진\s*(\d+)/)
  if (marginMatch && (field === 'complexPpp' || field === 'urethanePpp')) {
    return { value: parseInt(marginMatch[1]), type: 'margin' }
  }

  // 평 → m² 변환
  const pyeongMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*평/)
  if (pyeongMatch && field === 'area') {
    return { value: Math.round(parseFloat(pyeongMatch[1]) * 3.306 * 10) / 10, type: 'absolute' }
  }

  // 헤베 → 그대로
  const hebeMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:헤베|㎡|제곱미터|m2)/)
  if (hebeMatch) {
    return { value: parseFloat(hebeMatch[1]), type: 'absolute' }
  }

  // 한국어 숫자: "3만5천" → 35000
  const koreanNum = parseKoreanNumber(cleaned)
  if (koreanNum !== null) {
    return { value: koreanNum, type: 'absolute' }
  }

  // 순수 숫자
  const numMatch = cleaned.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/)
  if (numMatch) {
    return { value: parseFloat(numMatch[1].replace(/,/g, '')), type: 'absolute' }
  }

  return null
}

/**
 * 한국어 숫자 파싱
 * "삼만오천" → 35000, "만이천" → 12000, "오백" → 500
 */
function parseKoreanNumber(text: string): number | null {
  const digitMap: Record<string, number> = {
    '영': 0, '일': 1, '이': 2, '삼': 3, '사': 4,
    '오': 5, '육': 6, '칠': 7, '팔': 8, '구': 9,
    '십': 10, '백': 100, '천': 1000, '만': 10000, '억': 100000000,
  }

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
      return `면적 ${value}제곱미터 반영.`
    case 'wallM2':
      return value > 0 ? `벽체 ${value}미터 반영.` : '벽체 없음 반영.'
    case 'complexPpp':
      return `복합 평단가 ${Math.round(value).toLocaleString()}원 반영.`
    case 'urethanePpp':
      return `우레탄 평단가 ${Math.round(value).toLocaleString()}원 반영.`
    default:
      return '반영 완료.'
  }
}
