/**
 * 규칙 기반 실시간 파서 — Web Speech API interim result에서 즉시 명령 추출.
 * LLM 없이 ~80% 명령을 즉시 실행.
 */

import type { VoiceCommand } from '@/lib/voice/commands'

// ── 공종명 줄임말 매핑 ──

const ITEM_ALIASES: Record<string, string> = {
  '바정': '바탕정리',
  '바탕': '바탕정리',
  '바미': '바탕조정제미장',
  '바탕미장': '바탕조정제미장',
  '미장': '바탕조정제미장',
  '하도': '하도 프라이머',
  '프라이머': '하도 프라이머',
  '시트': '복합 시트',
  '복합시트': '복합 시트',
  '보강포': '쪼인트 실란트\n보강포 부착',
  '실란트': '쪼인트 실란트\n보강포 부착',
  '쪼인트': '쪼인트 실란트\n보강포 부착',
  '우레탄중도': '노출 우레탄',
  '중도': '노출 우레탄',
  '우레탄1차': '노출 우레탄 1차',
  '1차': '노출 우레탄 1차',
  '우레탄2차': '노출 우레탄 2차',
  '2차': '노출 우레탄 2차',
  '벽체': '벽체 우레탄',
  '벽체우레탄': '벽체 우레탄',
  '상도': '우레탄 상도',
  '탑코트': '우레탄 상도',
  '톱코트': '우레탄 상도',
  '탑코팅': '우레탄 상도',
  '사다리': '사다리차',
  '폐기물': '폐기물처리',
  '폐기': '폐기물처리',
  '드비': '드라이비트하부절개',
  '드라이비트': '드라이비트하부절개',
}

/** 시트에 존재하는 공종명 목록 (매칭용) */
const KNOWN_ITEMS = [
  '바탕정리', '바탕조정제미장', '하도 프라이머', '복합 시트',
  '쪼인트 실란트\n보강포 부착', '노출 우레탄', '노출 우레탄 1차',
  '노출 우레탄 2차', '벽체 우레탄', '우레탄 상도',
  '사다리차', '폐기물처리', '드라이비트하부절개',
]

// ── 필드명 매핑 ──

const FIELD_ALIASES: Record<string, string> = {
  '재료비': 'mat',
  '재료': 'mat',
  '자재': 'mat',
  '노무비': 'labor',
  '노무': 'labor',
  '인건비': 'labor',
  '경비': 'exp',
  '단가': 'mat', // 기본은 mat, 장비류는 labor
  '수량': 'qty',
  '규격': 'spec',
}

// ── 동음이의어 사전 ──

const BUILTIN_DICTIONARY: Record<string, string> = {
  '이계소': '2개소',
  '삼계소': '3개소',
  '사계소': '4개소',
  '오계소': '5개소',
  '헤베': 'm²',
  '루베': 'm³',
}

/** STT 오인식을 교정하는 사전 치환 */
function applyDictionary(text: string): string {
  let result = text
  for (const [wrong, correct] of Object.entries(BUILTIN_DICTIONARY)) {
    if (result.includes(wrong)) {
      result = result.replaceAll(wrong, correct)
    }
  }
  return result
}

// ── 순한글 숫자 파싱 ──

/**
 * 순한글 숫자를 파싱한다: "오백", "삼천오백", "만", "삼만오천"
 */
