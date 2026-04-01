'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarEvent } from '@/lib/notion/calendar';

export interface TimeGridColumn {
  key: string;
  label: string;
  date?: string; // YYYY-MM-DD — 현재 시간 빨간선 표시 기준
}

interface TimeGridProps {
  columns: TimeGridColumn[];
  events: CalendarEvent[];
  startHour?: number;
  endHour?: number;
  onEventClick?: (event: CalendarEvent) => void;
}

// 1시간 = 64px (h-16)
const HOUR_HEIGHT = 64;

/** ISO datetime 또는 YYYY-MM-DD에서 시간(소수 포함) 추출 */
function parseHour(dateStr: string): number {
  if (dateStr.includes('T')) {
    const timePart = dateStr.slice(11, 16); // "HH:MM"
    const [h, m] = timePart.split(':').map(Number);
    return h + m / 60;
  }
  return 0; // allDay 이벤트는 0시
}

/** YYYY-MM-DD 추출 */
function parseDateStr(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/** 시간을 "HH:MM" 포맷으로 변환 */
function formatHour(hour: number): string {
  const h = Math.floor(hour);
  return `${String(h).padStart(2, '0')}:00`;
}

/** 오늘 날짜 YYYY-MM-DD */
function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function TimeGrid({
  columns,
  events,
  startHour = 8,
  endHour = 20,
  onEventClick,
}: TimeGridProps) {
  const totalHours = endHour - startHour;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);
  const todayStr = getTodayStr();

  // 현재 시간 (분 단위 갱신)
  const [currentHour, setCurrentHour] = useState<number>(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours() + now.getMinutes() / 60);
    }, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 컬럼별 이벤트 분류 (allDay 제외)
  function getColumnEvents(colKey: string, colDate?: string): CalendarEvent[] {
    return events.filter((ev) => {
      if (ev.allDay) return false;
      const evDate = parseDateStr(ev.start);
      if (colDate) {
        return evDate === colDate;
      }
      // key가 날짜인 경우 (WeekView)
      return evDate === colKey;
    });
  }

  // 컬럼별 allDay 이벤트
  function getAllDayEvents(colKey: string, colDate?: string): CalendarEvent[] {
    return events.filter((ev) => {
      if (!ev.allDay) return false;
      const evDate = parseDateStr(ev.start);
      if (colDate) return evDate === colDate;
      return evDate === colKey;
    });
  }

  return (
    <div className="flex flex-1 overflow-auto">
      {/* 시간 라벨 컬럼 */}
      <div className="flex-shrink-0 w-14 bg-white border-r border-gray-200">
        {/* allDay 행 공간 */}
        <div className="h-10 border-b border-gray-200" />
        {/* 시간 라벨 */}
        {hours.map((h) => (
          <div
            key={h}
            className="relative flex items-start justify-end pr-2 text-xs text-gray-400"
            style={{ height: HOUR_HEIGHT }}
          >
            {h < endHour && (
              <span className="-translate-y-2">{formatHour(h)}</span>
            )}
          </div>
        ))}
      </div>

      {/* 컬럼 영역 */}
      <div className="flex flex-1 overflow-x-auto">
        {columns.map((col) => {
          const colEvents = getColumnEvents(col.key, col.date);
          const colAllDay = getAllDayEvents(col.key, col.date);
          const colDateStr = col.date ?? col.key;
          const isToday = colDateStr === todayStr;
          const showCurrentTime =
            isToday &&
            currentHour >= startHour &&
            currentHour <= endHour;

          // 현재 시간선 top
          const currentTimeTop = (currentHour - startHour) * HOUR_HEIGHT;

          return (
            <div
              key={col.key}
              className={`flex-1 min-w-[100px] border-r border-gray-200 flex flex-col ${
                isToday ? 'bg-blue-50/20' : 'bg-white'
              }`}
            >
              {/* AllDay 이벤트 영역 */}
              <div className="h-10 border-b border-gray-200 px-1 flex items-center gap-1 flex-wrap overflow-hidden">
                {colAllDay.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick?.(ev)}
                    className="text-xs px-1.5 py-0.5 rounded truncate max-w-full"
                    style={{
                      backgroundColor: ev.color + '33',
                      borderLeft: `3px solid ${ev.color}`,
                    }}
                  >
                    {ev.title}
                  </button>
                ))}
              </div>

              {/* 시간 슬롯 + 이벤트 블록 */}
              <div
                className="relative"
                style={{ height: totalHours * HOUR_HEIGHT }}
              >
                {/* 시간 구분선 */}
                {hours.slice(0, totalHours).map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: (h - startHour) * HOUR_HEIGHT }}
                  >
                    {/* 15분 점선 */}
                    {[1, 2, 3].map((q) => (
                      <div
                        key={q}
                        className="absolute left-0 right-0 border-t border-gray-50 border-dashed"
                        style={{ top: q * (HOUR_HEIGHT / 4) }}
                      />
                    ))}
                  </div>
                ))}

                {/* 현재 시간 빨간선 */}
                {showCurrentTime && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: currentTimeTop }}
                  >
                    <div className="relative flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  </div>
                )}

                {/* 이벤트 블록 */}
                {colEvents.map((ev) => {
                  const evStart = parseHour(ev.start);
                  const evEnd = ev.end ? parseHour(ev.end) : evStart + 1;
                  const durationHours = Math.max(evEnd - evStart, 0.5);

                  const top = Math.max((evStart - startHour) * HOUR_HEIGHT, 0);
                  const height = Math.max(durationHours * HOUR_HEIGHT, 32);

                  // 범위 밖 이벤트 숨김
                  if (evStart >= endHour || evEnd <= startHour) return null;

                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick?.(ev)}
                      className="absolute left-1 right-1 rounded overflow-hidden text-left hover:opacity-80 transition-opacity"
                      style={{
                        top,
                        height,
                        backgroundColor: ev.color + '33',
                        borderLeft: `4px solid ${ev.color}`,
                      }}
                    >
                      <div className="px-1 py-0.5">
                        <div className="text-xs font-medium text-gray-800 leading-tight truncate">
                          {ev.start.includes('T') && (
                            <span className="text-gray-500 mr-1">
                              {ev.start.slice(11, 16)}
                            </span>
                          )}
                          {ev.title}
                          {ev.crmCustomerName && (
                            <span className="text-gray-500 ml-1">· {ev.crmCustomerName}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
