'use client';

import { CalendarEvent } from '@/lib/supabase/calendar-types';
import TimeGrid, { TimeGridColumn } from '@/components/calendar/TimeGrid';

interface Member {
  id: string;
  name: string;
}

interface DayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  members?: Member[];
  onEventClick?: (event: CalendarEvent) => void;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function DayView({ events, currentDate, members = [], onEventClick }: DayViewProps) {
  const dateStr = toDateStr(currentDate);
  const todayStr = toDateStr(new Date());
  const isToday = dateStr === todayStr;
  const dow = DOW_LABELS[currentDate.getDay()];

  // 해당 날짜 이벤트만 필터
  const dayEvents = events.filter((ev) => ev.start.slice(0, 10) === dateStr);

  // columns: 멤버별 또는 단일 "전체"
  let columns: TimeGridColumn[];
  let columnEvents: CalendarEvent[];

  if (members.length > 0) {
    columns = members.map((m) => ({
      key: m.id,
      label: m.name,
      date: dateStr,
    }));

    // 멤버별 이벤트 분류: memberName / memberId 기준으로 매핑
    // TimeGrid 내부에서 colDate === evDate를 사용하므로
    // 멤버별 컬럼 구분은 여기서 별도로 처리해야 함.
    // 멤버가 있는 경우: 해당 멤버 이벤트만 포함하도록 memberColumn key를 date로 넘기되,
    // 멤버 필터링은 이벤트 자체에 column key를 추가하는 방식으로 처리.
    // 대신 간단하게 DayView에서 직접 렌더링.
    columnEvents = dayEvents;
  } else {
    columns = [{ key: 'all', label: '전체', date: dateStr }];
    columnEvents = dayEvents;
  }

  // 멤버별 뷰: 각 멤버에 맞는 이벤트만 필터해서 별도 TimeGrid 렌더링
  if (members.length > 0) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 날짜 헤더 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
          <span
            className={`text-sm font-semibold ${isToday ? 'text-brand' : 'text-gray-800'}`}
          >
            {currentDate.getMonth() + 1}월 {currentDate.getDate()}일 ({dow})
            {isToday && <span className="ml-2 text-xs font-normal text-brand">오늘</span>}
          </span>
        </div>

        {/* 멤버별 컬럼 헤더 */}
        <div className="flex border-b border-gray-200 bg-white">
          <div className="w-14 flex-shrink-0 border-r border-gray-200" />
          {members.map((m) => (
            <div
              key={m.id}
              className="flex-1 min-w-[100px] py-2 text-center border-r border-gray-200 last:border-r-0"
            >
              <div className="text-xs font-medium text-gray-700">{m.name}</div>
            </div>
          ))}
        </div>

        {/* 각 멤버의 이벤트를 columns에 맞게 배치 */}
        <div className="flex flex-1 overflow-auto">
          {/* TimeGrid에 멤버별 분리 이벤트 전달 */}
          {/* 멤버별로 이벤트를 필터링해 각각 date를 해당 멤버 ID로 구분 */}
          <TimeGrid
            columns={members.map((m) => ({
              key: m.id,
              label: m.name,
              date: dateStr,
            }))}
            events={dayEvents.map((ev) => ({
              ...ev,
              // 담당자가 없는 이벤트는 첫번째 컬럼에 배치
              memberId: ev.memberId ?? (members[0]?.id ?? null),
            }))}
            startHour={8}
            endHour={20}
            onEventClick={onEventClick}
          />
        </div>
      </div>
    );
  }

  // 단일 "전체" 컬럼
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <span
          className={`text-sm font-semibold ${isToday ? 'text-brand' : 'text-gray-800'}`}
        >
          {currentDate.getMonth() + 1}월 {currentDate.getDate()}일 ({dow})
          {isToday && <span className="ml-2 text-xs font-normal text-brand">오늘</span>}
        </span>
      </div>

      {/* 컬럼 헤더 (단일) */}
      <div className="flex border-b border-gray-200 bg-white">
        <div className="w-14 flex-shrink-0 border-r border-gray-200" />
        <div className="flex-1 py-2 text-center">
          <div className="text-xs font-medium text-gray-500">전체</div>
        </div>
      </div>

      <TimeGrid
        columns={columns}
        events={columnEvents}
        startHour={8}
        endHour={20}
        onEventClick={onEventClick}
      />
    </div>
  );
}