export function parseKoreanFull(text: string): number | null {
  const digits: Record<string, number> = {
    '일': 1, '이': 2, '삼': 3, '사': 4, '오': 5,
    '육': 6, '칠': 7, '팔': 8, '구': 9,
  }
  const units: Record<string, number> = {
    '십': 10, '백': 100, '천': 1000, '만': 10000,
  }

  const cleaned = text.trim()
  if (!cleaned) return null

  const hasKorean = Object.keys(digits).some(k => cleaned.includes(k)) ||
                    Object.keys(units).some(k => cleaned.includes(k))
  if (!hasKorean) return null

  let result = 0
  let current = 0
  let manPart = 0

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (digits[ch] !== undefined) {
      current = digits[ch]
    } else if (ch === '만') {
      if (current === 0 && result === 0) {
        manPart = 1 * 10000
      } else {
        manPart = (result + current) * 10000
      }
      result = 0
      current = 0
    } else if (units[ch] !== undefined && ch !== '만') {
      if (current === 0) current = 1
      result += current * units[ch]
      current = 0
    }
  }
  result += current + manPart

  return result > 0 ? result : null
}

// ── 종결 어미 패턴 ──

const ENDING_TRIGGER = /(넣어|바꿔|해줘?|올려|내려|빼|추가|수정|맞춰|변경|삭제|제거)(줘|라|봐)?[.!?]?$/
const DIRECTION_UP = /(올려|올려줘|올려라)$/
const DIRECTION_DOWN = /(내려|내려줘|내려라)$/
const DELETE_TRIGGER = /(빼|빼줘|빼라|삭제|제거|삭제해|삭제해줘|제거해|제거해줘)$/
const ADD_TRIGGER = /(추가|추가해|추가해줘)$/

/** "으로" 절대값 종결 */
const ABSOLUTE_ENDING = /(\d[\d,.]*)\s*(원|만원|만)?\s*(으로)\s*$/

// ── 숫자 파싱 ──

/**
 * 한국어 숫자+단위 표현을 숫자로 변환.
 * @param text 숫자가 포함된 텍스트 조각
 * @param isAmountContext true = 금액 문맥 (만원 단위 추론), false = 수량 문맥
 */
export function parseKoreanNumber(text: string, isAmountContext: boolean): number | null {
  const cleaned = text.replace(/,/g, '').trim()

  // "3만5천" / "3만 5천"
  const manCheon = cleaned.match(/(\d+)\s*만\s*(\d+)\s*천/)
  if (manCheon) return parseInt(manCheon[1]) * 10000 + parseInt(manCheon[2]) * 1000

  // "3만" / "12만원"
  const man = cleaned.match(/(\d+)\s*만\s*원?/)
  if (man) return parseInt(man[1]) * 10000

  // "5천원" / "5천"
  const cheon = cleaned.match(/(\d+)\s*천\s*원?/)
  if (cheon) return parseInt(cheon[1]) * 1000

  // "500원"
  const won = cleaned.match(/(\d+)\s*원/)
  if (won) return parseInt(won[1])

  // 순수 숫자
  const num = cleaned.match(/(\d+)/)
  if (num) {
    const val = parseInt(num[1])
    // 금액 문맥에서 10~100 사이 → 만원 단위
    if (isAmountContext && val >= 10 && val <= 100) return val * 10000
    return val
  }

  // 순한글 숫자 폴백
  return parseKoreanFull(cleaned)
}

// ── 공종명 fuzzy 매칭 ──

/**
 * Web Speech API의 부정확한 공종명을 매칭.
 * 공백 제거 후 비교, 줄임말 매핑, prefix 매칭.
 */
export function matchItemName(input: string, sheetItems?: string[]): string | null {
  const normalized = input.replace(/\s/g, '')

  // 1. 줄임말 매핑 (정확한 매치)
  if (ITEM_ALIASES[normalized]) return ITEM_ALIASES[normalized]
  if (ITEM_ALIASES[input.trim()]) return ITEM_ALIASES[input.trim()]

  // 2. 시트에 있는 공종명과 비교
  const items = sheetItems ?? KNOWN_ITEMS
  for (const name of items) {
    const nameNorm = name.replace(/\s/g, '').replace(/\n/g, '')
    if (nameNorm === normalized) return name
    if (nameNorm.includes(normalized) && normalized.length >= 2) return name
    if (normalized.includes(nameNorm) && nameNorm.length >= 2) return name
  }

  return null
}

