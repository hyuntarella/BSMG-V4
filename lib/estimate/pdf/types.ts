export interface CoverItem {
  /** 품명 (공사명) */
  name: string
  /** 규격 */
  spec: string
  /** 수량 */
  qty: number
  /** 단가 — 갑지 렌더링에서는 미사용. 을지(6.3)에서 타입 분리 검토 예정 */
  unitPrice: number
  /** 금액 */
  amount: number
  /** 비고 */
  memo: string
}

export interface CoverRenderData {
  /** "2026년 4월 14일" */
  date: string
  /** 수신: 고객명 */
  customerName: string
  /** 공급자 측 영업담당자 이름. 견적 작성자(로그인 사용자) 정보 자동 채움 예정. */
  managerName: string
  /** 공급자 측 영업담당자 연락처. */
  managerPhone: string
  /** 현장 주소 */
  siteAddress: string
  /** 공사명 */
  projectTitle: string
  /** 합계 금액 (숫자) */
  totalAmount: number
  /** "일금 팔천오백칠십만원" */
  totalAmountKorean: string
  /** 공사 목록 */
  items: CoverItem[]
  /** "1/3" */
  pageNumber: string
}

// ── 을지 (상세 시트) PDF 렌더용 타입 ──

/** 공종별 단가/금액 쌍 — 재료비·노무비·경비·합계 각각 있을 수도 없을 수도 있음 */
export interface WorkColumn {
  unitPrice?: number
  amount?: number
}

/** 품목 행 */
export interface DetailItem {
  kind: 'item'
  name: string
  spec?: string
  unit?: string
  quantity?: number
  /** 재료비 */
  material?: WorkColumn
  /** 노무비 (Figma 원문: 인건비) */
  labor?: WorkColumn
  /** 경비 */
  expense?: WorkColumn
  /** 합계 */
  total?: WorkColumn
  note?: string
}

/**
 * 주석/강조 병합 행 — 표 전체 가로 병합 (colSpan=13).
 * rows 배열 내 어느 위치에든 올 수 있음 (품목 사이, 합계 직전 등).
 */
export interface CalloutRow {
  kind: 'callout'
  text: string
  /** accent = #A11D1F 빨강 강조 (Bold 가능), default = 검정 Regular */
  color?: 'accent' | 'default'
}

/** 을지 1장 분량의 렌더 데이터 */
export interface DetailSheet {
  /** 공사명 (amount-block 표시) */
  constructionName: string
  /** 품목 + callout 행 배열 (가변 길이, 빈 행 없음) */
  rows: (DetailItem | CalloutRow)[]
  /** 공과잡비율 — 기본 0.03, Phase 6.4에서 DB 컬럼 연동 예정 */
  overheadRate: number
  /** 이윤율 — 기본 0.06, Phase 6.4에서 DB 컬럼 연동 예정 */
  profitRate: number
  /** "2/3" */
  pageNumber: string
}
