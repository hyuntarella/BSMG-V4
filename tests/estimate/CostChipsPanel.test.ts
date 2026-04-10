import { describe, it, expect, vi } from 'vitest'
import type { UseCostChipsReturn } from '@/hooks/useCostChips'

function makeMockChips(overrides?: Partial<UseCostChipsReturn>): UseCostChipsReturn {
  return {
    chips: [30000, 31000, 32000],
    selectedChip: null,
    setSelectedChip: vi.fn(),
    customPrice: null,
    setCustomPrice: vi.fn(),
    effectivePrice: null,
    marginPercent: 0,
    costPerM2: 12000,
    ...overrides,
  }
}

/** JSX 요소를 resolve — function 컴포넌트는 호출하여 전개 */
function resolveNode(node: unknown): unknown {
  if (node === null || node === undefined) return node
  if (typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(resolveNode)

  const obj = node as Record<string, unknown>
  if (typeof obj.type === 'function') {
    const fn = obj.type as (props: Record<string, unknown>) => unknown
    return resolveNode(fn(obj.props as Record<string, unknown>))
  }
  return node
}

/** JSX 트리를 재귀적으로 탐색하여 모든 문자열/숫자 값을 수집 */
function collectTexts(node: unknown): string[] {
  const resolved = resolveNode(node)
  if (resolved === null || resolved === undefined) return []
  if (typeof resolved === 'string') return [resolved]
  if (typeof resolved === 'number') return [String(resolved)]
  if (Array.isArray(resolved)) return resolved.flatMap(collectTexts)
  if (typeof resolved === 'object') {
    const obj = resolved as Record<string, unknown>
    const results: string[] = []
    if (obj.props && typeof obj.props === 'object') {
      const props = obj.props as Record<string, unknown>
      if (props.children) results.push(...collectTexts(props.children))
    }
    return results
  }
  return []
}

/** JSX 트리에서 특정 type의 요소를 재귀적으로 수집 */
function collectElements(
  node: unknown,
  targetType: string,
): Array<{ type: string; props: Record<string, unknown> }> {
  const resolved = resolveNode(node)
  if (resolved === null || resolved === undefined || typeof resolved !== 'object') return []
  if (Array.isArray(resolved)) return resolved.flatMap((n) => collectElements(n, targetType))

  const obj = resolved as Record<string, unknown>
  const results: Array<{ type: string; props: Record<string, unknown> }> = []

  if (obj.type === targetType && obj.props) {
    results.push({ type: targetType, props: obj.props as Record<string, unknown> })
  }

  if (obj.props && typeof obj.props === 'object') {
    const props = obj.props as Record<string, unknown>
    if (props.children) results.push(...collectElements(props.children, targetType))
  }

  return results
}

describe('CostChipsPanel', () => {
  it('복합/우레탄 섹션 모두 렌더링 (라벨 포함)', async () => {
    const mod = await import('@/components/estimate/CostChipsPanel')
    const CostChipsPanel = mod.default

    const result = CostChipsPanel({
      compositeChips: makeMockChips(),
      urethaneChips: makeMockChips(),
    })

    const texts = collectTexts(result)
    const allText = texts.join(' ')
    expect(allText).toContain('복합방수 평단가')
    expect(allText).toContain('우레탄방수 평단가')
  })

  it('칩 클릭 → setSelectedChip 호출', async () => {
    const mod = await import('@/components/estimate/CostChipsPanel')
    const CostChipsPanel = mod.default

    const mockSetSelected = vi.fn()
    const mockSetCustom = vi.fn()
    const compositeChips = makeMockChips({
      setSelectedChip: mockSetSelected,
      setCustomPrice: mockSetCustom,
    })

    const result = CostChipsPanel({
      compositeChips,
      urethaneChips: makeMockChips(),
    })

    const buttons = collectElements(result, 'button')
    expect(buttons.length).toBeGreaterThan(0)

    const onClick = buttons[0].props.onClick as () => void
    onClick()
    expect(mockSetSelected).toHaveBeenCalled()
  })

  it('직접입력 → setCustomPrice 호출', async () => {
    const mod = await import('@/components/estimate/CostChipsPanel')
    const CostChipsPanel = mod.default

    const mockSetCustom = vi.fn()
    const mockSetSelected = vi.fn()
    const compositeChips = makeMockChips({
      setCustomPrice: mockSetCustom,
      setSelectedChip: mockSetSelected,
    })

    const result = CostChipsPanel({
      compositeChips,
      urethaneChips: makeMockChips(),
    })

    const inputs = collectElements(result, 'input')
    expect(inputs.length).toBeGreaterThan(0)

    const onChange = inputs[0].props.onChange as (e: { target: { value: string } }) => void
    onChange({ target: { value: '25000' } })
    expect(mockSetCustom).toHaveBeenCalledWith(25000)
    // setSelectedChip(null)은 useCostChips hook 내부에서 처리됨 — 패널은 호출하지 않음
    expect(mockSetSelected).not.toHaveBeenCalled()
  })
})