/**
 * 필드명 매칭.
 * 장비류(사다리차, 스카이차, 폐기물) + "단가" 문맥이면 labor 반환.
 */
export function matchField(input: string, itemName?: string): string | null {
  const normalized = input.replace(/\s/g, '')
  const field = FIELD_ALIASES[normalized]
  if (!field) return null

  // "단가" + 장비류 → labor
  if (field === 'mat' && normalized === '단가' && itemName) {
    const equipmentNames = ['사다리차', '스카이차', '폐기물처리']
    if (equipmentNames.some(eq => itemName.includes(eq))) return 'labor'
  }

  return field
}

// ── 필드 자동 추론 (6-level priority) ──

export interface ParseContext {
  lastCommand?: VoiceCommand
  sheetState?: Array<{
    name: string
    mat: number
    labor: number
    exp: number
    is_equipment: boolean
  }>
}

/**
 * 필드명이 없을 때 6단계 우선순위로 추론.
 * Priority 1: 명시적 — 호출 전 처리됨
 * Priority 2: 직전 명령 컨텍스트
 * Priority 3: 동작어 → mat 기본
 * Priority 4: 값 범위
 * Priority 5: 시트 상태 (비제로 필드가 1개)
 * Priority 6: 카테고리 기본값
 */
export function inferField(
  itemName: string | null,
  value: number | null,
  actionWord: string | null,
  context?: ParseContext,
): { field: string; confidence: 'high' | 'low' } | null {
  // Priority 2: context carry-over
  if (context?.lastCommand?.field) {
    return { field: context.lastCommand.field, confidence: 'high' }
  }

  // Priority 3: action word → mat default
  if (actionWord && /올려|내려|바꿔|변경|수정/.test(actionWord)) {
    return { field: 'mat', confidence: 'high' }
  }

  // Priority 4: value range
  if (value !== null) {
    if (value >= 100000) return { field: 'labor', confidence: 'low' }
    if (value >= 100 && value <= 10000) return { field: 'mat', confidence: 'low' }
  }

  // Priority 5: sheet state — if item has only 1 non-zero field
  if (itemName && context?.sheetState) {
    const item = context.sheetState.find(it => it.name === itemName)
    if (item) {
      const nonZero: string[] = []
      if (item.mat > 0) nonZero.push('mat')
      if (item.labor > 0) nonZero.push('labor')
      if (item.exp > 0) nonZero.push('exp')
      if (nonZero.length === 1) return { field: nonZero[0], confidence: 'low' }
    }
  }

  // Priority 6: category default
  if (itemName) {
    const equipmentNames = ['사다리차', '스카이차', '폐기물처리']
    if (equipmentNames.some(eq => itemName.includes(eq))) {
      return { field: 'labor', confidence: 'low' }
    }
    return { field: 'mat', confidence: 'low' }
  }

  return null
}

// ── 실시간 피드백 상태 ──

/** 실시간 파서가 감지한 상태 (화면 하이라이트용) */
export interface RealtimeDetection {
  /** 감지된 공종명 */
  itemName?: string
  /** 감지된 필드 */
  field?: string
  /** 미리보기 값 */
  previewValue?: number
  /** 종결 어미 감지 여부 */
  isComplete: boolean
}

/**
 * Web Speech API interim result를 실시간 분석.
 * 화면 하이라이트용 상태 반환.
 */
