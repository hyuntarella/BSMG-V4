/**
 * Notion CRM → Supabase crm_customers 마이그레이션 스크립트
 *
 * 실행: npx tsx scripts/migrate-crm.ts
 *
 * 필요 환경변수:
 *   NOTION_CRM_TOKEN
 *   NOTION_CRM_DATA_SOURCE_ID
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    console.warn('.env.local 파일을 찾을 수 없습니다. 환경변수를 직접 설정하세요.');
  }
}

loadEnvLocal();

// ── Notion fetch helper (lib/notion/client.ts 복사 — tsx 실행이라 직접 import 불가) ──

const NOTION_VERSION = '2025-09-03';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

async function notionFetch(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
  const token = process.env.NOTION_CRM_TOKEN;
  if (!token) throw new Error('NOTION_CRM_TOKEN 환경변수 필요');

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${NOTION_BASE_URL}${endpoint}`, options);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notion API [${res.status}]: ${errText}`);
  }
  return res.json();
}

// ── Notion 페이지 파싱 (lib/notion/crm.ts parseNotionPage 복사) ──

interface NotionPage {
  id: string;
  archived: boolean;
  created_time: string;
  last_edited_time: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

interface CrmRow {
  notion_id: string;
  address: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  manager: string | null;
  stage: string | null;
  pipeline: string | null;
  contract_status: string | null;
  inquiry_channel: string | null;
  work_types: string[];
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

function parseNotionPage(page: NotionPage): CrmRow {
  const p = page.properties;
  return {
    notion_id: page.id,
    address: p['주소']?.title?.[0]?.plain_text ?? '',
    customer_name: p['고객명']?.rich_text?.[0]?.plain_text ?? null,
    phone: p['전화번호']?.phone_number ?? null,
    email: p['고객이메일']?.email ?? null,
    manager: p['담당자']?.select?.name ?? null,
    stage: p['단계']?.select?.name ?? null,
    pipeline: p['파이프라인 단계']?.select?.name ?? null,
    contract_status: p['계약상태']?.select?.name ?? null,
    inquiry_channel: p['문의 채널']?.select?.name ?? null,
    work_types: p['시공분야']?.multi_select?.map((s: { name: string }) => s.name) ?? [],
    estimate_amount: p['견적 금액']?.number ?? null,
    contract_amount: p['계약금액']?.number ?? null,
    deposit: p['착수금']?.number ?? null,
    balance: p['잔금']?.number ?? null,
    area: p['시공 평수']?.rich_text?.[0]?.plain_text ?? null,
    memo: p['메모']?.rich_text?.[0]?.plain_text ?? null,
    inquiry_date: p['문의 일자']?.date?.start ?? null,
    visit_date: p['견적 방문 일자']?.date?.start ?? null,
    balance_complete_date: p['잔금완료']?.date?.start ?? null,
    estimate_sent_date: p['견적서발송일']?.date?.start ?? null,
    estimate_viewed_date: p['견적서열람일']?.date?.start ?? null,
    drive_url: p['구글드라이브 URL']?.url ?? null,
    estimate_web_url: p['견적서웹URL']?.url ?? null,
    created_at: page.created_time,
    updated_at: page.last_edited_time,
  };
}

// ── Notion 전체 레코드 가져오기 ──

async function fetchAllNotionRecords(): Promise<{ pages: NotionPage[]; parsed: CrmRow[] }> {
  const dbId = process.env.NOTION_CRM_DATA_SOURCE_ID;
  if (!dbId) throw new Error('NOTION_CRM_DATA_SOURCE_ID 환경변수 필요');

  const pages: NotionPage[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const body: Record<string, unknown> = {
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    };
    if (startCursor) body.start_cursor = startCursor;

    const result = (await notionFetch(`/data_sources/${dbId}/query`, 'POST', body)) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };

    for (const page of result.results) {
      if (!page.archived) pages.push(page);
    }

    hasMore = result.has_more;
    startCursor = result.next_cursor ?? undefined;
  }

  const parsed = pages.map(parseNotionPage);
  return { pages, parsed };
}

// ── Notion 댓글 가져오기 ──

interface NotionComment {
  id: string;
  created_time: string;
  created_by?: { name?: string };
  rich_text: Array<{ plain_text: string }>;
}

async function fetchCommentsForPage(pageId: string): Promise<NotionComment[]> {
  try {
    const result = (await notionFetch(`/comments?block_id=${pageId}`, 'GET')) as {
      results: NotionComment[];
    };
    return result.results ?? [];
  } catch {
    // 댓글 API 실패 시 빈 배열 (권한 문제 등)
    return [];
  }
}

// ── Main ──

async function main() {
  console.log('=== CRM 마이그레이션 시작 ===\n');

  // 1. 환경변수 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수 필요');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Notion에서 전체 데이터 읽기
  console.log('[1/5] Notion에서 데이터 읽는 중...');
  const { pages, parsed } = await fetchAllNotionRecords();
  console.log(`  → Notion 고객 레코드: ${parsed.length}건`);

  if (parsed.length === 0) {
    console.log('  ⚠ 데이터 없음. 중단.');
    return;
  }

  // 3. 기존 데이터 확인 (중복 방지)
  console.log('[2/5] Supabase 기존 데이터 확인...');
  const { count: existingCount } = await supabase
    .from('crm_customers')
    .select('*', { count: 'exact', head: true });

  if (existingCount && existingCount > 0) {
    console.log(`  ⚠ crm_customers에 이미 ${existingCount}건 존재. 중복 방지를 위해 중단.`);
    console.log('  → 재실행하려면 먼저 TRUNCATE crm_customers CASCADE; 실행');
    return;
  }

  // 4. Supabase에 고객 데이터 삽입 (50건 배치)
  console.log('[3/5] Supabase에 고객 데이터 삽입 중...');
  const BATCH_SIZE = 50;
  let insertedCustomers = 0;

  for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
    const batch = parsed.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('crm_customers').insert(batch);
    if (error) {
      console.error(`  ✗ 배치 ${i}-${i + batch.length} 삽입 실패:`, error.message);
      throw error;
    }
    insertedCustomers += batch.length;
    console.log(`  → ${insertedCustomers}/${parsed.length} 삽입 완료`);
  }

  // 5. 댓글 마이그레이션
  console.log('[4/5] 댓글 마이그레이션 중...');

  // notion_id → supabase id 매핑
  const { data: allCustomers } = await supabase
    .from('crm_customers')
    .select('id, notion_id');

  const notionToSupabase = new Map<string, string>();
  for (const c of allCustomers ?? []) {
    if (c.notion_id) notionToSupabase.set(c.notion_id, c.id);
  }

  let totalComments = 0;
  let failedCommentPages = 0;

  for (const page of pages) {
    const supabaseId = notionToSupabase.get(page.id);
    if (!supabaseId) continue;

    const comments = await fetchCommentsForPage(page.id);
    if (comments.length === 0) continue;

    const rows = comments.map((c) => ({
      customer_id: supabaseId,
      content: c.rich_text?.[0]?.plain_text ?? '',
      author: c.created_by?.name ?? null,
      created_at: c.created_time,
    }));

    const { error } = await supabase.from('crm_comments').insert(rows);
    if (error) {
      console.warn(`  ⚠ 댓글 삽입 실패 (${page.id}): ${error.message}`);
      failedCommentPages++;
    } else {
      totalComments += rows.length;
    }

    // Notion API rate limit 대비
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log(`  → 댓글 ${totalComments}건 삽입 완료 (실패 페이지: ${failedCommentPages})`);

  // 6. 검증
  console.log('[5/5] 검증 중...');

  const { count: sbCustomerCount } = await supabase
    .from('crm_customers')
    .select('*', { count: 'exact', head: true });

  const { count: sbCommentCount } = await supabase
    .from('crm_comments')
    .select('*', { count: 'exact', head: true });

  // 샘플 3건 교차 검증
  const { data: samples } = await supabase
    .from('crm_customers')
    .select('*')
    .limit(3);

  console.log('\n=== 마이그레이션 검증 ===');
  console.log(`Notion 고객 레코드: ${parsed.length}건`);
  console.log(`Supabase 고객 레코드: ${sbCustomerCount}건`);
  console.log(`일치 여부: ${parsed.length === sbCustomerCount ? '✅' : '❌'}`);
  console.log('');
  console.log(`Notion 댓글 레코드: ${totalComments}건 (삽입 성공분)`);
  console.log(`Supabase 댓글 레코드: ${sbCommentCount}건`);
  console.log(`일치 여부: ${totalComments === sbCommentCount ? '✅' : '❌'}`);
  console.log('');
  console.log('필드별 샘플 검증:');

  for (const s of samples ?? []) {
    const notionOriginal = parsed.find((p) => p.notion_id === s.notion_id);
    if (!notionOriginal) {
      console.log(`  ${s.customer_name ?? s.address}: notion_id 매칭 실패 ❌`);
      continue;
    }
    const checks = [
      ['주소', s.address === notionOriginal.address],
      ['고객명', s.customer_name === notionOriginal.customer_name],
      ['전화', s.phone === notionOriginal.phone],
      ['파이프라인', s.pipeline === notionOriginal.pipeline],
      ['견적금액', s.estimate_amount === notionOriginal.estimate_amount],
    ];
    const allPass = checks.every(([, ok]) => ok);
    const detail = checks.map(([name, ok]) => `${name} ${ok ? '✅' : '❌'}`).join(', ');
    console.log(`  ${s.customer_name ?? s.address}: ${detail} → ${allPass ? '✅' : '❌'}`);
  }

  console.log('\n=== 마이그레이션 완료 ===');
}

main().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
