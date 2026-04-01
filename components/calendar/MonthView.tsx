'use client';

import { CalendarEvent } from '@/lib/notion/calendar';

interface MonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateClick: (date: string) => void;
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_VISIBLE_EVENTS = 3;

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events.filter((e) => {
    // start가 dateStr로 시작하면 해당 날짜 이벤트
    return e.start.startsWith(dateStr);
  });
}

export default function MonthView({ events, currentDate, onDateClick }: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 이달 1일의 요일 (0=일)
  const firstDow = new Date(year, month, 1).getDay();
  // 이달 마지막 날
  const lastDay = new Date(year, month + 1, 0).getDate();

  // 오늘
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // 6주 × 7일 그리드 구성
  const cells: { dateStr: string; day: number; isCurrentMonth: boolean }[] = [];

  // 이전 달 날짜 채우기
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    cells.push({ dateStr: toDateStr(year, month - 1, d), day: d, isCurrentMonth: false });
  }

  // 이번 달
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ dateStr: toDateStr(year, month, d), day: d, isCurrentMonth: true });
  }

  // 다음 달 채우기 (6주 = 42칸)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ dateStr: toDateStr(year, month + 1, d), day: d, isCurrentMonth: false });
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 bg-surface-muted border-b border-ink-faint/20">
        {DOW_LABELS.map((label, i) => (
          <div
            key={label}
            className={`py-2.5 text-center text-xs font-semibold ${
              i === 0 ? 'text-brand' : i === 6 ? 'text-blue-500' : 'text-ink-secondary'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 bg-white">
        {cells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr;
          const dayEvents = getEventsForDate(events, cell.dateStr);
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const hiddenCount = dayEvents.length - visibleEvents.length;
          const colIndex = idx % 7;

          return (
            <div
              key={cell.dateStr + idx}
              onClick={() => onDateClick(cell.dateStr)}
              className={`min-h-24 border border-ink-faint/10 p-1.5 cursor-pointer transition-colors ${
                !cell.isCurrentMonth ? 'bg-surface-muted/50' : 'hover:bg-accent-50/30'
              }`}
            >
              {/* 날짜 숫자 */}
              <div className="flex justify-start mb-1">
                <span
                  className={`text-xs w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                    isToday
                      ? 'bg-brand text-white font-bold shadow-card'
                      : !cell.isCurrentMonth
                      ? 'text-ink-faint'
                      : colIndex === 0
                      ? 'text-brand font-medium'
                      : colIndex === 6
                      ? 'text-blue-500 font-medium'
                      : 'text-ink'
                  }`}
                >
                  {cell.day}
                </span>
              </div>

              {/* 이벤트 칩 */}
              <div className="space-y-0.5">
                {visibleEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-1 px-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ev.color }}
                    />
                    <span className="text-xs text-ink truncate leading-tight">
                      {ev.crmCustomerName ? `${ev.title} · ${ev.crmCustomerName}` : ev.title}
                    </span>
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <div className="text-xs text-ink-muted px-1">+{hiddenCount}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
