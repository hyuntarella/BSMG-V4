// ── Notion Calendar Functions ──
// 캘린더 DB 조회/생성/수정/삭제 (Phase 34에서 전체 CRUD로 확장)

import { notionFetch } from './client';

const calToken = () => process.env.NOTION_CALENDAR_TOKEN;
const CAL_API_VERSION = '2022-06-28';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;        // ISO datetime or YYYY-MM-DD
  end: string | null;
  allDay: boolean;
  type: string;         // 방문, 시공, 미팅, 기타
  color: string;        // type별 매핑 색상
  memberName: string | null;
  memberId: string | null;
  crmCustomerId: string | null;
  crmCustomerName: string | null;
  memo: string | null;
  action: string | null; // 방문, 견적, 시공, 하자점검 등
}

export interface CreateEventInput {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  type?: string;
  memberId?: string;
  crmCustomerId?: string;
  memo?: string;
  action?: string;
}

// 타입별 색상 매핑
const TYPE_COLOR_MAP: Record<string, string> = {
  방문: '#3B82F6',   // blue
  시공: '#10B981',   // green
  미팅: '#8B5CF6',   // purple
  기타: '#6B7280',   // gray
};

function getColorByType(type: string | null): string {
  if (!type) return TYPE_COLOR_MAP.기타;
  return TYPE_COLOR_MAP[type] ?? TYPE_COLOR_MAP.기타;
}

interface NotionCalendarPage {
  id: string;
  properties: Record<string, unknown>;
}

interface NotionQueryResult {
  results: NotionCalendarPage[];
  has_more?: boolean;
  next_cursor?: string | null;
}

/** Notion 페이지 속성에서 CalendarEvent 매핑 */
function mapPageToEvent(page: NotionCalendarPage): CalendarEvent {
  const p = page.properties as Record<string, Record<string, unknown>>;

  // 제목: "이벤트" 또는 "제목" title 속성
  const titleProp = (p['이벤트'] ?? p['제목']) as
    | { title?: Array<{ plain_text?: string }> }
    | undefined;
  const title = titleProp?.title?.[0]?.plain_text ?? '(제목 없음)';

  // 날짜
  const dateProp = p['날짜'] as { date?: { start?: string; end?: string | null } } | undefined;
  const start = dateProp?.date?.start ?? '';
  const end = dateProp?.date?.end ?? null;

  // 하루 종일 여부: 날짜만 있으면 allDay=true
  const allDay = Boolean(start && !start.includes('T'));

  // 타입
  const typeProp = p['타입'] as { select?: { name?: string } } | undefined;
  const type = typeProp?.select?.name ?? '기타';

  // 액션
  const actionProp = p['액션'] as { select?: { name?: string } } | undefined;
  const action = actionProp?.select?.name ?? null;

  // 담당자
  let memberName: string | null = null;
  let memberId: string | null = null;

  const memberRelProp = p['담당자'] as
    | { people?: Array<{ id?: string; name?: string }> }
    | { relation?: Array<{ id?: string }> }
    | undefined;

  if (memberRelProp) {
    const peopleProp = memberRelProp as { people?: Array<{ id?: string; name?: string }> };
    const relProp = memberRelProp as { relation?: Array<{ id?: string }> };
    if (peopleProp.people && peopleProp.people.length > 0) {
      memberName = peopleProp.people[0]?.name ?? null;
      memberId = peopleProp.people[0]?.id ?? null;
    } else if (relProp.relation && relProp.relation.length > 0) {
      memberId = relProp.relation[0]?.id ?? null;
    }
  }

  // CRM 고객 (relation)
  let crmCustomerId: string | null = null;
  let crmCustomerName: string | null = null;
  const crmProp = p['고객'] as
    | { relation?: Array<{ id?: string }> }
    | undefined;
  if (crmProp?.relation && crmProp.relation.length > 0) {
    crmCustomerId = crmProp.relation[0]?.id ?? null;
  }
  // CRM 고객 이름 (formula or rollup — 있으면 추출, 없으면 null)
  const crmNameProp = p['고객명'] as
    | { formula?: { string?: string }; rollup?: { array?: Array<{ title?: Array<{ plain_text?: string }> }> } }
    | undefined;
  if (crmNameProp?.formula?.string) {
    crmCustomerName = crmNameProp.formula.string;
  } else if (crmNameProp?.rollup?.array?.[0]?.title?.[0]?.plain_text) {
    crmCustomerName = crmNameProp.rollup.array[0].title[0].plain_text;
  }

  // 메모
  const memoProp = p['메모'] as { rich_text?: Array<{ plain_text?: string }> } | undefined;
  const memo = memoProp?.rich_text?.[0]?.plain_text ?? null;

  return {
    id: page.id,
    title,
    start,
    end,
    allDay,
    type,
    color: getColorByType(type),
    memberName,
    memberId,
    crmCustomerId,
    crmCustomerName,
    memo,
    action,
  };
}

/**
 * 날짜 범위 이벤트 조회
 * @param start - 시작 날짜 (YYYY-MM-DD)
 * @param end   - 종료 날짜 (YYYY-MM-DD)
 */
