/**
 * Notion Calendar → Supabase 마이그레이션 스크립트
 *
 * 실행: npx tsx scripts/migrate-calendar.ts
 *
 * 필요 환경변수:
 *   NOTION_CALENDAR_TOKEN, NOTION_CALENDAR_SCHED_DB, NOTION_CALENDAR_MEMBER_DB
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn('.env.local 파일을 찾을 수 없습니다.');
  }
}

loadEnvLocal();

// ── Notion fetch ──

const NOTION_BASE = 'https://api.notion.com/v1';

async function notionFetch(
  endpoint: string,
  method = 'GET',
  body?: unknown,
  token?: string,
  version = '2022-06-28'
): Promise<unknown> {
  const t = token ?? process.env.NOTION_CALENDAR_TOKEN;
  if (!t) throw new Error('NOTION_CALENDAR_TOKEN 환경변수 필요');

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${t}`,
      'Notion-Version': version,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${NOTION_BASE}${endpoint}`, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API [${res.status}]: ${err}`);
  }
  return res.json();
}

// ── Types ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionPage = { id: string; properties: Record<string, any> };

interface EventRow {
  notion_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  type: string;
  action: string | null;
  color: string;
  member_name: string | null;
  crm_customer_id: string | null;
  crm_customer_name: string | null;
  memo: string | null;
  created_at?: string;
  updated_at?: string;
}

interface MemberRow {
  notion_id: string;
  name: string;
  color: string;
}

const TYPE_COLOR_MAP: Record<string, string> = {
  방문: '#3B82F6',
  시공: '#10B981',
  미팅: '#8B5CF6',
  기타: '#6B7280',
};

const MEMBER_COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  purple: '#8B5CF6',
  orange: '#F97316',
  pink: '#EC4899',
  gray: '#6B7280',
};

// ── Parsers ──

function parseEvent(page: NotionPage): EventRow {
  const p = page.properties;

  const titleProp = p['이벤트'] ?? p['제목'];
  const title = titleProp?.title?.[0]?.plain_text ?? '(제목 없음)';

  const dateProp = p['날짜'];
  const start = dateProp?.date?.start ?? '';
  const end = dateProp?.date?.end ?? null;
  const allDay = Boolean(start && !start.includes('T'));

  const type = p['타입']?.select?.name ?? '기타';
  const action = p['액션']?.select?.name ?? null;

  let memberName: string | null = null;
  const memberProp = p['담당자'];
  if (memberProp?.people?.[0]?.name) {
    memberName = memberProp.people[0].name;
  }

  let crmCustomerId: string | null = null;
  let crmCustomerName: string | null = null;
  if (p['고객']?.relation?.[0]?.id) {
    crmCustomerId = p['고객'].relation[0].id;
  }
  const crmNameProp = p['고객명'];
  if (crmNameProp?.formula?.string) {
    crmCustomerName = crmNameProp.formula.string;
  } else if (crmNameProp?.rollup?.array?.[0]?.title?.[0]?.plain_text) {
    crmCustomerName = crmNameProp.rollup.array[0].title[0].plain_text;
  }

  const memo = p['메모']?.rich_text?.[0]?.plain_text ?? null;

  return {
    notion_id: page.id,
    title,
    start_at: start,
    end_at: end,
    all_day: allDay,
    type,
    action,
    color: TYPE_COLOR_MAP[type] ?? TYPE_COLOR_MAP.기타,
    member_name: memberName,
    crm_customer_id: crmCustomerId,
    crm_customer_name: crmCustomerName,
    memo,
  };
}

function parseMember(page: NotionPage): MemberRow {
  const p = page.properties;
  const nameProp = p['이름'] ?? p['Name'];
  const name = nameProp?.title?.[0]?.plain_text ?? '(이름 없음)';

  const colorProp = p['색상'];
  const colorName = colorProp?.select?.name ?? colorProp?.select?.color ?? '';
  const color = MEMBER_COLOR_MAP[colorName] ?? '#6B7280';

  return { notion_id: page.id, name, color };
}

// ── Fetch all ──

async function fetchAllEvents(): Promise<EventRow[]> {
  const dbId = process.env.NOTION_CALENDAR_SCHED_DB;
  if (!dbId) throw new Error('NOTION_CALENDAR_SCHED_DB 환경변수 필요');

  const events: EventRow[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const body: Record<string, unknown> = {
      sorts: [{ property: '날짜', direction: 'descending' }],
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const result = (await notionFetch(`/databases/${dbId}/query`, 'POST', body)) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };

    for (const page of result.results) {
      events.push(parseEvent(page));
    }

    hasMore = result.has_more;
    cursor = result.next_cursor ?? undefined;
  }

  return events;
}

async function fetchAllMembers(): Promise<MemberRow[]> {
  const dbId = process.env.NOTION_CALENDAR_MEMBER_DB;
  if (!dbId) {
    console.log('  NOTION_CALENDAR_MEMBER_DB 미설정 — 멤버 마이그레이션 스킵');
    return [];
  }

  const result = (await notionFetch(`/databases/${dbId}/query`, 'POST', {
    sorts: [{ property: '이름', direction: 'ascending' }],
    page_size: 50,
  })) as { results: NotionPage[] };

  return (result.results ?? []).map(parseMember);
}

// ── Main ──

async function main() {
  console.log('=== 캘린더 마이그레이션 시작 ===\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase 환경변수 필요');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 멤버 마이그레이션
  console.log('[1/4] Notion 멤버 읽는 중...');
  const members = await fetchAllMembers();
  console.log(`  → 멤버 ${members.length}건`);

  if (members.length > 0) {
    const { count: existingMembers } = await supabase
      .from('calendar_members')
      .select('*', { count: 'exact', head: true });

    if (existingMembers && existingMembers > 0) {
      console.log(`  ⚠ calendar_members에 이미 ${existingMembers}건 존재. 스킵.`);
    } else {
      const { error } = await supabase.from('calendar_members').insert(members);
      if (error) throw new Error(`멤버 삽입 실패: ${error.message}`);
      console.log(`  → ${members.length}건 삽입 완료`);
    }
  }

  // 2. 이벤트 마이그레이션
  console.log('[2/4] Notion 이벤트 읽는 중...');
  const events = await fetchAllEvents();
  console.log(`  → 이벤트 ${events.length}건`);

  if (events.length === 0) {
    console.log('  ⚠ 이벤트 없음.');
  } else {
    const { count: existingEvents } = await supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true });

    if (existingEvents && existingEvents > 0) {
      console.log(`  ⚠ calendar_events에 이미 ${existingEvents}건 존재. 스킵.`);
    } else {
      const BATCH = 50;
      let inserted = 0;
      for (let i = 0; i < events.length; i += BATCH) {
        const batch = events.slice(i, i + BATCH);
        const { error } = await supabase.from('calendar_events').insert(batch);
        if (error) throw new Error(`이벤트 배치 삽입 실패: ${error.message}`);
        inserted += batch.length;
        console.log(`  → ${inserted}/${events.length} 삽입`);
      }
    }
  }

  // 3. 검증
  console.log('[3/4] 검증 중...');

  const { count: sbMembers } = await supabase
    .from('calendar_members')
    .select('*', { count: 'exact', head: true });
  const { count: sbEvents } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true });

  console.log('\n=== 마이그레이션 검증 ===');
  console.log(`Notion 멤버: ${members.length}건 → Supabase: ${sbMembers}건 ${members.length === sbMembers ? '✅' : '❌'}`);
  console.log(`Notion 이벤트: ${events.length}건 → Supabase: ${sbEvents}건 ${events.length === sbEvents ? '✅' : '❌'}`);

  // 샘플 검증
  const { data: samples } = await supabase
    .from('calendar_events')
    .select('title, start_at, type')
    .limit(3);

  console.log('\n샘플:');
  for (const s of samples ?? []) {
    console.log(`  ${s.title} | ${s.start_at} | ${s.type}`);
  }

  console.log('\n=== 캘린더 마이그레이션 완료 ===');
}

main().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
