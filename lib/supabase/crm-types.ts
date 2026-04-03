// ── CRM Types (Notion → Supabase 이전) ──
// 기존 lib/notion/types.ts의 CRM 관련 타입을 이곳으로 이동
// UI 컴포넌트 인터페이스는 동일하게 유지

export interface CrmRecord {
  id: string;
  address: string;
  customerName: string | null;
  phone: string | null;
  email: string | null;
  manager: string | null;
  stage: string | null;
  pipeline: string | null;
  contractStatus: string | null;
  inquiryChannel: string | null;
  workTypes: string[];
  estimateAmount: number | null;
  contractAmount: number | null;
  deposit: number | null;
  balance: number | null;
  area: string | null;
  memo: string | null;
  inquiryDate: string | null;
  visitDate: string | null;
  balanceCompleteDate: string | null;
  estimateSentDate: string | null;
  estimateViewedDate: string | null;
  driveUrl: string | null;
  estimateWebUrl: string | null;
  createdTime: string;
  lastEditedTime: string;
}

export interface CrmRecordCreate extends Partial<CrmRecord> {
  address: string;
}

export type CrmRecordUpdate = Partial<CrmRecord>;

export interface CrmComment {
  id: string;
  content: string;
  createdTime: string;
  createdBy: string | null;
}

// ── Stage / Pipeline constants ──

export const STAGE_MAP: Record<string, string[]> = {
  '0.문의': ['정보입력완료', '견적일정확정', '견적방문완료', '시간좀걸림', '보류'],
  '1.영업': ['먼저연락X', '견적서전송', '성공확률↓', '가견적전송', '성공확률↑'],
  '1-1.장기': ['대기1', '대기2', '대기3', '내년공사희망', '재연락금지'],
  '2.시공': ['계약중', '착수금완료', '공사중', '잔금대기', '잔금완료'],
  '3.하자': ['하자접수', '보수일정조율중', '보수중', '보수완료'],
};

export const PIPELINE_TO_STAGE: Record<string, string> = Object.entries(STAGE_MAP).reduce(
  (acc, [stage, pipelines]) => {
    for (const pipeline of pipelines) {
      acc[pipeline] = stage;
    }
    return acc;
  },
  {} as Record<string, string>
);
