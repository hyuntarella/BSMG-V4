import { describe, it, expect } from 'vitest';
import {
  rmsToDb,
  isSilent,
  shouldStopByVad,
  shouldEnableVad,
  VAD_SILENCE_THRESHOLD_DB,
  VAD_SILENCE_DURATION_MS,
} from '@/lib/voice/vadLogic';

describe('rmsToDb', () => {
  it('무음 (모든 샘플 0) → 매우 낮은 dB', () => {
    const samples = new Float32Array(1024).fill(0);
    const db = rmsToDb(samples);
    expect(db).toBeLessThan(-90);
  });

  it('최대 볼륨 (모든 샘플 1.0) → 0 dB', () => {
    const samples = new Float32Array(1024).fill(1.0);
    const db = rmsToDb(samples);
    expect(db).toBeCloseTo(0, 1);
  });

  it('중간 볼륨 (모든 샘플 0.1) → 약 -20 dB', () => {
    const samples = new Float32Array(1024).fill(0.1);
    const db = rmsToDb(samples);
    expect(db).toBeCloseTo(-20, 1);
  });

  it('작은 볼륨 (모든 샘플 0.01) → 약 -40 dB', () => {
    const samples = new Float32Array(1024).fill(0.01);
    const db = rmsToDb(samples);
    expect(db).toBeCloseTo(-40, 1);
  });
});

describe('isSilent', () => {
  it('-40 dB < 기본 임계값(-35) → true (무음)', () => {
    expect(isSilent(-40)).toBe(true);
  });

  it('-30 dB > 기본 임계값(-35) → false (소리 있음)', () => {
    expect(isSilent(-30)).toBe(false);
  });

  it('-35 dB = 기본 임계값 → false (경계값: 미만이 아님)', () => {
    expect(isSilent(-35)).toBe(false);
  });

  it('커스텀 임계값 사용', () => {
    expect(isSilent(-25, -20)).toBe(true);
    expect(isSilent(-15, -20)).toBe(false);
  });
});

describe('shouldStopByVad', () => {
  it('무음 시작 null → false (아직 무음 아님)', () => {
    expect(shouldStopByVad(null, 10000)).toBe(false);
  });

  it('무음 4초 → false (5초 미만)', () => {
    expect(shouldStopByVad(1000, 5000)).toBe(false);
  });

  it('무음 정확히 5초 → true', () => {
    expect(shouldStopByVad(1000, 6000)).toBe(true);
  });

  it('무음 6초 → true', () => {
    expect(shouldStopByVad(1000, 7000)).toBe(true);
  });

  it('커스텀 지속시간 3초', () => {
    expect(shouldStopByVad(1000, 3500, 3000)).toBe(false);
    expect(shouldStopByVad(1000, 4000, 3000)).toBe(true);
  });
});

describe('shouldEnableVad', () => {
  it('수정 모드 + VAD 켜짐 + recording → true', () => {
    expect(shouldEnableVad(true, true, 'recording')).toBe(true);
  });

  it('수정 모드 아님 → false', () => {
    expect(shouldEnableVad(false, true, 'recording')).toBe(false);
  });

  it('VAD 꺼짐 → false', () => {
    expect(shouldEnableVad(true, false, 'recording')).toBe(false);
  });

  it('idle 상태 → false', () => {
    expect(shouldEnableVad(true, true, 'idle')).toBe(false);
  });

  it('processing 상태 → false', () => {
    expect(shouldEnableVad(true, true, 'processing')).toBe(false);
  });
});
