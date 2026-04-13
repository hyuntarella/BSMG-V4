/**
 * 2모드 입력 시스템 타입 정의.
 *
 * - field: 현장 모드 (음성+눈)
 * - driving: 운전 모드 (음성만, TTS 전면)
 */

export type InputMode = 'field' | 'driving'

/** 모드별 라벨 (UI 표시용) */
export const INPUT_MODE_LABELS: Record<InputMode, string> = {
  field: '현장',
  driving: '운전',
}

/** 모드별 아이콘 이모지 (간이 표시용) */
export const INPUT_MODE_ICONS: Record<InputMode, string> = {
  field: '👁',
  driving: '🚗',
}

/** 모드별 기능 플래그 */
export interface InputModeFlags {
  /** 마이크 버튼 표시 여부 */
  showMicButton: boolean
  /** TTS 활성화 여부 */
  ttsEnabled: boolean
  /** 효과음 활성화 여부 */
  soundEffectsEnabled: boolean
  /** Web Speech API 사용 여부 */
  webSpeechEnabled: boolean
  /** Whisper 사용 여부 */
  whisperEnabled: boolean
}

/** 모드별 기능 플래그 매핑 */
export const INPUT_MODE_FLAGS: Record<InputMode, InputModeFlags> = {
  field: {
    showMicButton: true,
    ttsEnabled: false,
    soundEffectsEnabled: true,
    webSpeechEnabled: true,
    whisperEnabled: true,
  },
  driving: {
    showMicButton: true,
    ttsEnabled: true,
    soundEffectsEnabled: false,
    webSpeechEnabled: true,
    whisperEnabled: true,
  },
}
