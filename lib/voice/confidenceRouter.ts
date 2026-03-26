/**
 * 3단계 확신도 분기
 *
 * [95%+]  즉시실행 → 결과만 TTS
 * [70-95%] 즉시실행 → 결과 + "맞습니까?" TTS
 * [70%-]  미실행 → 되묻기 TTS
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ConfidenceResult {
  level: ConfidenceLevel
  shouldExecute: boolean
  shouldConfirm: boolean
  shouldAsk: boolean
}

const HIGH_THRESHOLD = 0.95
const LOW_THRESHOLD = 0.70

export function routeConfidence(confidence: number): ConfidenceResult {
  if (confidence >= HIGH_THRESHOLD) {
    return {
      level: 'high',
      shouldExecute: true,
      shouldConfirm: false,
      shouldAsk: false,
    }
  }

  if (confidence >= LOW_THRESHOLD) {
    return {
      level: 'medium',
      shouldExecute: true,
      shouldConfirm: true,
      shouldAsk: false,
    }
  }

  return {
    level: 'low',
    shouldExecute: false,
    shouldConfirm: false,
    shouldAsk: true,
  }
}

/**
 * 명령 배열에서 가장 낮은 확신도 기준으로 분기
 */
export function routeCommands(
  commands: Array<{ confidence: number }>
): ConfidenceResult {
  if (commands.length === 0) {
    return { level: 'low', shouldExecute: false, shouldConfirm: false, shouldAsk: true }
  }

  const minConfidence = Math.min(...commands.map(c => c.confidence))
  return routeConfidence(minConfidence)
}
