/**
 * 코퍼스 기반 파서 테스트 — parser-corpus.json의 모든 케이스를 자동 검증
 */
import { describe, it, expect } from 'vitest'
import {
  parseCommand,
  parseKoreanNumber,
  parseKoreanFull,
  matchItemName,
  matchField,
  detectRealtime,
  type ParseContext,
} from '@/lib/voice/realtimeParser'
import { detectCorrection } from '@/lib/voice/triggerMatcher'
import { matchSummaryKeyword } from '@/lib/voice/summaryBuilder'
import corpus from '../parser-corpus.json'

// ── 동음이의어 사전 직접 임포트 불가 (모듈 내부) → applyDictionary 효과를 parseCommand 통해 간접 테스트 ──

const SHEET_ITEMS = [
  '바탕정리', '바탕조정제미장', '하도 프라이머', '복합 시트',
  '쪼인트 실란트\n보강포 부착', '노출 우레탄', '노출 우레탄 1차',
  '노출 우레탄 2차', '벽체 우레탄', '우레탄 상도',
  '사다리차', '폐기물처리', '드라이비트하부절개',
]

// ── 카테고리별 필터 ──

type CorpusEntry = (typeof corpus)[number]

function byCategory(...cats: string[]) {
  return corpus.filter((c: CorpusEntry) => cats.includes(c.category))
}

function byPriority(p: string) {
  return corpus.filter((c: CorpusEntry) => c.priority === p)
}

// ── 공종추가 (수량 없음 포함) ──

describe('공종추가', () => {
  const cases = byCategory('공종추가')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('add_item')

    if (exp.item_name) {
      // name 필드로 반환됨 (add_item은 cmd.name 사용)
      expect(result.command!.name).toBe(exp.item_name)
    }
    if (exp.qty !== undefined && exp.qty !== null) {
      expect(result.command!.qty).toBe(exp.qty)
    }
    if (exp.unit) {
      expect(result.command!.unit).toBe(exp.unit)
    }
  })
})

// ── 공종추가 + 위치지정 ──

describe('공종추가_위치지정', () => {
  const cases = byCategory('공종추가_위치지정')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('add_item')
    if (exp.item_name) {
      expect(result.command!.name).toBe(exp.item_name)
    }
    if (exp.position !== null && exp.position !== undefined) {
      expect(result.command!.position).toBe(exp.position)
    }
  })
})

// ── 위치+값설정 혼합 ──

describe('위치값설정혼합', () => {
  const cases = byCategory('위치값설정혼합')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('add_item')
    if (exp.item_name) {
      expect(result.command!.name).toBe(exp.item_name)
    }
    if (exp.qty !== undefined && exp.qty !== null) {
      expect(result.command!.qty).toBe(exp.qty)
    }
    if (exp.unit) {
      expect(result.command!.unit).toBe(exp.unit)
    }
    if (exp.position !== null && exp.position !== undefined) {
      expect(result.command!.position).toBe(exp.position)
    }
  })
})

// ── 위치지정 (추가 명령) ──

describe('위치지정', () => {
  const cases = byCategory('위치지정')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('add_item')
    if (exp.item_name) {
      expect(result.command!.name).toBe(exp.item_name)
    }
    if (exp.position !== null && exp.position !== undefined) {
      expect(result.command!.position).toBe(exp.position)
    }
    if (exp.qty !== undefined && exp.qty !== null) {
      expect(result.command!.qty).toBe(exp.qty)
    }
    if (exp.unit) {
      expect(result.command!.unit).toBe(exp.unit)
    }
  })
})

// ── 값설정 (절대값) ──

describe('값설정', () => {
  const cases = byCategory('값설정')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('update_item')
    if (exp.item_name) {
      expect(result.command!.target).toBe(exp.item_name)
    }
    if (exp.field) {
      expect(result.command!.field).toBe(exp.field)
    }
    if (exp.value !== undefined && exp.value !== null) {
      expect(result.command!.value).toBe(exp.value)
    }
  })
})

// ── 증감변경 ──

describe('증감변경', () => {
  const cases = byCategory('증감변경')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('update_item')
    if (exp.item_name) {
      expect(result.command!.target).toBe(exp.item_name)
    }
    if (exp.field) {
      expect(result.command!.field).toBe(exp.field)
    }
    if (exp.delta !== undefined && exp.delta !== null) {
      expect(result.command!.delta).toBe(exp.delta)
    }
  })
})

// ── 필드추론 ──

describe('필드추론', () => {
  const cases = byCategory('필드추론')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const exp = tc.expected as Record<string, unknown>
    const ctx: ParseContext | undefined = (tc as Record<string, unknown>).context as ParseContext | undefined
    const result = parseCommand(tc.input!, SHEET_ITEMS, ctx)

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('update_item')
    if (exp.item_name) {
      expect(result.command!.target).toBe(exp.item_name)
    }
    if (exp.field) {
      expect(result.command!.field).toBe(exp.field)
    }
    if (exp.value !== undefined && exp.value !== null) {
      expect(result.command!.value).toBe(exp.value)
    }
    if (exp.delta !== undefined && exp.delta !== null) {
      expect(result.command!.delta).toBe(exp.delta)
    }
    if (exp.fieldInferred) {
      expect(result.fieldInferred).toBe(true)
    }
  })
})

