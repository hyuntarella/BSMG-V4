import { describe, it, expect } from 'vitest'
import { parseCommand } from '@/lib/voice/realtimeParser'

const SHEET_ITEMS = [
  '바탕정리', '바탕조정제미장', '하도 프라이머', '복합 시트',
  '노출 우레탄', '노출 우레탄 1차', '노출 우레탄 2차',
  '벽체 우레탄', '우레탄 상도', '사다리차', '폐기물처리',
]

describe('다중 숫자 패턴', () => {
  it('"바탕 500 1000 200" → 재료비=500, 노무비=1000, 경비=200', () => {
    const result = parseCommand('바탕 500 1000 200', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.commands).toBeDefined()
    expect(result.commands!.length).toBe(3)

    expect(result.commands![0].action).toBe('update_item')
    expect(result.commands![0].target).toBe('바탕정리')
    expect(result.commands![0].field).toBe('mat')
    expect(result.commands![0].value).toBe(500)

    expect(result.commands![1].field).toBe('labor')
    expect(result.commands![1].value).toBe(1000)

    expect(result.commands![2].field).toBe('exp')
    expect(result.commands![2].value).toBe(200)
  })

  it('"바탕 500 1000" → 재료비=500, 노무비=1000', () => {
    const result = parseCommand('바탕 500 1000', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.commands).toBeDefined()
    expect(result.commands!.length).toBe(2)

    expect(result.commands![0].field).toBe('mat')
    expect(result.commands![0].value).toBe(500)

    expect(result.commands![1].field).toBe('labor')
    expect(result.commands![1].value).toBe(1000)
  })

  it('"복합시트 3000 5000 1000" → 3개 필드', () => {
    const result = parseCommand('복합시트 3000 5000 1000', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.commands!.length).toBe(3)
    expect(result.commands![0].target).toBe('복합 시트')
    expect(result.commands![0].value).toBe(3000)
    expect(result.commands![1].value).toBe(5000)
    expect(result.commands![2].value).toBe(1000)
  })

  it('"사다리 200000 100000" → 2개 필드', () => {
    const result = parseCommand('사다리 200000 100000', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.commands!.length).toBe(2)
    expect(result.commands![0].target).toBe('사다리차')
  })
})

describe('되돌리기 패턴', () => {
  it('"취소" → undo command', () => {
    const result = parseCommand('취소', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('undo')
  })

  it('"되돌려" → undo command', () => {
    const result = parseCommand('되돌려', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('undo')
  })

  it('"되돌려줘" → undo command', () => {
    const result = parseCommand('되돌려줘', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('undo')
  })
})

describe('일괄 조정 패턴', () => {
  it('"전체 재 +10%" → bulk_adjust mat +10', () => {
    const result = parseCommand('전체 재 +10%', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('bulk_adjust')
    expect(result.command!.category).toBe('mat')
    expect(result.command!.percent).toBe(10)
  })

  it('"전체 재료비 10% 올려" → bulk_adjust mat +10', () => {
    const result = parseCommand('전체 재료비 10% 올려', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('bulk_adjust')
    expect(result.command!.category).toBe('mat')
    expect(result.command!.percent).toBe(10)
  })

  it('"전체 노무비 5% 내려" → bulk_adjust labor -5', () => {
    const result = parseCommand('전체 노무비 5% 내려', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('bulk_adjust')
    expect(result.command!.category).toBe('labor')
    expect(result.command!.percent).toBe(-5)
  })

  it('"전체 경비 20% 인상" → bulk_adjust exp +20', () => {
    const result = parseCommand('전체 경비 20% 인상', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('bulk_adjust')
    expect(result.command!.category).toBe('exp')
    expect(result.command!.percent).toBe(20)
  })

  it('"전체 -15%" → bulk_adjust all -15', () => {
    const result = parseCommand('전체 -15%', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('bulk_adjust')
    expect(result.command!.category).toBe('all')
    expect(result.command!.percent).toBe(-15)
  })
})

describe('기존 패턴 유지', () => {
  it('"바탕 재료비 500으로 바꿔" → update_item 절대값', () => {
    const result = parseCommand('바탕 재료비 500으로 바꿔', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('update_item')
    expect(result.command!.target).toBe('바탕정리')
    expect(result.command!.field).toBe('mat')
    expect(result.command!.value).toBe(500)
  })

  it('"바탕 재료비 500 올려" → update_item delta', () => {
    const result = parseCommand('바탕 재료비 500 올려', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('update_item')
    expect(result.command!.delta).toBe(500)
  })

  it('"바탕정리 빼줘" → remove_item', () => {
    const result = parseCommand('바탕정리 빼줘', SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command!.action).toBe('remove_item')
    expect(result.command!.target).toBe('바탕정리')
  })

  it('매칭 실패 → needsLlm', () => {
    const result = parseCommand('총액 600만원으로 맞춰줘', SHEET_ITEMS)
    expect(result.success).toBe(false)
    expect(result.needsLlm).toBe(true)
  })
})
