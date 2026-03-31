import type { VoiceStatus } from '@/hooks/useVoice';

/**
 * TTS/처리 완료 후 자동 재개 여부를 판단한다.
 * @param prevStatus - 직전 voiceStatus
 * @param currentStatus - 현재 voiceStatus
 * @param isEditMode - 수정 모드 활성 여부
 * @returns true면 AUTO_RESUME_DELAY 후 startRecording 호출
 */
export function shouldAutoResume(
  prevStatus: VoiceStatus,
  currentStatus: VoiceStatus,
  isEditMode: boolean,
): boolean {
  const wasActiveStatus = prevStatus === 'speaking' || prevStatus === 'processing'
  const isNowIdle = currentStatus === 'idle'
  return wasActiveStatus && isNowIdle && isEditMode
}

/**
 * 녹음 시작 가능 여부 판단.
 * TTS 재생 중이거나 이미 녹음 중이면 false.
 * @param currentStatus - 현재 voiceStatus
 * @returns true면 녹음 시작 가능
 */
export function canStartRecording(currentStatus: VoiceStatus): boolean {
  return currentStatus === 'idle'
}