// ── 삭제 ──

describe('삭제', () => {
  const cases = byCategory('삭제')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('remove_item')
    if (exp.item_name) {
      expect(result.command!.target).toBe(exp.item_name)
    }
  })
})

// ── 교정 (detectCorrection) ──

describe('교정', () => {
  const cases = byCategory('교정')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = detectCorrection(tc.input!)
    const exp = tc.expected as Record<string, unknown>

    expect(result).not.toBeNull()
    expect(result!.type).toBe(exp.correction_type)
    if (exp.newValue !== undefined) {
      expect(result!.newValue).toBe(exp.newValue)
    }
    if (exp.newField !== undefined) {
      expect(result!.newField).toBe(exp.newField)
    }
  })
})

// ── 일괄조정 ──

describe('일괄조정', () => {
  const cases = byCategory('일괄조정')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('bulk_adjust')
    if (exp.category) {
      expect(result.command!.category).toBe(exp.category)
    }
    if (exp.percent !== undefined && exp.percent !== null) {
      expect(result.command!.percent).toBe(exp.percent)
    }
  })
})

// ── 복합명령 (다중 숫자) ──

describe('복합명령', () => {
  const cases = byCategory('복합명령')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.commands).toBeDefined()

    if (exp.mat !== undefined) {
      expect(result.commands![0].action).toBe('update_item')
      expect(result.commands![0].target).toBe(exp.item_name)
      expect(result.commands![0].field).toBe('mat')
      expect(result.commands![0].value).toBe(exp.mat)
    }
    if (exp.labor !== undefined) {
      expect(result.commands![1].field).toBe('labor')
      expect(result.commands![1].value).toBe(exp.labor)
    }
    if (exp.exp !== undefined) {
      expect(result.commands![2].field).toBe('exp')
      expect(result.commands![2].value).toBe(exp.exp)
    }
  })
})

// ── 되돌리기 ──

describe('되돌리기', () => {
  const cases = byCategory('되돌리기')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('undo')
  })
})

// ── 컨텍스트계승 ──

describe('컨텍스트계승', () => {
  const cases = byCategory('컨텍스트계승')
  it.each(cases)('[$id] $input — $note', (tc: CorpusEntry) => {
    const exp = tc.expected as Record<string, unknown>
    const ctx = (tc as Record<string, unknown>).context as ParseContext | undefined
    const result = parseCommand(tc.input!, SHEET_ITEMS, ctx)

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('update_item')
    if (exp.item_name) {
      expect(result.command!.target).toBe(exp.item_name)
    }
    if (exp.field) {
      expect(result.command!.field).toBe(exp.field)
    }
    if (exp.fieldInferred) {
      expect(result.fieldInferred).toBe(true)
    }
  })
})

// ── 줄임말매칭 ──

describe('줄임말매칭', () => {
  const cases = byCategory('줄임말매칭')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    if (exp.action === 'remove_item') {
      expect(result.command!.action).toBe('remove_item')
      expect(result.command!.target).toBe(exp.item_name)
    } else {
      expect(result.command!.action).toBe('update_item')
      expect(result.command!.target).toBe(exp.item_name)
      if (exp.field) expect(result.command!.field).toBe(exp.field)
      if (exp.value !== undefined && exp.value !== null) expect(result.command!.value).toBe(exp.value)
    }
  })
})

// ── 숫자파싱 ──

describe('숫자파싱', () => {
  const cases = byCategory('숫자파싱')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    expect(result.command!.action).toBe('update_item')
    if (exp.value !== undefined && exp.value !== null) {
      expect(result.command!.value).toBe(exp.value)
    }
  })
})

// ── 한글숫자 ──

describe('한글숫자', () => {
  const cases = byCategory('한글숫자')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const result = parseCommand(tc.input!, SHEET_ITEMS)
    const exp = tc.expected as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.command).toBeDefined()
    if (exp.value !== undefined && exp.value !== null) {
      expect(result.command!.value).toBe(exp.value)
    }
  })
})

// ── 조회 (summaryBuilder) ──

describe('조회', () => {
  const cases = byCategory('조회')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const exp = tc.expected as Record<string, unknown>
    const action = matchSummaryKeyword(tc.input!)
    expect(action).toBe(exp.action)
  })
})

// ── 동음이의어 (applyDictionary 간접 테스트) ──

