// ── Supabase Calendar CRUD functions ──
// lib/notion/calendar.ts 1:1 대체. 함수 시그니처 + 반환 형식 동일.

import { createClient } from '@supabase/supabase-js';
import type { CalendarEvent, CreateEventInput, CalendarMember } from './calendar-types';

// ── Supabase 서버 클라이언트 ──

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수 필요');
  }
  return createClient(url, key);
}

// ── 타입별 색상 매핑 ──

const TYPE_COLOR_MAP: Record<string, string> = {
  방문: '#3B82F6',
  시공: '#10B981',
  미팅: '#8B5CF6',
  기타: '#6B7280',
};

function getColorByType(type: string | null): string {
  if (!type) return TYPE_COLOR_MAP.기타;
  return TYPE_COLOR_MAP[type] ?? TYPE_COLOR_MAP.기타;
}

// ── DB row → CalendarEvent 변환 ──

interface CalEventRow {
  id: string;
  notion_id: string | null;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  type: string;
  action: string | null;
  color: string;
  member_id: string | null;
  member_name: string | null;
  crm_customer_id: string | null;
  crm_customer_name: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEvent(row: CalEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    start: row.start_at,
    end: row.end_at,
    allDay: row.all_day,
    type: row.type,
    color: row.color || getColorByType(row.type),
    memberName: row.member_name,
    memberId: row.member_id,
    crmCustomerId: row.crm_customer_id,
    crmCustomerName: row.crm_customer_name,
    memo: row.memo,
    action: row.action,
  };
}

// ── CRUD functions ──

/**
 * 날짜 범위 이벤트 조회
 */
export async function getEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_at', start)
    .lte('start_at', end + 'T23:59:59')
    .order('start_at', { ascending: true });

  if (error) throw new Error(`캘린더 조회 실패: ${error.message}`);
  return (data as CalEventRow[]).map(rowToEvent);
}

/**
 * 특정 날짜의 이벤트 조회
 */
export async function getEventsForDate(date: string): Promise<CalendarEvent[]> {
  return getEvents(date, date);
}

/**
 * 새 이벤트 생성
 */
export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const supabase = getServiceClient();

  const allDay = input.allDay ?? (Boolean(input.start && !input.start.includes('T')));

  const row: Record<string, unknown> = {
    title: input.title,
    start_at: input.start,
    end_at: input.end ?? null,
    all_day: allDay,
    type: input.type ?? '기타',
    color: getColorByType(input.type ?? '기타'),
    action: input.action ?? null,
    memo: input.memo ?? null,
    member_id: input.memberId ?? null,
    crm_customer_id: input.crmCustomerId ?? null,
  };

  const { data, error } = await supabase
    .from('calendar_events')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`이벤트 생성 실패: ${error.message}`);
  return rowToEvent(data as CalEventRow);
}

/**
 * 이벤트 수정
 */
export async function updateEvent(id: string, input: Partial<CreateEventInput>): Promise<void> {
  const supabase = getServiceClient();

  const row: Record<string, unknown> = {};

  if (input.title !== undefined) row.title = input.title;
  if (input.start !== undefined) {
    row.start_at = input.start;
    row.all_day = !input.start.includes('T');
  }
  if (input.end !== undefined) row.end_at = input.end;
  if (input.type !== undefined) {
    row.type = input.type;
    row.color = getColorByType(input.type);
  }
  if (input.action !== undefined) row.action = input.action;
  if (input.memo !== undefined) row.memo = input.memo;
  if (input.memberId !== undefined) row.member_id = input.memberId;
  if (input.crmCustomerId !== undefined) row.crm_customer_id = input.crmCustomerId;

  const { error } = await supabase
    .from('calendar_events')
    .update(row)
    .eq('id', id);

  if (error) throw new Error(`이벤트 수정 실패: ${error.message}`);
}

/**
 * 이벤트 삭제
 */
export async function deleteEvent(id: string): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`이벤트 삭제 실패: ${error.message}`);
}

/**
 * 팀원 목록 조회
 */
export async function getMembers(): Promise<CalendarMember[]> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from('calendar_members')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
    }));
  } catch (err) {
    console.error('[getMembers] 오류:', err);
    return [];
  }
}
