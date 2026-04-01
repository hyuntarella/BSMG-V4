import { describe, it, expect } from 'vitest';
import { shouldAutoResume, canStartRecording } from '@/lib/voice/autoResumeLogic';

describe('shouldAutoResume', () => {
  describe('자동 재개 조건 충족', () => {
    it('processing → idle + 수정 모드 → true', () => {
      expect(shouldAutoResume('processing', 'idle', true)).toBe(true);
    });
  });

  describe('자동 재개 조건 미충족', () => {
    it('processing → idle + 수정 모드 아님 → false', () => {
      expect(shouldAutoResume('processing', 'idle', false)).toBe(false);
    });

    it('idle → idle → false (상태 변화 없음)', () => {
      expect(shouldAutoResume('idle', 'idle', true)).toBe(false);
    });

    it('idle → recording → false', () => {
      expect(shouldAutoResume('idle', 'recording', true)).toBe(false);
    });

    it('recording → idle + 수정 모드 → false (녹음 종료는 자동 재개 아님)', () => {
      expect(shouldAutoResume('recording', 'idle', true)).toBe(false);
    });
  });
});

describe('canStartRecording', () => {
  it('idle → true (녹음 시작 가능)', () => {
    expect(canStartRecording('idle')).toBe(true);
  });

  it('recording → false (이미 녹음 중)', () => {
    expect(canStartRecording('recording')).toBe(false);
  });

  it('processing → false (처리 중)', () => {
    expect(canStartRecording('processing')).toBe(false);
  });
});
