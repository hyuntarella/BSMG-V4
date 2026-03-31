import { describe, it, expect } from 'vitest';
import { matchSummaryKeyword, buildSummaryText, buildMarginText } from '@/lib/voice/summaryBuilder';

describe('matchSummaryKeyword', () => {
  describe('read_summary 매칭', () => {
    it('"현재 상태" → read_summary', () => {
      expect(matchSummaryKeyword('현재 상태')).toBe('read_summary');
    });

    it('"현재상태" (공백 없음) → read_summary', () => {
      expect(matchSummaryKeyword('현재상태')).toBe('read_summary');
    });

    it('"상태 알려줘" → read_summary', () => {
      expect(matchSummaryKeyword('상태 알려줘')).toBe('read_summary');
    });

    it('"상태알려" → read_summary', () => {
      expect(matchSummaryKeyword('상태알려')).toBe('read_summary');
    });

    it('"요약" → read_summary', () => {
      expect(matchSummaryKeyword('요약')).toBe('read_summary');
    });

    it('"현재 상태 알려줘" → read_summary', () => {
      expect(matchSummaryKeyword('현재 상태 알려줘')).toBe('read_summary');
    });
  });

  describe('read_margin 매칭', () => {
    it('"마진 얼마" → read_margin', () => {
      expect(matchSummaryKeyword('마진 얼마')).toBe('read_margin');
    });

    it('"마진얼마" → read_margin', () => {
      expect(matchSummaryKeyword('마진얼마')).toBe('read_margin');
    });

    it('"마진" (단독) → read_margin', () => {
      expect(matchSummaryKeyword('마진')).toBe('read_margin');
    });

    it('"마진 얼마야" → read_margin', () => {
      expect(matchSummaryKeyword('마진 얼마야')).toBe('read_margin');
    });
  });

  describe('매칭 안 됨', () => {
    it('"바탕정리 재료비 올려" → null', () => {
      expect(matchSummaryKeyword('바탕정리 재료비 올려')).toBeNull();
    });

    it('"수정" → null', () => {
      expect(matchSummaryKeyword('수정')).toBeNull();
    });

    it('"저장해줘" → null', () => {
      expect(matchSummaryKeyword('저장해줘')).toBeNull();
    });

    it('빈 문자열 → null', () => {
      expect(matchSummaryKeyword('')).toBeNull();
    });
  });
});

describe('buildSummaryText', () => {
  it('기본 요약 텍스트 생성', () => {
    const result = buildSummaryText('복합', 150, 10, 5800000, 52);
    expect(result).toContain('복합');
    expect(result).toContain('150');
    expect(result).toContain('10');
    expect(result).toContain('580만원');
    expect(result).toContain('52퍼센트');
  });

  it('총액 0원', () => {
    const result = buildSummaryText('우레탄', 100, 0, 0, 0);
    expect(result).toContain('우레탄');
    expect(result).toContain('0만원');
    expect(result).toContain('0퍼센트');
  });

  it('총액 반올림 (만원 단위)', () => {
    // 3,945,000 → 395만원 (Math.round)
    const result = buildSummaryText('복합', 100, 5, 3945000, 48);
    expect(result).toContain('395만원');
  });

  it('마진 소수점 반올림', () => {
    const result = buildSummaryText('복합', 150, 10, 5800000, 52.7);
    expect(result).toContain('53퍼센트');
  });
});

describe('buildMarginText', () => {
  it('기본 마진 텍스트 생성', () => {
    const result = buildMarginText('복합', 52);
    expect(result).toContain('복합');
    expect(result).toContain('52퍼센트');
  });

  it('소수점 반올림', () => {
    const result = buildMarginText('우레탄', 48.3);
    expect(result).toContain('48퍼센트');
  });
});
