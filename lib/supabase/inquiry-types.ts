// ── Inquiry Types (CRM 재구축) ──

export type InquiryChannel =
  | 'naver_powerlink'
  | 'naver_powercontent'
  | 'naver_phone'
  | 'soomgo'
  | 'daum_nate'
  | 'referral'
  | 'etc';

export type WorkType = '옥상' | '외벽' | '화장실' | '지하' | '베란다' | '기타';

export type ContractStatus = '진행중' | 'Won' | 'Lost';

export type PipelineStage =
  | '문의접수'
  | '연락대기'
  | '견적서전송'
  | '한달이상걸림'
  | '계약중'
  | '착수금대기'
  | '착수금완료'
  | '공사중'
  | '잔금대기'
  | '잔금완료'
  | '정산대기'
  | '정산완료'
  | '보수완료';

export const PIPELINE_STAGES: PipelineStage[] = [
  '문의접수',
  '연락대기',
  '견적서전송',
  '한달이상걸림',
  '계약중',
  '착수금대기',
  '착수금완료',
  '공사중',
  '잔금대기',
  '잔금완료',
  '정산대기',
  '정산완료',
  '보수완료',
];

export const CHANNEL_LABELS: Record<InquiryChannel, string> = {
  naver_powerlink: '네이버 파워링크',
  naver_powercontent: '네이버 파워컨텐츠',
  naver_phone: '네이버 전화',
  soomgo: '숨고',
  daum_nate: '다음/네이트',
  referral: '소개/재시공',
  etc: '기타',
};

export const WORK_TYPE_OPTIONS: WorkType[] = [
  '옥상',
  '외벽',
  '화장실',
  '지하',
  '베란다',
  '기타',
];

export interface Inquiry {
  id: string;
  created_at: string;
  updated_at: string;
  channel: InquiryChannel;
  utm_medium: string | null;
  utm_keyword: string | null;
  first_response_at: string | null;
  stage_changed_at: string | null;
  address: string;
  client_name: string | null;
  phone: string | null;
  work_type: WorkType | null;
  estimate_amount: number | null;
  contract_amount: number | null;
  area_sqm: number | null;
  memo: string | null;
  proposal_sent: boolean;
  ir_inspection: boolean;
  case_documented: boolean;
  pipeline_stage: PipelineStage;
  contract_status: ContractStatus;
  manager: string | null;
  referral_source: string | null;
  legacy_crm_id: string | null;
  drive_url: string | null;
  estimate_web_url: string | null;
}

export interface InquiryCreate {
  address: string;
  client_name?: string;
  phone?: string;
  channel?: InquiryChannel;
  work_type?: WorkType;
  manager?: string;
  memo?: string;
  referral_source?: string;
  estimate_amount?: number;
  contract_amount?: number;
  area_sqm?: number;
}

export type InquiryUpdate = Partial<Omit<Inquiry, 'id' | 'created_at' | 'updated_at'>>;

// ── Won 판정: contract_status = 'Won' 또는 pipeline이 '계약중' 이후 ──

const WON_STAGES: PipelineStage[] = [
  '계약중',
  '착수금대기',
  '착수금완료',
  '공사중',
  '잔금대기',
  '잔금완료',
  '정산대기',
  '정산완료',
  '보수완료',
];

export function isWon(inquiry: Inquiry): boolean {
  return (
    inquiry.contract_status === 'Won' ||
    WON_STAGES.includes(inquiry.pipeline_stage)
  );
}

export function isLost(inquiry: Inquiry): boolean {
  return inquiry.contract_status === 'Lost';
}
