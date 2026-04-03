/**
 * CRM 데이터 교차 검증 — Notion vs Supabase 비교
 * 실행: npx tsx scripts/verify-crm-data.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

const NOTION_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2025-09-03';

async function notionFetch(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
  const token = process.env.NOTION_CRM_TOKEN;
  if (!token) throw new Error('NOTION_CRM_TOKEN 필요');
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${NOTION_BASE}${endpoint}`, options);
  if (!res.ok) throw new Error(`Notion [${res.status}]: ${await res.text()}`);
  return res.json();
}

interface NotionPage {
  id: string;
  archived: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

async function main() {
  const dbId = process.env.NOTION_CRM_DATA_SOURCE_ID;
  console.log(`NOTION_CRM_DATA_SOURCE_ID = ${dbId}\n`);

  // ── Notion 전체 레코드 수 ──
  const notionRecords: NotionPage[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const body: Record<string, unknown> = {
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    };
    if (cursor) body.start_cursor = cursor;

    const result = (await notionFetch(`/data_sources/${dbId}/query`, 'POST', body)) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };

    for (const page of result.results) {
      if (!page.archived) notionRecords.push(page);
    }
    hasMore = result.has_more;
    cursor = result.next_cursor ?? undefined;
  }

  console.log(`Notion 전체 레코드 수: ${notionRecords.length}건`);

  // ── Supabase 전체 레코드 수 ──
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { count } = await supabase
    .from('crm_customers')
    .select('*', { count: 'exact', head: true });

  console.log(`Supabase 전체 레코드 수: ${count}건`);
  console.log(`일치 여부: ${notionRecords.length === count ? '✅' : '❌'}\n`);

  // ── 첫 5건 비교 ──
  console.log('=== Notion 첫 5건 (최근 수정순) ===');
  for (let i = 0; i < Math.min(5, notionRecords.length); i++) {
    const p = notionRecords[i].properties;
    const addr = p['주소']?.title?.[0]?.plain_text ?? '(없음)';
    const name = p['고객명']?.rich_text?.[0]?.plain_text ?? '(없음)';
    const phone = p['전화번호']?.phone_number ?? '(없음)';
    const pipeline = p['파이프라인 단계']?.select?.name ?? '(없음)';
    console.log(`  ${i + 1}. ${name} | ${addr} | ${phone} | ${pipeline}`);
  }

  console.log('\n=== Supabase 첫 5건 (최근 수정순) ===');
  const { data: sbRecords } = await supabase
    .from('crm_customers')
    .select('customer_name, address, phone, pipeline')
    .order('updated_at', { ascending: false })
    .limit(5);

  for (let i = 0; i < (sbRecords?.length ?? 0); i++) {
    const r = sbRecords![i];
    console.log(`  ${i + 1}. ${r.customer_name ?? '(없음)'} | ${r.address ?? '(없음)'} | ${r.phone ?? '(없음)'} | ${r.pipeline ?? '(없음)'}`);
  }
}

main().catch((err) => {
  console.error('오류:', err);
  process.exit(1);
});