export function detectRealtime(text: string, sheetItems?: string[]): RealtimeDetection {
  const result: RealtimeDetection = { isComplete: false }
  const words = applyDictionary(text.trim()).split(/\s+/)

  // 공종명 감지 (앞부분 단어들에서)
  for (let i = 0; i < Math.min(words.length, 3); i++) {
    const candidate = words.slice(0, i + 1).join('')
    const matched = matchItemName(candidate, sheetItems)
    if (matched) {
      result.itemName = matched
      break
    }
  }
  // 단일 단어 매칭도 시도
  if (!result.itemName) {
    for (const word of words) {
      const matched = matchItemName(word, sheetItems)
      if (matched) {
        result.itemName = matched
        break
      }
    }
  }

  // 필드명 감지
  for (const word of words) {
    const field = matchField(word, result.itemName)
    if (field) {
      result.field = field
      break
    }
  }

  // 숫자 감지 → 미리보기 값
  const isAmountContext = result.field !== 'qty'
  for (const word of words) {
    if (/\d/.test(word)) {
      const val = parseKoreanNumber(word, isAmountContext)
      if (val !== null) {
        result.previewValue = val
        break
      }
    }
  }

  // 종결 어미 감지
  result.isComplete = ENDING_TRIGGER.test(text.trim()) || ABSOLUTE_ENDING.test(text.trim())

  return result
}

// ── 명령 파싱 결과 ──

export interface ParseResult {
  /** 파싱 성공 여부 */
  success: boolean
  /** 파싱된 명령 (규칙 기반으로 처리 가능) */
  command?: VoiceCommand
  /** LLM이 필요한지 (규칙 파서로 처리 불가) */
  needsLlm: boolean
  /** 필드가 추론되었는지 (low confidence일 수 있음) */
  fieldInferred?: boolean
  /** 추론 신뢰도 */
  inferredConfidence?: 'high' | 'low'
}

/**
 * 규칙 기반 파서 — 단순 명령을 VoiceCommand로 변환.
 * 실패 시 needsLlm=true 반환 (Whisper+LLM으로 폴백).
 *
 * @param text STT 텍스트 (Web Speech API 또는 Whisper)
 * @param sheetItems 현재 시트의 공종명 목록
 */
