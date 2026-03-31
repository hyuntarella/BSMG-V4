'use client';

import { CalendarEvent } from '@/lib/notion/calendar';
import TimeGrid, { TimeGridColumn } from '@/components/calendar/TimeGrid';

interface WeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 해당 주의 일요일 기준 7일 날짜 배열 반환 */
function getWeekDays(date: Date): Date[] {
  const dow = date.getDay(); // 0=일
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dow);
  sunday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayStr(): string {
  return toDateStr(new Date());
}

export default function WeekView({ events, currentDate, onEventClick }: WeekViewProps) {
  const weekDays = getWeekDays(currentDate);
  const todayStr = getTodayStr();

  // columns: 7일
  const columns: TimeGridColumn[] = weekDays.map((d, i) => {
    const dateStr = toDateStr(d);
    const isToday = dateStr === todayStr;
    const dayNum = d.getDate();
    return {
      key: dateStr,
      label: `${DOW_LABELS[i]} ${dayNum}`,
      date: dateStr,
    };
  });

  // 해당 주 이벤트 필터
  const startStr = toDateStr(weekDays[0]);
  const endStr = toDateStr(weekDays[6]);
  const weekEvents = events.filter((ev) => {
    const evDate = ev.start.slice(0, 10);
    return evDate >= startStr && evDate <= endStr;
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 요일 + 날짜 헤더 */}
      <div className="flex border-b border-gray-200 bg-white">
        {/* 시간 라벨 공간 */}
        <div className="w-14 flex-shrink-0 border-r border-gray-200" />
        {columns.map((col, i) => {
          const isToday = col.date === todayStr;
          const isSun = i === 0;
          const isSat = i === 6;
          return (
            <div
              key={col.key}
              className={`flex-1 min-w-[100px] py-2 text-center border-r border-gray-200 last:border-r-0 ${
                isToday ? 'bg-brand/10' : ''
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-500'
                }`}
              >
                {DOW_LABELS[i]}
              </div>
              <div
                className={`text-sm mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-brand text-white font-bold'
                    : isSun
                    ? 'text-red-400 font-medium'
                    : isSat
                    ? 'text-blue-400 font-medium'
                    : 'text-gray-800'
                }`}
              >
                {weekDays[i].getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 시간 그리드 */}
      <TimeGrid
        columns={columns}
        events={weekEvents}
        startHour={8}
        endHour={20}
        onEventClick={onEventClick}
      />
    </div>
  );
}
