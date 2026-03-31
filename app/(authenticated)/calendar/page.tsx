'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import { CalendarEvent } from '@/lib/notion/calendar';

type CalendarView = 'month' | 'week' | 'day';

// ── 날짜 유틸 ──

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function getWeekRange(date: Date): { start: string; end: string } {
  const dow = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dow);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { start: toDateStr(sunday), end: toDateStr(saturday) };
}

function getDateRange(date: Date, view: CalendarView): { start: string; end: string } {
  if (view === 'week') return getWeekRange(date);
  if (view === 'day') return { start: toDateStr(date), end: toDateStr(date) };
  return getMonthRange(date);
}

/** 뷰에 따라 이전/다음으로 이동할 새 날짜 계산 */
function navigate(date: Date, view: CalendarView, direction: 1 | -1): Date {
  const d = new Date(date);
  if (view === 'month') {
    d.setMonth(d.getMonth() + direction);
  } else if (view === 'week') {
    d.setDate(d.getDate() + direction * 7);
  } else {
    d.setDate(d.getDate() + direction);
  }
  return d;
}

/** 뷰 + 날짜에 따른 헤더 타이틀 */
function getTitle(date: Date, view: CalendarView): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const dayNum = date.getDate();
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = DOW[date.getDay()];

  if (view === 'month') return `${y}년 ${m}월`;
  if (view === 'day') return `${y}년 ${m}월 ${dayNum}일 (${dow})`;

  // week
  const { start, end } = getWeekRange(date);
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  if (sm === em) {
    return `${sy}년 ${sm}월 ${sd}일 ~ ${ed}일`;
  }
  return `${sy}년 ${sm}월 ${sd}일 ~ ${em}월 ${ed}일`;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async (date: Date, v: CalendarView) => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(date, v);
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
    fetchEvents(currentDate, view);
  }, [currentDate, view, fetchEvents]);

  function handleDateChange(d: Date) {
    setCurrentDate(d);
    setSelectedDate(null);
  }

  function handleViewChange(v: CalendarView) {
    setView(v);
    setSelectedDate(null);
  }

  function handleDateClick(dateStr: string) {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }

  function handleEventClick(ev: CalendarEvent) {
    setSelectedEvent((prev) => (prev?.id === ev.id ? null : ev));
  }

  // CalendarHeader goPrev/goNext를 view에 따라 처리하기 위해 onDateChange에 direction 로직 통합
  // CalendarHeader는 onDateChange(Date) 인터페이스 → navigate 결과를 직접 전달
  function handlePrev() {
    setCurrentDate((prev) => navigate(prev, view, -1));
    setSelectedDate(null);
  }
  function handleNext() {
    setCurrentDate((prev) => navigate(prev, view, 1));
    setSelectedDate(null);
  }

  const selectedEvents = selectedDate
    ? events.filter((e) => e.start.startsWith(selectedDate))
    : [];

  const title = getTitle(currentDate, view);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col mx-auto w-full max-w-6xl px-4 py-4">
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden shadow-sm" style={{ minHeight: '600px' }}>
          {/* 캘린더 헤더 */}
          <CalendarHeader
            currentDate={currentDate}
            view={view}
            title={title}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={() => { setCurrentDate(new Date()); setSelectedDate(null); }}
            onDateChange={handleDateChange}
            onViewChange={handleViewChange}
          />

          {/* 로딩 표시 */}
          {loading && (
            <div className="py-2 px-4 text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
              이벤트 불러오는 중...
            </div>
          )}

          {/* 뷰 전환 */}
          {view === 'month' && (
            <MonthView
              events={events}
              currentDate={currentDate}
              onDateClick={handleDateClick}
            />
          )}

          {view === 'week' && (
            <WeekView
              events={events}
              currentDate={currentDate}
              onEventClick={handleEventClick}
            />
          )}

          {view === 'day' && (
            <DayView
              events={events}
              currentDate={currentDate}
              onEventClick={handleEventClick}
            />
          )}
        </div>

        {/* 선택된 날짜 이벤트 목록 (월간 뷰에서만) */}
        {view === 'month' && selectedDate && (
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
                        <span className="text-xs text-gray-400 flex-shrink-0">{ev.type}</span>
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

        {/* 선택된 이벤트 상세 (주간/일간 뷰) */}
        {selectedEvent && (view === 'week' || view === 'day') && (
          <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedEvent.color }}
                />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{selectedEvent.title}</h3>
                  {selectedEvent.type && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedEvent.type}</p>
                  )}
                  {selectedEvent.memo && (
                    <p className="text-xs text-gray-600 mt-1">{selectedEvent.memo}</p>
                  )}
                  {selectedEvent.memberName && (
                    <p className="text-xs text-gray-400 mt-1">담당: {selectedEvent.memberName}</p>
                  )}
                  {!selectedEvent.allDay && selectedEvent.start.includes('T') && (
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedEvent.start.slice(11, 16)}
                      {selectedEvent.end && ` ~ ${selectedEvent.end.slice(11, 16)}`}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
