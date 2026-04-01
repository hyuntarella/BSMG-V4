import type { VoiceStatus } from '@/hooks/useVoice';

/**
 * TTS/처리 완료 후 자동 재개 여부를 판단한다.
 * @deprecated 연속 녹음 모드에서는 사용되지 않음
 */
export function shouldAutoResume(
  prevStatus: VoiceStatus,
  currentStatus: VoiceStatus,
  isEditMode: boolean,
): boolean {
  const wasActive = prevStatus === 'processing'
  const isNowIdle = currentStatus === 'idle'
  return wasActive && isNowIdle && isEditMode
}

/**
 * 녹음 시작 가능 여부 판단.
 * @param currentStatus - 현재 voiceStatus
 * @returns true면 녹음 시작 가능
 */
export function canStartRecording(currentStatus: VoiceStatus): boolean {
  return currentStatus === 'idle'
}
