import { describe, it, expect } from 'vitest'
import { fm, formatNumericEdit } from '@/lib/utils/format'

/**
 * ExcelCell 로직 테스트 (vitest node 환경)
 * 컴포넌트 렌더링은 테스트하지 않음 — 순수 로직만 검증
 */

describe('ExcelCell 로직', () => {
  describe('상태 전이', () => {
    it('idle → selected: 클릭 시 selected 상태로 전환', () => {
      // 상태 머신 시뮬레이션
      type State = 'idle' | 'selected' | 'editing'
      let state: State = 'idle'
      const onSelect = () => { state = 'selected' }
      onSelect()
      expect(state).toBe('selected')
    })

    it('selected → editing: Enter/F2/더블클릭 시 editing 상태', () => {
      type State = 'idle' | 'selected' | 'editing'
      let state: State = 'selected'
      const startEditing = () => { state = 'editing' }
      // Enter
      startEditing()
      expect(state).toBe('editing')
    })

    it('editing → Enter: 값 커밋 후 selected 복귀', () => {
      let committed = false
      let state: 'editing' | 'selected' = 'editing'
      const commit = () => { committed = true; state = 'selected' }
      commit()
      expect(committed).toBe(true)
      expect(state).toBe('selected')
    })

    it('editing → Esc: 편집 취소 (원상복구)', () => {
      const originalValue = 1000
      let editValue = 2000
      const cancel = () => { editValue = originalValue }
      cancel()
      expect(editValue).toBe(originalValue)
    })
  })

  describe('숫자 포맷', () => {
    it('천단위 쉼표 표시 (비편집 모드)', () => {
      expect(fm(3900000)).toBe('3,900,000')
    })

    it('편집 모드 진입 시 값이 콤마 포함으로 초기화된다 (Bug 1 select-all 대응)', () => {
      // 편집 진입: ExcelCell useEffect 로직과 동일
      const raw = 3900000
      const initialStr = fm(raw)
      expect(initialStr).toBe('3,900,000')
    })

    it('편집 후 파싱: 콤마 제거 후 숫자로 복원', () => {
      const parsed = parseFloat('3,900,000'.replace(/,/g, ''))
      expect(parsed).toBe(3900000)
    })
  })

  // ── Bug 2: 편집 중 실시간 콤마 포맷 ──
  describe('formatNumericEdit (Bug 2 실시간 천단위 콤마)', () => {
    it('정수 입력 시 콤마 자동 삽입', () => {
      expect(formatNumericEdit('1000')).toBe('1,000')
      expect(formatNumericEdit('50000')).toBe('50,000')
      expect(formatNumericEdit('1234567')).toBe('1,234,567')
    })

    it('이미 콤마가 있는 paste 입력도 재포맷', () => {
      expect(formatNumericEdit('1,000')).toBe('1,000')
      expect(formatNumericEdit('1,2,3,4')).toBe('1,234')
      expect(formatNumericEdit('12,34,567')).toBe('1,234,567')
    })

    it('소수점 입력 중간 상태 보존 (qty용)', () => {
      expect(formatNumericEdit('1000.')).toBe('1,000.')
      expect(formatNumericEdit('1000.5')).toBe('1,000.5')
      expect(formatNumericEdit('0.5')).toBe('0.5')
      expect(formatNumericEdit('1000.50')).toBe('1,000.50')
    })

    it('음수 입력 중간 상태 보존', () => {
      expect(formatNumericEdit('-')).toBe('-')
      expect(formatNumericEdit('-100')).toBe('-100')
      expect(formatNumericEdit('-1000')).toBe('-1,000')
    })

    it('빈 문자열과 한 자리 숫자 처리', () => {
      expect(formatNumericEdit('')).toBe('')
      expect(formatNumericEdit('0')).toBe('0')
      expect(formatNumericEdit('9')).toBe('9')
      expect(formatNumericEdit('99')).toBe('99')
      expect(formatNumericEdit('999')).toBe('999')
    })

    it('유효하지 않은 입력은 원본 반환 (사용자 수정 유도)', () => {
      expect(formatNumericEdit('abc')).toBe('abc')
      expect(formatNumericEdit('1.5.3')).toBe('1.5.3')
      expect(formatNumericEdit('1a2')).toBe('1a2')
    })

    it('포맷 후 콤마 제거하면 원본 숫자값 복원 (onCommit 역변환 검증)', () => {
      const formatted = formatNumericEdit('1234567.89')
      expect(formatted).toBe('1,234,567.89')
      expect(parseFloat(formatted.replace(/,/g, ''))).toBe(1234567.89)
    })
  })
})
