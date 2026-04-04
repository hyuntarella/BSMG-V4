// ── Supabase CRM CRUD functions ──
// lib/notion/crm.ts 1:1 대체. 함수 시그니처 + 반환 형식 동일.

import { createClient } from '@supabase/supabase-js';
import type {
  CrmRecord,
  CrmRecordCreate,
  CrmRecordUpdate,
  CrmComment,
} from './crm-types';

// ── Supabase 서버 클라이언트 (service role — API route에서만 사용) ──

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수 필요');
  }
  return createClient(url, key);
}

// ── DB row → CrmRecord 변환 ──

interface CrmCustomerRow {
  id: string;
  notion_id: string | null;
  address: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  manager: string | null;
  stage: string | null;
  pipeline: string | null;
  contract_status: string | null;
  inquiry_channel: string | null;
  work_types: string[] | null;
  estimate_amount: number | null;
  contract_amount: number | null;
  deposit: number | null;
  balance: number | null;
  area: string | null;
  memo: string | null;
  inquiry_date: string | null;
  visit_date: string | null;
  balance_complete_date: string | null;
  estimate_sent_date: string | null;
  estimate_viewed_date: string | null;
  drive_url: string | null;
  estimate_web_url: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: CrmCustomerRow): CrmRecord {
  return {
    id: row.id,
    address: row.address,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    manager: row.manager,
    stage: row.stage,
    pipeline: row.pipeline,
    contractStatus: row.contract_status,
    inquiryChannel: row.inquiry_channel,
    workTypes: row.work_types ?? [],
    estimateAmount: row.estimate_amount,
    contractAmount: row.contract_amount,
    deposit: row.deposit,
    balance: row.balance,
    area: row.area,
    memo: row.memo,
    inquiryDate: row.inquiry_date,
    visitDate: row.visit_date,
    balanceCompleteDate: row.balance_complete_date,
    estimateSentDate: row.estimate_sent_date,
    estimateViewedDate: row.estimate_viewed_date,
    driveUrl: row.drive_url,
    estimateWebUrl: row.estimate_web_url,
    createdTime: row.created_at,
    lastEditedTime: row.updated_at,
  };
}

// ── CrmRecordUpdate → DB 컬럼 변환 ──

function recordToRow(data: CrmRecordUpdate): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (data.address !== undefined) row.address = data.address;
  if (data.customerName !== undefined) row.customer_name = data.customerName;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.email !== undefined) row.email = data.email;
  if (data.manager !== undefined) row.manager = data.manager;
  if (data.stage !== undefined) row.stage = data.stage;
  if (data.pipeline !== undefined) row.pipeline = data.pipeline;
  if (data.contractStatus !== undefined) row.contract_status = data.contractStatus;
  if (data.inquiryChannel !== undefined) row.inquiry_channel = data.inquiryChannel;
  if (data.workTypes !== undefined) row.work_types = data.workTypes;
  if (data.estimateAmount !== undefined) row.estimate_amount = data.estimateAmount;
  if (data.contractAmount !== undefined) row.contract_amount = data.contractAmount;
  if (data.deposit !== undefined) row.deposit = data.deposit;
  if (data.balance !== undefined) row.balance = data.balance;
  if (data.area !== undefined) row.area = data.area;
  if (data.memo !== undefined) row.memo = data.memo;
  if (data.inquiryDate !== undefined) row.inquiry_date = data.inquiryDate;
  if (data.visitDate !== undefined) row.visit_date = data.visitDate;
  if (data.balanceCompleteDate !== undefined) row.balance_complete_date = data.balanceCompleteDate;
  if (data.estimateSentDate !== undefined) row.estimate_sent_date = data.estimateSentDate;
  if (data.estimateViewedDate !== undefined) row.estimate_viewed_date = data.estimateViewedDate;
  if (data.driveUrl !== undefined) row.drive_url = data.driveUrl;
  if (data.estimateWebUrl !== undefined) row.estimate_web_url = data.estimateWebUrl;

  return row;
}

// ── CRUD functions ──

