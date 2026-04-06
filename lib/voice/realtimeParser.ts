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

  // 모든 한글 글자가 숫자 자릿수 또는 단위여야 함 (프라이머 → "이" 오탐 방지)
  const allChars = new Set([...Object.keys(digits), ...Object.keys(units)])
  for (const ch of cleaned) {
    if (/[가-힣]/.test(ch) && !allChars.has(ch)) return null
  }

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

// ── 위치 패턴 ──

/** 한국어 숫자 → 아라비아 숫자 (위치 전용) */
const KR_NUM_MAP: Record<string, number> = {
  '일': 1, '이': 2, '삼': 3, '사': 4, '오': 5,
  '육': 6, '칠': 7, '팔': 8, '구': 9, '십': 10,
  '하나': 1, '둘': 2, '셋': 3, '넷': 4, '다섯': 5,
  '여섯': 6, '일곱': 7, '여덟': 8, '아홉': 9, '열': 10,
  '한': 1, '두': 2, '세': 3, '네': 4,
}

/** "N번에", "N번째에", "맨 위에", "맨 아래에", "구번에" 등에서 위치를 추출하고 제거한 텍스트를 반환 */
export function extractPosition(text: string): { position: number | null; cleaned: string } {
  // "맨 위에" / "맨 위" → position 1
  const topMatch = text.match(/맨\s*위(에)?\s*/)
  if (topMatch) {
    return { position: 1, cleaned: text.replace(topMatch[0], '').trim() }
  }

  // "맨 아래에" / "맨 아래" → position -1 (끝)
  const bottomMatch = text.match(/맨\s*아래(에)?\s*/)
  if (bottomMatch) {
    return { position: -1, cleaned: text.replace(bottomMatch[0], '').trim() }
  }

  // 아라비아 숫자: "N번째에" / "N번째" / "N번에" / "N번"
  const posMatch = text.match(/(\d+)\s*번(째)?(에)?\s*/)
  if (posMatch) {
    return { position: parseInt(posMatch[1]), cleaned: text.replace(posMatch[0], '').trim() }
  }

  // 한국어 숫자: "구번에", "열번째" 등
  const krKeys = Object.keys(KR_NUM_MAP).join('|')
  const krPosMatch = text.match(new RegExp(`(${krKeys})\\s*번(째)?(에)?\\s*`))
  if (krPosMatch) {
    const num = KR_NUM_MAP[krPosMatch[1]]
    if (num !== undefined) {
      return { position: num, cleaned: text.replace(krPosMatch[0], '').trim() }
    }
  }

  return { position: null, cleaned: text }
}

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
 * "도" 접미사 제거 후 매칭도 시도.
 */
