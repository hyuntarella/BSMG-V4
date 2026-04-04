/**
 * Google Calendar → Supabase calendar_events 마이그레이션 스크립트
 *
 * 실행: npx tsx scripts/migrate-gcal.ts
 *
 * 필요 환경변수:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 전제:
 *   - calendar_members 테이블에 멤버 이미 존재
 *   - 서비스 계정에 각 캘린더 읽기 권한 부여 완료
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { google, calendar_v3 } from 'googleapis';

// ── .env.local 수동 로딩 ──

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
      let val = trimmed.slice(eqIdx + 1).trim();
      // 따옴표 제거 (dotenv 호환)
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn('.env.local 파일을 찾을 수 없습니다.');
  }
}

loadEnvLocal();

// ── 캘린더 ID → 멤버 이름 매핑 ──

const CALENDAR_MAP: Record<string, string> = {
  'changyeop.lee@tsn-corp.com': '이창엽',
  'i.jin.jeong@tsn-corp.com': '정인진',
  'lazdor2@gmail.com': '관리자',
  'minwoo.park@tsn-corp.com': '박민우',
};

// ── 타입 컬러 매핑 (기존 migrate-calendar.ts와 동일) ──

const TYPE_COLOR_MAP: Record<string, string> = {
  방문: '#3B82F6',
  시공: '#10B981',
  미팅: '#8B5CF6',
  기타: '#6B7280',
};

// ── Google Calendar 인증 (사용자 위장) ──

function getCalendarClient(targetUserEmail: string) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY 환경변수 필요');
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    subject: targetUserEmail,
  });

  return google.calendar({ version: 'v3', auth });
}

// ── 이벤트 타입 추정 ──

function guessType(summary: string): string {
  const s = summary.toLowerCase();
  if (s.includes('방문') || s.includes('현장') || s.includes('견적')) return '방문';
  if (s.includes('시공') || s.includes('공사') || s.includes('작업')) return '시공';
  if (s.includes('미팅') || s.includes('회의') || s.includes('상담')) return '미팅';
  return '기타';
}

function guessAction(summary: string): string | null {
  if (summary.includes('방문')) return '방문';
  if (summary.includes('견적')) return '견적';
  if (summary.includes('시공') || summary.includes('공사')) return '시공';
  if (summary.includes('하자') || summary.includes('점검')) return '하자점검';
  return null;
}

// ── Google 이벤트 → Supabase Row 변환 ──

interface EventRow {
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  type: string;
  action: string | null;
  color: string;
  member_id: string | null;
  member_name: string | null;
  memo: string | null;
  gcal_id: string;
}

// 무의미/반복 이벤트 필터 목록
const SKIP_TITLES = ['사무실', '휴무', '퇴근', '출근', '점심'];

function parseGCalEvent(
  event: calendar_v3.Schema$Event,
  memberName: string,
  memberIdMap: Record<string, string>,
): EventRow | null {
  const summary = event.summary ?? '(제목 없음)';

  // 무의미 이벤트 스킵
  if (SKIP_TITLES.some(skip => summary.trim() === skip)) return null;

  // start 필수
  const startDate = event.start?.dateTime ?? event.start?.date;
  if (!startDate) return null;

  const endDate = event.end?.dateTime ?? event.end?.date ?? null;
  const allDay = !event.start?.dateTime;

  const type = guessType(summary);
  const action = guessAction(summary);

  const memo = event.description ?? null;

  return {
    title: summary,
    start_at: startDate,
    end_at: endDate,
    all_day: allDay,
    type,
    action,
    color: TYPE_COLOR_MAP[type] ?? TYPE_COLOR_MAP['기타'],
    member_id: memberIdMap[memberName] ?? null,
    member_name: memberName,
    memo,
    gcal_id: event.id ?? '',
  };
}

// ── 메인 ──

async function main() {
  console.log('=== Google Calendar → Supabase 마이그레이션 시작 ===\n');

  // Supabase 클라이언트
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase 환경변수 필요');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. calendar_members 조회 → 이름:ID 맵
  console.log('[1/5] calendar_members 조회...');
  const { data: members, error: memberErr } = await supabase
    .from('calendar_members')
    .select('id, name');
  if (memberErr) throw new Error(`멤버 조회 실패: ${memberErr.message}`);

  const memberIdMap: Record<string, string> = {};
  for (const m of members ?? []) {
    memberIdMap[m.name] = m.id;
  }
  console.log(`  → 멤버 ${Object.keys(memberIdMap).length}명: ${Object.keys(memberIdMap).join(', ')}`);

  // 2. 기존 이벤트 건수 확인
  const { count: existingCount } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true });
  console.log(`  → 기존 calendar_events: ${existingCount ?? 0}건`);

  // 3. Google Calendar에서 최근 6개월 이벤트 수집
  console.log('\n[2/5] Google Calendar 이벤트 수집 중 (6개월)...');
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const timeMin = sixMonthsAgo.toISOString();
  const timeMax = now.toISOString();

  const allEvents: EventRow[] = [];
  const seenGcalIds = new Set<string>();

  // Gmail 계정은 도메인 위임 불가 → 스킵 대상
  const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];

  for (const [calendarId, memberName] of Object.entries(CALENDAR_MAP)) {
    console.log(`  📅 ${memberName} (${calendarId})...`);

    const domain = calendarId.split('@')[1];
    const isGmail = GMAIL_DOMAINS.includes(domain);

    // 각 사용자별 인증 클라이언트 생성 (domain-wide delegation + subject)
    const cal = getCalendarClient(calendarId);

    try {
      let pageToken: string | undefined;
      let calTotal = 0;

      do {
        const res = await cal.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
          pageToken,
        });

        const items = res.data.items ?? [];
        for (const item of items) {
          // 중복 방지 (같은 이벤트가 여러 캘린더에 있을 수 있음)
          if (!item.id || seenGcalIds.has(item.id)) continue;
          seenGcalIds.add(item.id);

          const row = parseGCalEvent(item, memberName, memberIdMap);
          if (row) allEvents.push(row);
        }

        calTotal += items.length;
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);

      console.log(`     → ${calTotal}건 조회`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isGmail) {
        console.warn(`     ⚠ 스킵 (Gmail 계정 — 도메인 위임 불가): ${msg}`);
      } else {
        console.error(`     ❌ 실패: ${msg}`);
      }
    }
  }

  console.log(`\n  → 총 ${allEvents.length}건 수집 (중복 제거 후)`);

  if (allEvents.length === 0) {
    console.log('  ⚠ 이벤트 없음. 종료.');
    return;
  }

  // 3-1. 기존 이벤트와 중복 체크 (title+start_at 조합)
  console.log('\n[3/5] 중복 체크 + Supabase 삽입 중...');
  const { data: existing } = await supabase
    .from('calendar_events')
    .select('title, start_at');
  const existingKeys = new Set(
    (existing ?? []).map((e: { title: string; start_at: string }) => `${e.title}|${e.start_at}`)
  );

  const newEvents = allEvents.filter(
    e => !existingKeys.has(`${e.title}|${e.start_at}`)
  );
  console.log(`  → 중복 제외: ${allEvents.length - newEvents.length}건, 신규: ${newEvents.length}건`);

  if (newEvents.length === 0) {
    console.log('  ⚠ 신규 이벤트 없음. 종료.');
    return;
  }

  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < newEvents.length; i += BATCH) {
    const batch = newEvents.slice(i, i + BATCH);
    // gcal_id는 DB 컬럼에 없으므로 제거
    const rows = batch.map(({ gcal_id, ...rest }) => rest);

    const { error } = await supabase.from('calendar_events').insert(rows);
    if (error) {
      console.error(`  ❌ 배치 ${i}-${i + batch.length} 삽입 실패: ${error.message}`);
      throw error;
    }
    inserted += batch.length;
    console.log(`  → ${inserted}/${newEvents.length} 삽입`);
  }

  // 5. 검증
  console.log('\n[4/5] 검증...');
  const { count: afterCount } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true });

  const newCount = (afterCount ?? 0) - (existingCount ?? 0);
  console.log(`  삽입 전: ${existingCount ?? 0}건`);
  console.log(`  삽입 후: ${afterCount ?? 0}건`);
  console.log(`  신규: ${newCount}건 ${newCount === newEvents.length ? '✅' : '❌ (불일치)'}`);

  // 샘플 출력
  console.log('\n[5/5] 샘플 3건:');
  const { data: samples } = await supabase
    .from('calendar_events')
    .select('title, start_at, type, member_name')
    .order('start_at', { ascending: false })
    .limit(3);

  for (const s of samples ?? []) {
    console.log(`  ${s.start_at} | ${s.member_name} | ${s.type} | ${s.title}`);
  }

  console.log('\n=== Google Calendar 마이그레이션 완료 ===');
}

main().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
