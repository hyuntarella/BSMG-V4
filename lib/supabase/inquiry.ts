// ── Supabase Inquiry CRUD functions ──
// lib/supabase/crm.ts 패턴 동일. inquiries 테이블 대상.

import { createClient } from '@supabase/supabase-js';
import type {
  Inquiry,
  InquiryCreate,
  InquiryUpdate,
  PipelineStage,
} from './inquiry-types';

// ── Supabase 서버 클라이언트 (service role — API route에서만 사용) ──

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수 필요');
  }
  return createClient(url, key);
}

// ── CRUD ──

/** 전체 문의 조회 (최신순) */
export async function getAllInquiries(): Promise<Inquiry[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`문의 조회 실패: ${error.message}`);
  return data as Inquiry[];
}

/** 단건 조회 */
export async function getInquiryById(id: string): Promise<Inquiry> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`문의 조회 실패: ${error.message}`);
  return data as Inquiry;
}

/** 생성 */
export async function createInquiry(input: InquiryCreate): Promise<Inquiry> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('inquiries')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`문의 생성 실패: ${error.message}`);
  return data as Inquiry;
}

/** 수정 */
export async function updateInquiry(id: string, input: InquiryUpdate): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('inquiries')
    .update(input)
    .eq('id', id);

  if (error) throw new Error(`문의 수정 실패: ${error.message}`);
}

/** 파이프라인 단계 이동 */
export async function updatePipelineStage(
  id: string,
  stage: PipelineStage
): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('inquiries')
    .update({ pipeline_stage: stage })
    .eq('id', id);

  if (error) throw new Error(`파이프라인 변경 실패: ${error.message}`);
}

/** 삭제 */
export async function deleteInquiry(id: string): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('inquiries')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`문의 삭제 실패: ${error.message}`);
}

/** 주소/고객명 검색 */
export async function searchInquiries(
  query: string,
  limit: number = 8
): Promise<Array<{ id: string; address: string; client_name: string | null; phone: string | null }>> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('inquiries')
    .select('id, address, client_name, phone')
    .or(`client_name.ilike.%${query}%,address.ilike.%${query}%`)
    .limit(limit);

  if (error) throw new Error(`문의 검색 실패: ${error.message}`);
  return (data ?? []) as Array<{ id: string; address: string; client_name: string | null; phone: string | null }>;
}

/** 특정 파이프라인 단계 건 조회 */
export async function queryByPipelineStage(stage: PipelineStage): Promise<Inquiry[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('pipeline_stage', stage)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`파이프라인 조회 실패: ${error.message}`);
  return data as Inquiry[];
}

/** 후속 조치 필요 건 (연락대기 + 견적서전송) */
export async function queryFollowUp(): Promise<Inquiry[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .in('pipeline_stage', ['연락대기', '견적서전송'])
    .order('stage_changed_at', { ascending: true });

  if (error) throw new Error(`후속 조회 실패: ${error.message}`);
  return data as Inquiry[];
}

/** 미발송 건 (문의접수 + 견적금액 null) */
export async function queryUnsent(): Promise<Inquiry[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('pipeline_stage', '문의접수')
    .is('estimate_amount', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`미발송 조회 실패: ${error.message}`);
  return data as Inquiry[];
}