export function matchItemName(input: string, sheetItems?: string[]): string | null {
  const trimmed = input.trim()
  const normalized = trimmed.replace(/\s/g, '')

  // 1. 줄임말 매핑 (정확한 매치)
  if (ITEM_ALIASES[normalized]) return ITEM_ALIASES[normalized]
  if (ITEM_ALIASES[trimmed]) return ITEM_ALIASES[trimmed]

  // 2. 시트에 있는 공종명과 비교
  const items = sheetItems ?? KNOWN_ITEMS

  // Pass 1: 정확한 매칭 (exact match 우선)
  for (const name of items) {
    const nameNorm = name.replace(/\s/g, '').replace(/\n/g, '')
    if (nameNorm === normalized) return name
  }

  // Pass 2: includes 매칭 — 짧은 이름부터 (입력이 공종명을 포함하는 경우 우선)
  // "노출 우레탄" 입력 시 "노출 우레탄"이 "노출 우레탄 1차"보다 먼저 매칭되어야 함
  const sortedByLen = [...items].sort((a, b) =>
    a.replace(/\s/g, '').length - b.replace(/\s/g, '').length
  )
  for (const name of sortedByLen) {
    const nameNorm = name.replace(/\s/g, '').replace(/\n/g, '')
    // 입력이 공종명을 포함 (예: "노출우레탄재료비" includes "노출우레탄")
    if (normalized.includes(nameNorm) && nameNorm.length >= 2) return name
  }
  // 공종명이 입력을 포함 (예: "바탕조정제미장" includes "미장")
  for (const name of sortedByLen) {
    const nameNorm = name.replace(/\s/g, '').replace(/\n/g, '')
    if (nameNorm.includes(normalized) && normalized.length >= 2) return name
  }

  // 3. "도" 접미사 제거 후 재시도 ("미장도" → "미장", "시트도" → "시트")
  if (normalized.endsWith('도') && normalized.length >= 2) {
    const withoutDo = normalized.slice(0, -1)
    if (ITEM_ALIASES[withoutDo]) return ITEM_ALIASES[withoutDo]
    for (const name of items) {
      const nameNorm = name.replace(/\s/g, '').replace(/\n/g, '')
      if (nameNorm === withoutDo) return name
    }
    for (const name of sortedByLen) {
      const nameNorm = name.replace(/\s/g, '').replace(/\n/g, '')
      if (normalized.length >= 3 && nameNorm.includes(withoutDo) && withoutDo.length >= 2) return name
    }
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

  // Priority 4: value range — 장비류는 항상 exp
  if (value !== null && itemName) {
    const equipmentNames = ['사다리차', '스카이차', '폐기물처리']
    if (equipmentNames.some(eq => itemName.includes(eq))) {
      return { field: 'exp', confidence: 'low' }
    }
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

  // Priority 6: category default — 장비류는 경비(exp), 일반은 재료비(mat)
  if (itemName) {
    const equipmentNames = ['사다리차', '스카이차', '폐기물처리']
    if (equipmentNames.some(eq => itemName.includes(eq))) {
      return { field: 'exp', confidence: 'low' }
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
  /** 다중 명령 (다중 숫자 패턴 등) */
  commands?: VoiceCommand[]
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

  // ── 추가 명령: "[공종명] [수량][단위] [위치] 추가" ──
  if (ADD_TRIGGER.test(trimmed)) {
    const withoutEnding = trimmed.replace(ADD_TRIGGER, '').trim()

    // Step 1: 위치 패턴 추출 및 제거
    const { position, cleaned: afterPos } = extractPosition(withoutEnding)

    // Step 2: 수량+단위 추출 및 제거
    const qtyMatch = afterPos.match(/(\d+)\s*(미터|m|m²|헤베|평|식|개|일)/)
    let qty: number | undefined
    let unit: string | undefined
    let afterQty = afterPos

    if (qtyMatch) {
      qty = parseInt(qtyMatch[1])
      const unitMap: Record<string, string> = { '미터': 'm', 'm': 'm', 'm²': 'm²', '헤베': 'm²', '평': '평', '식': '식', '개': '개', '일': '일' }
      unit = unitMap[qtyMatch[2] ?? ''] ?? 'm²'
      afterQty = afterPos.replace(qtyMatch[0], '').trim()
    }

    // Step 3: 공종명 매칭
    const nameCandidate = afterQty.trim()
    if (nameCandidate) {
      const resolvedName = matchItemName(nameCandidate, sheetItems) ?? nameCandidate
      const cmd: VoiceCommand = {
        action: 'add_item',
        name: resolvedName,
        confidence: 0.90,
      }
      if (qty !== undefined) cmd.qty = qty
      if (unit) cmd.unit = unit
      if (position !== null) cmd.position = position
      return { success: true, needsLlm: false, command: cmd }
    }
  }

  // ── 절대값 변경: "[공종명] [필드] [값]으로 바꿔줘" ──
  // greedy 매칭으로 시도한 뒤 lazy 매칭으로 폴백 (숫자 포함 공종명 지원)
  const absolutePatterns = [
    /(.+)\s+(재료비|재료|자재|노무비|노무|인건비|경비|단가|수량)\s+(.+?)\s*(으로|바꿔|넣어|해줘|수정|변경)/,
    /(.+?)\s+(재료비|재료|자재|노무비|노무|인건비|경비|단가|수량)\s+(.+?)\s*(으로|바꿔|넣어|해줘|수정|변경)/,
  ]
  for (const pat of absolutePatterns) {
    const absoluteMatch = trimmed.match(pat)
    if (absoluteMatch) {
      const itemName = matchItemName(absoluteMatch[1], sheetItems)
      const field = matchField(absoluteMatch[2], itemName ?? undefined)
      // 필드 명시 시 만원 자동 변환 비활성 (재료비 100 = 100원, 평단가 35 = 35만원과 다름)
      const isAmountContext = false
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
  }

  // ── 증감 변경: "[공종명] [필드] [값] 올려/내려" ──
  const isUp = DIRECTION_UP.test(trimmed)
  const isDown = DIRECTION_DOWN.test(trimmed)
  if (isUp || isDown) {
    const withoutDir = trimmed.replace(/(올려|올려줘|올려라|내려|내려줘|내려라)$/, '').trim()
    // greedy 먼저, lazy 폴백
    const deltaPatterns = [
      /(.+)\s+(재료비|재료|자재|노무비|노무|인건비|경비|단가|수량)\s+(.+)/,
      /(.+?)\s+(재료비|재료|자재|노무비|노무|인건비|경비|단가|수량)\s+(.+)/,
    ]
    for (const pat of deltaPatterns) {
      const deltaMatch = withoutDir.match(pat)
      if (deltaMatch) {
        const itemName = matchItemName(deltaMatch[1], sheetItems)
        const field = matchField(deltaMatch[2], itemName ?? undefined)
        // 필드 명시 시 만원 자동 변환 비활성
        const isAmountContext = false
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

  // ── "도" 패턴: "미장도 300", "시트도 500 넣어", "하도도 올려" ──
  // "도" 접미사로 끝나는 공종명 + 값/동작어 → 컨텍스트에서 필드 계승
  // 주의: "하도"는 "하도 프라이머"의 줄임말이므로 "도" 패턴이 아님
  {
    const words = trimmed.split(/\s+/)
    if (words.length >= 1) {
      const firstWord = words[0]
      // "도"로 끝나는 단어에서 공종명 매칭 시도
      // 단, "도"를 제거한 형태가 유효한 공종명일 때만 "도" 패턴으로 처리
      const isDoPattern = firstWord.endsWith('도') && firstWord.length >= 2 && (() => {
        const withoutDo = firstWord.slice(0, -1)
        // "도" 제거 후 유효한 매칭이 있어야 "도" 패턴
        return ITEM_ALIASES[withoutDo] !== undefined ||
          (sheetItems ?? KNOWN_ITEMS).some(n => {
            const norm = n.replace(/\s/g, '').replace(/\n/g, '')
            return (norm === withoutDo || (norm.includes(withoutDo) && withoutDo.length >= 2))
          })
      })()
      if (isDoPattern) {
        const itemName = matchItemName(firstWord, sheetItems)
        if (itemName) {
          const rest = words.slice(1).join(' ')

          // "도" 패턴 + 올려/내려
          if (DIRECTION_UP.test(trimmed) || DIRECTION_DOWN.test(trimmed)) {
            const dirUp = DIRECTION_UP.test(trimmed)
            const afterDir = rest.replace(/(올려|올려줘|올려라|내려|내려줘|내려라)$/, '').trim()
            const val = afterDir ? parseKoreanNumber(afterDir, true) : null
            const inferred = inferField(itemName, val, dirUp ? '올려' : '내려', context)
            if (inferred) {
              const cmd: VoiceCommand = {
                action: 'update_item',
                target: itemName,
                field: inferred.field,
                confidence: inferred.confidence === 'high' ? 0.90 : 0.75,
              }
              if (val !== null) cmd.delta = dirUp ? val : -val
              return {
                success: true,
                needsLlm: val === null, // 값 없으면 LLM 필요할 수 있음
                fieldInferred: true,
                inferredConfidence: inferred.confidence,
                command: cmd,
              }
            }
          }

          // "도" 패턴 + 값 (+ 넣어/으로 등)
          if (rest) {
            const cleanedRest = rest.replace(ENDING_TRIGGER, '').trim()
            const val = parseKoreanNumber(cleanedRest, true)
            if (val !== null) {
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
      }
    }
  }

  // ── 되돌리기 명령: "취소", "되돌려" ──
  if (/^(취소|되돌려|되돌려줘|되돌리기|언두|undo)\s*[.!?]?\s*$/.test(trimmed)) {
    return {
      success: true,
      needsLlm: false,
      command: { action: 'undo', confidence: 0.98 },
    }
  }

  // ── 단순 일괄 조정: "전체 재 +10%", "전체 재료비 10% 올려" ──
  {
    const bulkMatch = trimmed.match(
      /^전체\s*(재료비|재료|자재|재|노무비|노무|인건비|노|경비|경|전부|전체|all)?\s*[+\-]?\s*(\d+(?:\.\d+)?)\s*%?\s*(올려|내려|인상|인하)?\s*$/
    )
    if (bulkMatch) {
      const catInput = bulkMatch[1] ?? 'all'
      const percent = parseFloat(bulkMatch[2])
      const dir = bulkMatch[3]
      const catMap: Record<string, string> = {
        '재료비': 'mat', '재료': 'mat', '자재': 'mat', '재': 'mat',
        '노무비': 'labor', '노무': 'labor', '인건비': 'labor', '노': 'labor',
        '경비': 'exp', '경': 'exp',
        '전부': 'all', '전체': 'all', 'all': 'all',
      }
      const category = catMap[catInput] ?? 'all'
      // 방향: "내려", "인하" → 음수, 그 외 양수. 또는 원문에 - 있으면 음수
      const isNegative = dir === '내려' || dir === '인하' || trimmed.includes('-')
      return {
        success: true,
        needsLlm: false,
        command: {
          action: 'bulk_adjust',
          category,
          percent: isNegative ? -percent : percent,
          confidence: 0.92,
        },
      }
    }
  }

  // ── 다중 숫자 패턴: "[공종명] [숫자] [숫자] [숫자]" ──
  // 1개=재, 2개=재+노, 3개=재+노+경
  {
    const words = trimmed.split(/\s+/)
    // 공종명을 앞에서부터 매칭 (공백 제거 + 공백 포함 둘 다)
    for (let i = 0; i < Math.min(words.length, 3); i++) {
      const candidateNoSpace = words.slice(0, i + 1).join('')
      const candidateWithSpace = words.slice(0, i + 1).join(' ')
      const itemName = matchItemName(candidateWithSpace, sheetItems) ?? matchItemName(candidateNoSpace, sheetItems)
      if (itemName) {
        const rest = words.slice(i + 1)
        // 나머지에서 숫자만 추출
        const numbers: number[] = []
        for (const w of rest) {
          const val = parseKoreanNumber(w, true)
          if (val !== null) numbers.push(val)
        }
        if (numbers.length >= 2) {
          const commands: VoiceCommand[] = []
          // 장비류: 경비단가 + 수량(일수) / 일반: 재료비→노무비→경비
          const equipmentNames = ['사다리차', '스카이차', '폐기물처리']
          const isEquipment = equipmentNames.some(eq => itemName.includes(eq))
          if (isEquipment) {
            commands.push({
              action: 'update_item',
              target: itemName,
              field: 'exp',
              value: numbers[0],
              confidence: 0.92,
            })
            commands.push({
              action: 'update_item',
              target: itemName,
              field: 'qty',
              value: numbers[1],
              confidence: 0.92,
            })
          } else {
            const fields = ['mat', 'labor', 'exp']
            for (let j = 0; j < Math.min(numbers.length, 3); j++) {
              commands.push({
                action: 'update_item',
                target: itemName,
                field: fields[j],
                value: numbers[j],
                confidence: 0.90,
              })
            }
          }
          return {
            success: true,
            needsLlm: false,
            commands,
            command: commands[0], // 하위 호환
          }
        }
        // 1개 숫자 → 기존 필드 추론 (이미 위에서 처리됨)
        break
      }
    }
  }

  // ── 매칭 실패 → LLM 필요 ──
  return { success: false, needsLlm: true }
}