export function parseCommand(text: string, sheetItems?: string[], context?: ParseContext): ParseResult {
  const trimmed = applyDictionary(text.trim())
  if (!trimmed) return { success: false, needsLlm: false }

  // ── 삭제 명령: "[공종명] 빼줘/삭제" ──
  if (DELETE_TRIGGER.test(trimmed)) {
    const withoutEnding = trimmed.replace(DELETE_TRIGGER, '').trim()
    const itemName = matchItemName(withoutEnding, sheetItems)
    if (itemName) {
      return {
        success: true,
        needsLlm: false,
        command: { action: 'remove_item', target: itemName, confidence: 0.95 },
      }
    }
  }

  // ── 추가 명령: "[공종명] [수량][단위] 추가" ──
  if (ADD_TRIGGER.test(trimmed)) {
    const withoutEnding = trimmed.replace(ADD_TRIGGER, '').trim()
    const qtyMatch = withoutEnding.match(/(\d+)\s*(미터|m|m²|헤베|평|식|개|일)?/)
    if (qtyMatch) {
      const name = withoutEnding.replace(qtyMatch[0], '').trim()
      const resolvedName = matchItemName(name, sheetItems) ?? name
      const unitMap: Record<string, string> = { '미터': 'm', 'm': 'm', 'm²': 'm²', '헤베': 'm²', '평': '평', '식': '식', '개': '개', '일': '일' }
      return {
        success: true,
        needsLlm: false,
        command: {
          action: 'add_item',
          name: resolvedName,
          qty: parseInt(qtyMatch[1]),
          unit: unitMap[qtyMatch[2] ?? ''] ?? 'm²',
          confidence: 0.90,
        },
      }
    }
  }

  // ── 절대값 변경: "[공종명] [필드] [값]으로 바꿔줘" ──
  const absoluteMatch = trimmed.match(/(.+?)\s+(재료비|재료|자재|노무비|노무|인건비|경비|단가|수량)\s+(.+?)\s*(으로|바꿔|넣어|해줘|수정|변경)/)
  if (absoluteMatch) {
    const itemName = matchItemName(absoluteMatch[1], sheetItems)
    const field = matchField(absoluteMatch[2], itemName ?? undefined)
    const isAmountContext = field !== 'qty'
    const value = parseKoreanNumber(absoluteMatch[3], isAmountContext)

    if (itemName && field && value !== null) {
      return {
        success: true,
        needsLlm: false,
        command: {
          action: 'update_item',
          target: itemName,
          field,
          value,
          confidence: 0.95,
        },
      }
    }
  }

  // ── 증감 변경: "[공종명] [필드] [값] 올려/내려" ──
  const isUp = DIRECTION_UP.test(trimmed)
  const isDown = DIRECTION_DOWN.test(trimmed)
  if (isUp || isDown) {
    const withoutDir = trimmed.replace(/(올려|올려줘|올려라|내려|내려줘|내려라)$/, '').trim()
    // "[공종명] [필드] [값]"
    const deltaMatch = withoutDir.match(/(.+?)\s+(재료비|재료|자재|노무비|노무|인건비|경비|단가|수량)\s+(.+)/)
    if (deltaMatch) {
      const itemName = matchItemName(deltaMatch[1], sheetItems)
      const field = matchField(deltaMatch[2], itemName ?? undefined)
      const isAmountContext = field !== 'qty'
      const rawValue = parseKoreanNumber(deltaMatch[3], isAmountContext)

      if (itemName && field && rawValue !== null) {
        return {
          success: true,
          needsLlm: false,
          command: {
            action: 'update_item',
            target: itemName,
            field,
            delta: isUp ? rawValue : -rawValue,
            confidence: 0.95,
          },
        }
      }
    }
  }

  // ── 필드 생략 패턴: "[공종명] [값]으로" 또는 "[공종명] [값] 올려/내려" ──
  {
    // "[공종명] [값] 올려/내려" (필드 없음)
    if (isUp || isDown) {
      const withoutDir = trimmed.replace(/(올려|올려줘|올려라|내려|내려줘|내려라)$/, '').trim()
      const words = withoutDir.split(/\s+/)
      // 단어들에서 공종명 + 숫자 찾기
      for (let i = 0; i < Math.min(words.length, 3); i++) {
        const candidate = words.slice(0, i + 1).join('')
        const itemName = matchItemName(candidate, sheetItems)
        if (itemName) {
          const rest = words.slice(i + 1).join(' ')
          const val = parseKoreanNumber(rest, true)
          if (val !== null) {
            const actionWord = isUp ? '올려' : '내려'
            const inferred = inferField(itemName, val, actionWord, context)
            if (inferred) {
              return {
                success: true,
                needsLlm: false,
                fieldInferred: true,
                inferredConfidence: inferred.confidence,
                command: {
                  action: 'update_item',
                  target: itemName,
                  field: inferred.field,
                  delta: isUp ? val : -val,
                  confidence: inferred.confidence === 'high' ? 0.90 : 0.75,
                },
              }
            }
          }
        }
      }
    }

    // "[공종명] [값]으로" (필드 없음)
    const absNoField = trimmed.match(/(.+?)\s+(\d[\d,.]*)\s*(원|만원|만)?\s*(으로)\s*$/)
    if (absNoField) {
      const itemName = matchItemName(absNoField[1], sheetItems)
      const val = parseKoreanNumber(absNoField[2] + (absNoField[3] ?? ''), true)
      if (itemName && val !== null) {
        const inferred = inferField(itemName, val, null, context)
        if (inferred) {
          return {
            success: true,
            needsLlm: false,
            fieldInferred: true,
            inferredConfidence: inferred.confidence,
            command: {
              action: 'update_item',
              target: itemName,
              field: inferred.field,
              value: val,
              confidence: inferred.confidence === 'high' ? 0.90 : 0.75,
            },
          }
        }
      }
    }
  }

  // ── 매칭 실패 → LLM 필요 ──
  return { success: false, needsLlm: true }
}
