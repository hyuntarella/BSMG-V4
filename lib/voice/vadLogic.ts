import type { VoiceStatus } from '@/hooks/useVoice';

/** VAD 기본 상수 */
export const VAD_SILENCE_THRESHOLD_DB = -35;
export const VAD_SILENCE_DURATION_MS = 5000;

/**
 * Float32Array 오디오 샘플에서 RMS를 계산하고 dB로 변환한다.
 * @param samples - AnalyserNode.getFloatTimeDomainData() 결과
 * @returns dB 값 (무음에 가까울수록 음수가 큼)
 */
export function rmsToDb(samples: Float32Array): number {
  throw new Error('Not implemented');
}

/**
 * dB 값이 무음 임계값 미만인지 판단한다.
 * @param db - rmsToDb() 결과
 * @param threshold - 임계값 (기본 VAD_SILENCE_THRESHOLD_DB)
 */
export function isSilent(db: number, threshold?: number): boolean {
  throw new Error('Not implemented');
}

/**
 * 무음 지속 시간이 임계값을 초과했는지 판단한다.
 * @param silenceStartMs - 무음 시작 타임스탬프 (ms). null이면 아직 무음 시작 안 됨
 * @param nowMs - 현재 타임스탬프 (ms)
 * @param durationMs - 무음 지속 임계값 (기본 VAD_SILENCE_DURATION_MS)
 */
export function shouldStopByVad(
  silenceStartMs: number | null,
  nowMs: number,
  durationMs?: number,
): boolean {
  throw new Error('Not implemented');
}

/**
 * VAD를 활성화해야 하는지 판단한다.
 * @param isEditMode - 수정 모드 활성 여부
 * @param enableVad - VAD feature flag
 * @param voiceStatus - 현재 음성 상태
 */
export function shouldEnableVad(
  isEditMode: boolean,
  enableVad: boolean,
  voiceStatus: VoiceStatus,
): boolean {
  throw new Error('Not implemented');
}
