// ── Notion CRM Types ──

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

// ── Notion API raw page type ──

export interface NotionRichText {
  plain_text: string;
}

export interface NotionSelect {
  name: string;
}

export interface NotionDate {
  start: string;
}

export interface NotionProperties {
  주소?: { title: NotionRichText[] };
  고객명?: { rich_text: NotionRichText[] };
  시공평수?: { rich_text: NotionRichText[] };
  전화번호?: { phone_number: string | null };
  담당자?: { select: NotionSelect | null };
  단계?: { select: NotionSelect | null };
  파이프라인?: { select: NotionSelect | null };
  계약상태?: { select: NotionSelect | null };
  문의채널?: { select: NotionSelect | null };
  시공분야?: { multi_select: NotionSelect[] };
  견적금액?: { number: number | null };
  계약금액?: { number: number | null };
  착수금?: { number: number | null };
  잔금?: { number: number | null };
  문의일자?: { date: NotionDate | null };
  견적방문일자?: { date: NotionDate | null };
  잔금완료?: { date: NotionDate | null };
  견적서발송일?: { date: NotionDate | null };
  견적서열람일?: { date: NotionDate | null };
  구글드라이브URL?: { url: string | null };
  견적서웹URL?: { url: string | null };
  고객이메일?: { email: string | null };
  메모?: { rich_text: NotionRichText[] };
}

export interface NotionPage {
  id: string;
  archived: boolean;
  created_time: string;
  last_edited_time: string;
  properties: NotionProperties;
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