/**
 * 전체 CRM 레코드 조회 (last_edited_time 내림차순)
 */
export async function getAllRecords(): Promise<CrmRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('crm_customers')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`CRM 조회 실패: ${error.message}`);
  return (data as CrmCustomerRow[]).map(rowToRecord);
}

/**
 * 단일 레코드 조회
 */
export async function getPageById(id: string): Promise<CrmRecord> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('crm_customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`CRM 조회 실패: ${error.message}`);
  return rowToRecord(data as CrmCustomerRow);
}

/**
 * 레코드 수정
 */
export async function updateRecord(id: string, data: CrmRecordUpdate): Promise<void> {
  const supabase = getServiceClient();
  const row = recordToRow(data);

  const { error } = await supabase
    .from('crm_customers')
    .update(row)
    .eq('id', id);

  if (error) throw new Error(`CRM 수정 실패: ${error.message}`);
}

/**
 * 새 레코드 생성
 */
export async function createRecord(data: CrmRecordCreate): Promise<CrmRecord> {
  const supabase = getServiceClient();
  const row = recordToRow(data);

  const { data: created, error } = await supabase
    .from('crm_customers')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`CRM 생성 실패: ${error.message}`);
  return rowToRecord(created as CrmCustomerRow);
}

/**
 * 레코드 삭제 (Notion의 archive에 대응 → 실제 삭제)
 */
export async function archiveRecord(id: string): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('crm_customers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`CRM 삭제 실패: ${error.message}`);
}

/**
 * 페이지 댓글 조회
 */
export async function getPageComments(customerId: string): Promise<CrmComment[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('crm_comments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`댓글 조회 실패: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id as string,
    content: c.content as string,
    createdTime: c.created_at as string,
    createdBy: c.author as string | null,
  }));
}

/**
 * 특정 파이프라인 값으로 레코드 조회
 */
export async function queryCrmByPipeline(pipeline: string): Promise<CrmRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('crm_customers')
    .select('*')
    .eq('pipeline', pipeline)
    .order('inquiry_date', { ascending: false });

  if (error) throw new Error(`CRM 파이프라인 조회 실패: ${error.message}`);
  return (data as CrmCustomerRow[]).map(rowToRecord);
}

/**
 * 파이프라인 속성만 업데이트
 */
export async function updateCrmPipeline(pageId: string, newPipeline: string): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('crm_customers')
    .update({ pipeline: newPipeline })
    .eq('id', pageId);

  if (error) throw new Error(`파이프라인 변경 실패: ${error.message}`);
}

/**
 * 견적서 전송 후 성공확률 미배정 건 조회
 */
export async function queryCrmFollowUp(): Promise<CrmRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('crm_customers')
    .select('*')
    .in('pipeline', ['견적서전송', '연락대기'])
    .order('estimate_sent_date', { ascending: true });

  if (error) throw new Error(`CRM 후속 조회 실패: ${error.message}`);
  return (data as CrmCustomerRow[]).map(rowToRecord);
}

/**
 * 댓글 추가
 */
export async function addComment(customerId: string, content: string): Promise<CrmComment> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('crm_comments')
    .insert({ customer_id: customerId, content })
    .select()
    .single();

  if (error) throw new Error(`댓글 추가 실패: ${error.message}`);

  return {
    id: data.id as string,
    content: data.content as string,
    createdTime: data.created_at as string,
    createdBy: data.author as string | null,
  };
}

/**
 * 고객명/주소 검색 (crm/search route용)
 */
export async function searchCustomers(
  query: string,
  limit: number = 8
): Promise<Array<{ id: string; name: string; address: string | null; phone: string | null }>> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('crm_customers')
    .select('id, customer_name, address, phone')
    .or(`customer_name.ilike.%${query}%,address.ilike.%${query}%`)
    .limit(limit);

  if (error) throw new Error(`CRM 검색 실패: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.customer_name as string) || (row.address as string) || '',
    address: (row.address as string) || null,
    phone: (row.phone as string) || null,
  }));
}