export async function getEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const dbId = process.env.NOTION_CALENDAR_SCHED_DB;
  if (!dbId) {
    throw new Error('NOTION_CALENDAR_SCHED_DB 환경변수가 설정되지 않았습니다.');
  }

  const body = {
    filter: {
      and: [
        {
          property: '날짜',
          date: { on_or_after: start },
        },
        {
          property: '날짜',
          date: { on_or_before: end },
        },
      ],
    },
    sorts: [{ property: '날짜', direction: 'ascending' }],
    page_size: 100,
  };

  const data = (await notionFetch(`/databases/${dbId}/query`, 'POST', body, calToken(), CAL_API_VERSION)) as NotionQueryResult;
  const results = data?.results ?? [];
  return results.map(mapPageToEvent);
}

/**
 * 특정 날짜의 캘린더 이벤트 조회 (단일 날짜용 — 하위 호환)
 */
export async function getEventsForDate(date: string): Promise<CalendarEvent[]> {
  return getEvents(date, date);
}

/**
 * 새 이벤트 생성
 */
export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const dbId = process.env.NOTION_CALENDAR_SCHED_DB;
  if (!dbId) {
    throw new Error('NOTION_CALENDAR_SCHED_DB 환경변수가 설정되지 않았습니다.');
  }

  const dateValue: { start: string; end?: string } = { start: input.start };
  if (input.end) dateValue.end = input.end;

  const properties: Record<string, unknown> = {
    이벤트: { title: [{ text: { content: input.title } }] },
    날짜: { date: dateValue },
  };

  if (input.type) {
    properties.타입 = { select: { name: input.type } };
  }
  if (input.action) {
    properties.액션 = { select: { name: input.action } };
  }
  if (input.memo) {
    properties.메모 = { rich_text: [{ text: { content: input.memo } }] };
  }
  if (input.memberId) {
    properties.담당자 = { relation: [{ id: input.memberId }] };
  }
  if (input.crmCustomerId) {
    properties.고객 = { relation: [{ id: input.crmCustomerId }] };
  }

  const newPage = (await notionFetch('/pages', 'POST', {
    parent: { database_id: dbId },
    properties,
  }, calToken(), CAL_API_VERSION)) as NotionCalendarPage;

  return mapPageToEvent(newPage);
}

/**
 * 이벤트 수정
 */
export async function updateEvent(id: string, input: Partial<CreateEventInput>): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (input.title !== undefined) {
    properties.이벤트 = { title: [{ text: { content: input.title } }] };
  }
  if (input.start !== undefined) {
    const dateValue: { start: string; end?: string } = { start: input.start };
    if (input.end) dateValue.end = input.end;
    properties.날짜 = { date: dateValue };
  }
  if (input.type !== undefined) {
    properties.타입 = { select: { name: input.type } };
  }
  if (input.action !== undefined) {
    properties.액션 = { select: { name: input.action } };
  }
  if (input.memo !== undefined) {
    properties.메모 = { rich_text: [{ text: { content: input.memo } }] };
  }
  if (input.memberId !== undefined) {
    properties.담당자 = { relation: [{ id: input.memberId }] };
  }
  if (input.crmCustomerId !== undefined) {
    properties.고객 = { relation: [{ id: input.crmCustomerId }] };
  }

  await notionFetch(`/pages/${id}`, 'PATCH', { properties }, calToken(), CAL_API_VERSION);
}

/**
 * 이벤트 삭제 (archive)
 */
export async function deleteEvent(id: string): Promise<void> {
  await notionFetch(`/pages/${id}`, 'PATCH', { archived: true }, calToken(), CAL_API_VERSION);
}

// ── 멤버 관련 타입 + 함수 ──

export interface CalendarMember {
  id: string;
  name: string;
  color: string;
}

interface NotionMemberPage {
  id: string;
  properties: Record<string, unknown>;
}

interface NotionMemberQueryResult {
  results: NotionMemberPage[];
}

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

/**
 * 팀원 목록 조회 (NOTION_CALENDAR_MEMBER_DB)
 */
export async function getMembers(): Promise<CalendarMember[]> {
  const dbId = process.env.NOTION_CALENDAR_MEMBER_DB;
  if (!dbId) {
    // 멤버 DB가 없으면 빈 배열 반환 (옵셔널 기능)
    return [];
  }

  try {
    const data = (await notionFetch(`/databases/${dbId}/query`, 'POST', {
      sorts: [{ property: '이름', direction: 'ascending' }],
      page_size: 50,
    }, calToken(), CAL_API_VERSION)) as NotionMemberQueryResult;

    const results = data?.results ?? [];
    return results.map((page) => {
      const p = page.properties as Record<string, Record<string, unknown>>;

      // 이름
      const nameProp = (p['이름'] ?? p['Name']) as
        | { title?: Array<{ plain_text?: string }> }
        | undefined;
      const name = nameProp?.title?.[0]?.plain_text ?? '(이름 없음)';

      // 색상 (select 또는 rich_text)
      const colorProp = p['색상'] as
        | { select?: { name?: string; color?: string }; rich_text?: Array<{ plain_text?: string }> }
        | undefined;
      const colorName = colorProp?.select?.name ?? colorProp?.select?.color ?? '';
      const colorHex = MEMBER_COLOR_MAP[colorName] ?? '#6B7280';

      return { id: page.id, name, color: colorHex };
    });
  } catch (err) {
    console.error('[getMembers] 오류:', err);
    return [];
  }
}
