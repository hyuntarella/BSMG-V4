/**
 * 이상치 감지 — 순수 함수.
 * 단가/면적 등 입력값의 이상 여부를 판단.
 */

import type { VoiceCommand } from '@/lib/voice/commands'

/** 이상치 감지 결과 */
export interface AnomalyResult {
  /** 이상치 여부 */
  isAnomaly: boolean
  /** 경고 메시지 (한국어) */
  message: string
  /** 경고 수준 */
  level: 'warning' | 'critical'
}

/** 장비류 공종명 */
const EQUIPMENT_NAMES = ['사다리차', '스카이차', '폐기물처리']

/**
 * 명령의 이상치를 감지한다.
 *
 * 규칙:
 * 1. 단가 10원 미만 → 경고
 * 2. 단가 100만원 이상 (장비 아닌 공종) → 경고
 * 3. 면적 1000㎡ 이상 → 경고
 * 4. 이전값 대비 10배 이상 변동 → 경고
 */
export function detectAnomaly(
  command: VoiceCommand,
  prevValue?: number,
): AnomalyResult {
  const noAnomaly: AnomalyResult = { isAnomaly: false, message: '', level: 'warning' }

  // update_item 액션만 검사
  if (command.action !== 'update_item') return noAnomaly

  const field = command.field
  const newValue = command.value ?? (prevValue !== undefined && command.delta !== undefined
    ? prevValue + command.delta
    : undefined)

  if (newValue === undefined || field === 'qty' || field === 'spec') return noAnomaly

  // 규칙 1: 단가 10원 미만
  if (newValue > 0 && newValue < 10) {
    return {
      isAnomaly: true,
      message: `${newValue}원이요? 확인해주세요.`,
      level: 'warning',
    }
  }

  // 규칙 2: 단가 100만원 이상 (장비 제외)
  const isEquipment = command.target
    ? EQUIPMENT_NAMES.some(eq => command.target!.includes(eq))
    : false
  if (!isEquipment && newValue >= 1_000_000) {
    return {
      isAnomaly: true,
      message: `${(newValue / 10000).toFixed(0)}만원이요? 확인해주세요.`,
      level: 'warning',
    }
  }

  // 규칙 4: 이전값 대비 10배 이상 변동
  if (prevValue !== undefined && prevValue > 0) {
    const ratio = newValue / prevValue
    if (ratio >= 10 || ratio <= 0.1) {
      return {
        isAnomaly: true,
        message: `${prevValue}원에서 ${newValue}원으로 ${ratio >= 10 ? '크게 증가' : '크게 감소'}. 확인해주세요.`,
        level: 'warning',
      }
    }
  }

  return noAnomaly
}

/**
 * 면적 이상치 감지.
 * 규칙 3: 면적 1000㎡ 이상 → 경고
 */
export function detectAreaAnomaly(m2: number): AnomalyResult {
  if (m2 >= 1000) {
    return {
      isAnomaly: true,
      message: `면적 ${m2}㎡? 확인해주세요.`,
      level: 'warning',
    }
  }
  return { isAnomaly: false, message: '', level: 'warning' }
}
