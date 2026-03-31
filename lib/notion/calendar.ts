// ── Notion Calendar Functions ──
// 캘린더 DB 조회 함수 (기초 — Phase 34에서 getEvents(start, end)로 확장 예정)

import { notionFetch } from './client';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  type: string;
  color: string;
  memberName: string | null;
}

// 타입별 색상 매핑
const TYPE_COLOR_MAP: Record<string, string> = {
  방문: '#3b82f6',   // blue
  시공: '#22c55e',   // green
  미팅: '#a855f7',   // purple
  기타: '#9ca3af',   // gray
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
}

/**
 * 특정 날짜의 캘린더 이벤트 조회 (단일 날짜용)
 * Phase 34에서 getEvents(start, end) 범위 조회로 확장 예정
 */
export async function getEventsForDate(date: string): Promise<CalendarEvent[]> {
  const dbId = process.env.NOTION_CALENDAR_SCHED_DB;
  if (!dbId) {
    throw new Error('NOTION_CALENDAR_SCHED_DB 환경변수가 설정되지 않았습니다.');
  }

  const body = {
    filter: {
      property: '날짜',
      date: {
        equals: date,
      },
    },
    sorts: [
      {
        property: '날짜',
        direction: 'ascending',
      },
    ],
  };

  const data = (await notionFetch(`/databases/${dbId}/query`, 'POST', body)) as NotionQueryResult;
  const results = data?.results ?? [];

  const events: CalendarEvent[] = results.map((page) => {
    const p = page.properties as Record<string, Record<string, unknown>>;

    // 제목: "이벤트" 또는 "제목" title 속성
    const titleProp = (p['이벤트'] ?? p['제목']) as
      | { title?: Array<{ plain_text?: string }> }
      | undefined;
    const title = titleProp?.title?.[0]?.plain_text ?? '(제목 없음)';

    // 날짜
    const dateProp = p['날짜'] as { date?: { start?: string; end?: string | null } } | undefined;
    const start = dateProp?.date?.start ?? date;
    const end = dateProp?.date?.end ?? null;

    // 타입
    const typeProp = p['타입'] as { select?: { name?: string } } | undefined;
    const type = typeProp?.select?.name ?? '기타';

    // 담당자: people 배열 또는 relation
    let memberName: string | null = null;
    const memberProp = p['담당자'] as
      | { people?: Array<{ name?: string }> }
      | { relation?: Array<{ id?: string }> }
      | undefined;
    if (memberProp) {
      const peopleProp = memberProp as { people?: Array<{ name?: string }> };
      if (peopleProp.people && peopleProp.people.length > 0) {
        memberName = peopleProp.people[0]?.name ?? null;
      }
    }

    return {
      id: page.id,
      title,
      start,
      end,
      type,
      color: getColorByType(type),
      memberName,
    };
  });

  return events;
}
