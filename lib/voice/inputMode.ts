/**
 * 3모드 입력 시스템 타입 정의.
 *
 * - office: 사무실 모드 (타이핑)
 * - field: 현장 모드 (음성+눈)
 * - driving: 운전 모드 (음성만, TTS 전면)
 */

export type InputMode = 'office' | 'field' | 'driving'

/** 모드별 라벨 (UI 표시용) */
export const INPUT_MODE_LABELS: Record<InputMode, string> = {
  office: '사무실',
  field: '현장',
  driving: '운전',
}

/** 모드별 아이콘 이모지 (간이 표시용) */
export const INPUT_MODE_ICONS: Record<InputMode, string> = {
  office: '⌨',
  field: '👁',
  driving: '🚗',
}

/** 모드별 기능 플래그 */
export interface InputModeFlags {
  /** 텍스트 입력창 표시 여부 */
  showTextInput: boolean
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
  office: {
    showTextInput: true,
    showMicButton: false,
    ttsEnabled: false,
    soundEffectsEnabled: false,
    webSpeechEnabled: false,
    whisperEnabled: false,
  },
  field: {
    showTextInput: false,
    showMicButton: true,
    ttsEnabled: false,
    soundEffectsEnabled: true,
    webSpeechEnabled: true,
    whisperEnabled: true,
  },
  driving: {
    showTextInput: false,
    showMicButton: true,
    ttsEnabled: true,
    soundEffectsEnabled: false,
    webSpeechEnabled: true,
    whisperEnabled: true,
  },
}