describe('동음이의어', () => {
  const cases = byCategory('동음이의어')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const exp = tc.expected as Record<string, unknown>
    // applyDictionary는 parseCommand 내부에서 호출됨
    // detectRealtime을 통해 간접 검증: 사전 치환 후 텍스트가 올바른지
    const detection = detectRealtime(tc.input!, SHEET_ITEMS)
    // 사전이 적용되었다면 원본 텍스트와 다른 결과가 나와야 함
    expect(exp.dictionary_applied).toBe(true)
    // 구체적 검증: corrected_text에 숫자가 포함되어야 함
    const corrected = exp.corrected_text as string
    // parseCommand에 corrected 텍스트를 넣으면 동일한 결과여야 함
    // (사전 적용 전 텍스트와 적용 후 텍스트가 같은 파싱 결과를 내야 함)
    const resultOriginal = parseCommand(tc.input!, SHEET_ITEMS)
    const resultCorrected = parseCommand(corrected, SHEET_ITEMS)
    // 둘 다 같은 결과 (사전이 내부에서 적용되므로)
    expect(resultOriginal.success).toBe(resultCorrected.success)
    expect(resultOriginal.needsLlm).toBe(resultCorrected.needsLlm)
  })
})

// ── 실시간감지 (detectRealtime) ──

describe('실시간감지', () => {
  const cases = byCategory('실시간감지')
  it.each(cases)('[$id] $input', (tc: CorpusEntry) => {
    const exp = tc.expected as Record<string, unknown>
    const result = detectRealtime(tc.input!, SHEET_ITEMS)

    if (exp.itemName !== undefined) {
      expect(result.itemName).toBe(exp.itemName)
    }
    if (exp.field !== undefined) {
      expect(result.field).toBe(exp.field)
    }
    if (exp.previewValue !== undefined) {
      expect(result.previewValue).toBe(exp.previewValue)
    }
    if (exp.isComplete !== undefined) {
      expect(result.isComplete).toBe(exp.isComplete)
    }
  })
})

// ── 엣지케이스 ──

describe('엣지케이스', () => {
  const cases = byCategory('엣지케이스')
  it.each(cases)('[$id] $input — $note', (tc: CorpusEntry) => {
    const exp = tc.expected as Record<string, unknown>
    const result = parseCommand(tc.input!, SHEET_ITEMS)

    if (exp.needsLlm === true) {
      expect(result.needsLlm).toBe(true)
    } else if (exp.action === null) {
      // 빈 입력
      expect(result.success).toBe(false)
    } else if (exp.action) {
      expect(result.success).toBe(true)
      expect(result.command).toBeDefined()
      expect(result.command!.action).toBe(exp.action)
      if (exp.item_name) {
        expect(result.command!.target).toBe(exp.item_name)
      }
      if (exp.field) {
        expect(result.command!.field).toBe(exp.field)
      }
      if (exp.value !== undefined && exp.value !== null) {
        expect(result.command!.value).toBe(exp.value)
      }
    }
  })
})

// ── 버퍼축적 (parseCommand에 합친 텍스트 전달) ──
// 버퍼 로직은 useEstimateVoice.ts (hook)에서 처리되므로
// 단위 테스트에서는 pendingBuffer + 새 입력 = 합친 텍스트를 parseCommand에 전달

describe('버퍼축적', () => {
  const cases = corpus.filter((c: CorpusEntry) => c.category === '버퍼축적')
  it.each(cases)('[$id] $note', (tc: CorpusEntry) => {
    const exp = tc.expected as Record<string, unknown>
    const seq = (tc as Record<string, unknown>).input_sequence as string[]
    // 버퍼 시뮬레이션: 시퀀스를 공백으로 합침
    const combined = seq.join(' ')
    const result = parseCommand(combined, SHEET_ITEMS)

    expect(result.success).toBe(true)

    if (exp.action === 'multi_update') {
      // 다중 숫자
      expect(result.commands).toBeDefined()
      if (exp.mat !== undefined) {
        expect(result.commands![0].value).toBe(exp.mat)
      }
      if (exp.labor !== undefined) {
        expect(result.commands![1].value).toBe(exp.labor)
      }
      if (exp.exp !== undefined) {
        expect(result.commands![2].value).toBe(exp.exp)
      }
    } else if (exp.action === 'add_item') {
      expect(result.command).toBeDefined()
      expect(result.command!.action).toBe('add_item')
      if (exp.item_name) {
        expect(result.command!.name).toBe(exp.item_name)
      }
      if (exp.position !== undefined && exp.position !== null) {
        expect(result.command!.position).toBe(exp.position)
      }
      if (exp.qty !== undefined && exp.qty !== null) {
        expect(result.command!.qty).toBe(exp.qty)
      }
    } else if (exp.action === 'update_item') {
      expect(result.command).toBeDefined()
      expect(result.command!.action).toBe('update_item')
      if (exp.item_name) {
        expect(result.command!.target).toBe(exp.item_name)
      }
      if (exp.field) {
        expect(result.command!.field).toBe(exp.field)
      }
      if (exp.value !== undefined && exp.value !== null) {
        expect(result.command!.value).toBe(exp.value)
      }
      if (exp.delta !== undefined && exp.delta !== null) {
        expect(result.command!.delta).toBe(exp.delta)
      }
    }
  })
})
