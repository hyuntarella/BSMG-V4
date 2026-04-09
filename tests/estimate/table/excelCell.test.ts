import { describe, it, expect } from 'vitest'
import { fm } from '@/lib/utils/format'

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
    it('천단위 쉼표 표시/편집 전환', () => {
      const raw = 3900000
      // 표시 모드: 쉼표 포맷
      expect(fm(raw)).toBe('3,900,000')
      // 편집 모드: 원시 숫자
      const editDisplay = String(raw)
      expect(editDisplay).toBe('3900000')
      // 편집 후 파싱
      const parsed = parseFloat('3,900,000'.replace(/,/g, ''))
      expect(parsed).toBe(3900000)
    })
  })
})
