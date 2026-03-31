import { describe, it, expect } from 'vitest';
import { normalizeText, matchKeyword } from '@/lib/voice/keywordMatcher';

describe('normalizeText', () => {
  it('마침표/물음표/느낌표를 끝에서 제거한다', () => {
    expect(normalizeText('수정.')).toBe('수정');
    expect(normalizeText('그만?')).toBe('그만');
    expect(normalizeText('종료!')).toBe('종료');
    expect(normalizeText('수정\u3002')).toBe('수정');
  });

  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeText('  수정  ')).toBe('수정');
    expect(normalizeText(' 그만해 ')).toBe('그만해');
  });

  it('끝부분 공백+구두점 복합 케이스', () => {
    expect(normalizeText('수정. ')).toBe('수정');
    expect(normalizeText('그만해. ')).toBe('그만해');
  });

  it('중간 문자는 보존한다', () => {
    expect(normalizeText('바탕정리 재료비 500원으로')).toBe('바탕정리 재료비 500원으로');
  });

  it('빈 문자열', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText('  ')).toBe('');
  });
});

describe('matchKeyword', () => {
  describe('수정 모드 진입 (enter_edit)', () => {
    it('"수정" -> 시트 있고 수정 모드 아닐 때 enter_edit', () => {
      expect(matchKeyword('수정', false, true)).toBe('enter_edit');
    });

    it('"수정" -> 이미 수정 모드면 null (LLM 전달)', () => {
      expect(matchKeyword('수정', true, true)).toBeNull();
    });

    it('"수정" -> 시트 없으면 null (extract 모드)', () => {
      expect(matchKeyword('수정', false, false)).toBeNull();
    });

    it('"수정." (정규화 후) -> enter_edit', () => {
      // normalizeText 적용 후 전달되는 상황
      expect(matchKeyword('수정', false, true)).toBe('enter_edit');
    });
  });

  describe('수정 모드 종료 (exit_edit)', () => {
    it('"그만" -> exit_edit', () => {
      expect(matchKeyword('그만', false, true)).toBe('exit_edit');
    });

    it('"종료" -> exit_edit', () => {
      expect(matchKeyword('종료', false, true)).toBe('exit_edit');
    });

    it('"멈춰" -> exit_edit', () => {
      expect(matchKeyword('멈춰', false, true)).toBe('exit_edit');
    });

    it('"그만해" -> exit_edit (6자 이하 파생형)', () => {
      expect(matchKeyword('그만해', false, true)).toBe('exit_edit');
    });
  });

  describe('수정 확정 (confirm)', () => {
    it('"됐어" + 수정 모드 -> confirm', () => {
      expect(matchKeyword('됐어', true, true)).toBe('confirm');
    });

    it('"확인" + 수정 모드 -> confirm', () => {
      expect(matchKeyword('확인', true, true)).toBe('confirm');
    });

    it('"다음" + 수정 모드 -> confirm', () => {
      expect(matchKeyword('다음', true, true)).toBe('confirm');
    });

    it('"넘겨" + 수정 모드 -> confirm', () => {
      expect(matchKeyword('넘겨', true, true)).toBe('confirm');
    });

    it('"확인" + 수정 모드 아님 -> null', () => {
      expect(matchKeyword('확인', false, true)).toBeNull();
    });
  });

  describe('긴 문장은 LLM으로 전달', () => {
    it('7자 이상 문장은 null (LLM 전달)', () => {
      expect(matchKeyword('바탕정리 재료비 올려', false, true)).toBeNull();
    });

    it('"수정 모드 진입해줘" (7자 이상) -> null', () => {
      expect(matchKeyword('수정 모드 진입해줘', false, true)).toBeNull();
    });
  });
});
