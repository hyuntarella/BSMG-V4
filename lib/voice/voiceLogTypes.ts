import type { VoiceCommand } from '@/lib/voice/commands'

/** 음성 대화 로그 항목 */
export interface VoiceLogEntry {
  id: string
  speaker: 'user' | 'system'
  text: string
  /** LLM이 해석한 결과 (system일 때) 또는 사용자 발화에 대한 파싱 결과 */
  action?: VoiceCommand[]
  /** 사용자 피드백 */
  feedback?: 'positive' | 'negative' | null
  /** LLM 해석 요약 (UI 표시용) */
  actionSummary?: string
  timestamp: number
}

/** 교정 데이터 (👎 후 사용자가 입력한 수정) */
export interface CorrectionData {
  logId: string
  originalText: string
  originalAction: VoiceCommand[]
  correctionText: string
  correctedAction?: VoiceCommand[]
  context: {
    targetItem?: string
    targetField?: string
  }
}

/** 수정 하이라이트 턴 정보 */
export interface CellHighlight {
  /** 수정 발생 턴 번호 */
  turn: number
  /** 필드 키 (예: "item:0:3:mat") */
  key: string
}
