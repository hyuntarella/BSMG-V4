'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import MonthView from '@/components/calendar/MonthView';
import { CalendarEvent } from '@/lib/notion/calendar';

type CalendarView = 'month' | 'week' | 'day';

function getMonthRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  // 해당 월 마지막 날
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const { start, end } = getMonthRange(date);
      const res = await fetch(`/api/calendar?start=${start}&end=${end}`);
      if (!res.ok) throw new Error('이벤트 조회 실패');
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch (err) {
      console.error('[캘린더] 이벤트 조회 오류:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate, fetchEvents]);

  function handleDateChange(d: Date) {
    setCurrentDate(d);
    setSelectedDate(null);
  }

  function handleDateClick(dateStr: string) {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }

  const selectedEvents = selectedDate
    ? events.filter((e) => e.start.startsWith(selectedDate))
    : [];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col mx-auto w-full max-w-6xl px-4 py-4">
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden shadow-sm">
          {/* 캘린더 헤더 (네비게이션 + 뷰 전환) */}
          <CalendarHeader
            currentDate={currentDate}
            view={view}
            onDateChange={handleDateChange}
            onViewChange={setView}
          />

          {/* 로딩 표시 */}
          {loading && (
            <div className="py-2 px-4 text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
              이벤트 불러오는 중...
            </div>
          )}

          {/* 월간 뷰 */}
          {view === 'month' && (
            <MonthView
              events={events}
              currentDate={currentDate}
              onDateClick={handleDateClick}
            />
          )}

          {/* 주간/일간 뷰 placeholder */}
          {(view === 'week' || view === 'day') && (
            <div className="flex-1 flex items-center justify-center py-24 text-gray-400 text-sm">
              {view === 'week' ? '주간' : '일간'} 뷰는 Phase 35에서 추가될 예정입니다.
            </div>
          )}
        </div>

        {/* 선택된 날짜 이벤트 목록 */}
        {selectedDate && (
          <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {selectedDate} 일정 {selectedEvents.length > 0 ? `(${selectedEvents.length}건)` : ''}
            </h3>

            {selectedEvents.length === 0 ? (
              <p className="text-sm text-gray-400">이 날짜에 등록된 일정이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ev.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {ev.title}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {ev.type}
                        </span>
                      </div>
                      {ev.memo && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.memo}</p>
                      )}
                      {ev.memberName && (
                        <p className="text-xs text-gray-400 mt-0.5">담당: {ev.memberName}</p>
                      )}
                    </div>
                    {!ev.allDay && ev.start.includes('T') && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {ev.start.slice(11, 16)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
