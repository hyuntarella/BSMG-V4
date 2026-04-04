/**
 * CRM API 응답 형식 호환성 테스트
 * lib/supabase/crm.ts 함수들이 기존 Notion CRM과 동일한 인터페이스를 반환하는지 검증.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getAllRecords,
  getPageById,
  createRecord,
  updateRecord,
  archiveRecord,
  getPageComments,
  addComment,
  queryCrmByPipeline,
  updateCrmPipeline,
  searchCustomers,
} from '@/lib/supabase/crm';
import type { CrmRecord, CrmComment } from '@/lib/supabase/crm-types';

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
let testRecordId: string;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수 필요');
  supabase = createClient(url, key);
});

afterAll(async () => {
  if (testRecordId) {
    await supabase.from('crm_customers').delete().eq('id', testRecordId);
  }
});

// CrmRecord 필수 필드 검증 헬퍼
function assertCrmRecordShape(record: CrmRecord) {
  expect(typeof record.id).toBe('string');
  expect(typeof record.address).toBe('string');
  expect(record).toHaveProperty('customerName');
  expect(record).toHaveProperty('phone');
  expect(record).toHaveProperty('email');
  expect(record).toHaveProperty('manager');
  expect(record).toHaveProperty('stage');
  expect(record).toHaveProperty('pipeline');
  expect(record).toHaveProperty('contractStatus');
  expect(record).toHaveProperty('inquiryChannel');
  expect(Array.isArray(record.workTypes)).toBe(true);
  expect(record).toHaveProperty('estimateAmount');
  expect(record).toHaveProperty('contractAmount');
  expect(record).toHaveProperty('deposit');
  expect(record).toHaveProperty('balance');
  expect(record).toHaveProperty('area');
  expect(record).toHaveProperty('memo');
  expect(record).toHaveProperty('inquiryDate');
  expect(record).toHaveProperty('visitDate');
  expect(record).toHaveProperty('balanceCompleteDate');
  expect(record).toHaveProperty('estimateSentDate');
  expect(record).toHaveProperty('estimateViewedDate');
  expect(record).toHaveProperty('driveUrl');
  expect(record).toHaveProperty('estimateWebUrl');
  expect(typeof record.createdTime).toBe('string');
  expect(typeof record.lastEditedTime).toBe('string');
}

describe('CRM API 응답 형식 호환성', () => {
  test('createRecord → CrmRecord 반환', async () => {
    const record = await createRecord({
      address: 'API호환테스트 주소',
      customerName: 'API호환고객',
      pipeline: '정보입력단계',
    });

    assertCrmRecordShape(record);
    expect(record.address).toBe('API호환테스트 주소');
    expect(record.customerName).toBe('API호환고객');
    testRecordId = record.id;
  });

  test('getAllRecords → CrmRecord[] 배열 반환', async () => {
    const records = await getAllRecords();

    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    assertCrmRecordShape(records[0]);
  });

  test('getPageById → CrmRecord 반환', async () => {
    const record = await getPageById(testRecordId);

    assertCrmRecordShape(record);
    expect(record.id).toBe(testRecordId);
    expect(record.address).toBe('API호환테스트 주소');
  });

  test('updateRecord → void (에러 없음)', async () => {
    await expect(
      updateRecord(testRecordId, { pipeline: '견적서전송', memo: '수정 테스트' })
    ).resolves.toBeUndefined();

    const updated = await getPageById(testRecordId);
    expect(updated.pipeline).toBe('견적서전송');
    expect(updated.memo).toBe('수정 테스트');
  });

  test('queryCrmByPipeline → CrmRecord[] 반환', async () => {
    const records = await queryCrmByPipeline('견적서전송');

    expect(Array.isArray(records)).toBe(true);
    if (records.length > 0) {
      assertCrmRecordShape(records[0]);
      expect(records.every((r) => r.pipeline === '견적서전송')).toBe(true);
    }
  });

  test('updateCrmPipeline → void (에러 없음)', async () => {
    await expect(
      updateCrmPipeline(testRecordId, '성공확률50▲')
    ).resolves.toBeUndefined();

    const updated = await getPageById(testRecordId);
    expect(updated.pipeline).toBe('성공확률50▲');
  });

  test('addComment → CrmComment 반환', async () => {
    const comment = await addComment(testRecordId, '호환성 테스트 댓글');

    expect(typeof comment.id).toBe('string');
    expect(comment.content).toBe('호환성 테스트 댓글');
    expect(typeof comment.createdTime).toBe('string');
    expect(comment).toHaveProperty('createdBy');
  });

  test('getPageComments → CrmComment[] 반환', async () => {
    const comments = await getPageComments(testRecordId);

    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBeGreaterThanOrEqual(1);

    const c = comments[0];
    expect(typeof c.id).toBe('string');
    expect(typeof c.content).toBe('string');
    expect(typeof c.createdTime).toBe('string');
    expect(c).toHaveProperty('createdBy');
  });

  test('searchCustomers → {id, name}[] 반환', async () => {
    const results = await searchCustomers('API호환', 5);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('name');
    expect(typeof results[0].id).toBe('string');
    expect(typeof results[0].name).toBe('string');
  });

  test('archiveRecord → void (실제 삭제)', async () => {
    await expect(archiveRecord(testRecordId)).resolves.toBeUndefined();

    // 삭제 확인
    const { data } = await supabase
      .from('crm_customers')
      .select('id')
      .eq('id', testRecordId);
    expect(data!.length).toBe(0);

    // afterAll에서 중복 삭제 방지
    testRecordId = '';
  });
});
