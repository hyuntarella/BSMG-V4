import { describe, it, expect, vi } from 'vitest'

// React 모듈 mock — node 환경에서 훅 테스트를 위한 최소 구현
vi.mock('react', () => {
  return {
    useState: <T,>(initial: T): [T, (v: T) => void] => {
      let value = initial
      const setter = (v: T) => { value = v }
      return [value, setter]
    },
    useMemo: <T,>(fn: () => T, _deps: unknown[]): T => fn(),
  }
})

import { useCostChips } from '@/hooks/useCostChips'

describe('useCostChips', () => {
  it('초기 상태: chips 배열 존재, selectedChip null', () => {
    const result = useCostChips({ areaM2: 150, method: '복합', isMobile: false })

    expect(result.chips.length).toBeGreaterThan(0)
    expect(result.selectedChip).toBeNull()
    expect(result.customPrice).toBeNull()
    expect(result.effectivePrice).toBeNull()
  })

  it('costPerM2 올바른 값 반환', () => {
    // 150m² ≈ 45.4평 → 50평미만 → complex: 13000
    const result = useCostChips({ areaM2: 150, method: '복합', isMobile: false })
    expect(result.costPerM2).toBe(13000)
  })

  it('effectivePrice null일 때 marginPercent = 0', () => {
    const result = useCostChips({ areaM2: 150, method: '복합', isMobile: false })
    expect(result.marginPercent).toBe(0)
  })
})
