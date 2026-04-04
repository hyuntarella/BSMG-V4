/**
 * CRM Supabase CRUD 테스트
 * Supabase 실제 DB에 대해 CRUD 동작을 검증한다.
 * service role key 사용 (RLS 우회).
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 수동 로딩
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }
}

loadEnvLocal();

let supabase: SupabaseClient;
let testCustomerId: string;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수 필요');
  supabase = createClient(url, key);
});

afterAll(async () => {
  // 테스트 생성 데이터 정리
  if (testCustomerId) {
    await supabase.from('crm_customers').delete().eq('id', testCustomerId);
  }
});

describe('CRM Supabase CRUD', () => {
  test('고객 생성', async () => {
    const { data, error } = await supabase
      .from('crm_customers')
      .insert({
        address: '테스트 주소 123',
        customer_name: '테스트고객',
        phone: '010-0000-0000',
        pipeline: '정보입력단계',
        work_types: ['옥상방수', '외벽방수'],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.address).toBe('테스트 주소 123');
    expect(data!.customer_name).toBe('테스트고객');
    expect(data!.work_types).toEqual(['옥상방수', '외벽방수']);
    testCustomerId = data!.id;
  });

  test('고객 조회 (단일)', async () => {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('*')
      .eq('id', testCustomerId)
      .single();

    expect(error).toBeNull();
    expect(data!.customer_name).toBe('테스트고객');
    expect(data!.pipeline).toBe('정보입력단계');
  });

  test('고객 수정', async () => {
    const { error } = await supabase
      .from('crm_customers')
      .update({ pipeline: '견적서전송', estimate_amount: 5000000 })
      .eq('id', testCustomerId);

    expect(error).toBeNull();

    const { data } = await supabase
      .from('crm_customers')
      .select('pipeline, estimate_amount')
      .eq('id', testCustomerId)
      .single();

    expect(data!.pipeline).toBe('견적서전송');
    expect(data!.estimate_amount).toBe(5000000);
  });

  test('고객 검색 (이름)', async () => {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('id, customer_name')
      .ilike('customer_name', '%테스트고객%');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data!.some((r) => r.id === testCustomerId)).toBe(true);
  });

  test('고객 검색 (주소)', async () => {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('id, address')
      .ilike('address', '%테스트 주소%');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  test('댓글 추가', async () => {
    const { data, error } = await supabase
      .from('crm_comments')
      .insert({
        customer_id: testCustomerId,
        content: '테스트 댓글입니다',
        author: '테스트',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.content).toBe('테스트 댓글입니다');
  });

  test('댓글 조회', async () => {
    const { data, error } = await supabase
      .from('crm_comments')
      .select('*')
      .eq('customer_id', testCustomerId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data![0].content).toBe('테스트 댓글입니다');
  });

  test('파이프라인 조회', async () => {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('*')
      .eq('pipeline', '견적서전송');

    expect(error).toBeNull();
    expect(data!.some((r) => r.id === testCustomerId)).toBe(true);
  });

  test('파이프라인 수정', async () => {
    const { error } = await supabase
      .from('crm_customers')
      .update({ pipeline: '성공확률50▲' })
      .eq('id', testCustomerId);

    expect(error).toBeNull();

    const { data } = await supabase
      .from('crm_customers')
      .select('pipeline')
      .eq('id', testCustomerId)
      .single();

    expect(data!.pipeline).toBe('성공확률50▲');
  });

  test('CASCADE 삭제 — 고객 삭제 시 댓글도 삭제', async () => {
    // 댓글 존재 확인
    const { data: commentsBefore } = await supabase
      .from('crm_comments')
      .select('id')
      .eq('customer_id', testCustomerId);
    expect(commentsBefore!.length).toBeGreaterThanOrEqual(1);

    // 고객 삭제
    const { error } = await supabase
      .from('crm_customers')
      .delete()
      .eq('id', testCustomerId);
    expect(error).toBeNull();

    // 댓글도 삭제 확인
    const { data: commentsAfter } = await supabase
      .from('crm_comments')
      .select('id')
      .eq('customer_id', testCustomerId);
    expect(commentsAfter!.length).toBe(0);

    // afterAll에서 중복 삭제 방지
    testCustomerId = '';
  });
});
