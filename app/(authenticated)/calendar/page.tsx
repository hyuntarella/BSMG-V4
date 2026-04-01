'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import EventModal from '@/components/calendar/EventModal';
import EventDetail from '@/components/calendar/EventDetail';
import SettingsModal from '@/components/calendar/SettingsModal';
import { CalendarEvent } from '@/lib/notion/calendar';

type CalendarView = 'month' | 'week' | 'day';

interface Member {
  id: string;
  name: string;
  color: string;
}

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
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  // 이벤트 상세 패널
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // 이벤트 생성/편집 모달
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);

  // CRM 연동: query params로 전달된 CRM 고객 정보
  const [crmPreFill, setCrmPreFill] = useState<{ id: string; name: string } | null>(null);

  // 설정 모달
  const [showSettings, setShowSettings] = useState(false);

  // CRM에서 넘어온 경우 자동으로 이벤트 생성 모달 열기
  useEffect(() => {
    const action = searchParams.get('action');
    const crmId = searchParams.get('crmId');
    const crmName = searchParams.get('crmName');
    const address = searchParams.get('address');

    if (action === 'create' && crmId) {
      setCrmPreFill({ id: crmId, name: crmName ?? '' });
      setEditingEvent(null);
      setModalInitialDate(toDateStr(new Date()));
      setShowEventModal(true);

      // URL에서 query params 제거 (뒤로가기 시 재실행 방지)
      window.history.replaceState(null, '', '/calendar');
    }
  }, [searchParams]);

  // ── 이벤트 로드 ──

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

  // 팀원 로드
  useEffect(() => {
    fetch('/api/calendar/members')
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .catch((err) => console.error('[캘린더] 팀원 조회 오류:', err));
  }, []);

  useEffect(() => {
    fetchEvents(currentDate, view);
  }, [currentDate, view, fetchEvents]);

  // ── 네비게이션 핸들러 ──

  function handleDateChange(d: Date) {
    setCurrentDate(d);
    setSelectedDate(null);
  }

  function handleViewChange(v: CalendarView) {
    setView(v);
    setSelectedDate(null);
    setSelectedEvent(null);
  }

  function handleDateClick(dateStr: string) {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
    setSelectedEvent(null);
  }

  function handleEventClick(ev: CalendarEvent) {
    setSelectedEvent((prev) => (prev?.id === ev.id ? null : ev));
    setSelectedDate(null);
  }

  function handlePrev() {
    setCurrentDate((prev) => navigate(prev, view, -1));
    setSelectedDate(null);
  }
  function handleNext() {
    setCurrentDate((prev) => navigate(prev, view, 1));
    setSelectedDate(null);
  }

  // ── 이벤트 생성/편집 ──

  function openCreateModal(dateStr?: string) {
    setEditingEvent(null);
    setModalInitialDate(dateStr);
    setShowEventModal(true);
  }

  function openEditModal(ev: CalendarEvent) {
    setEditingEvent(ev);
    setModalInitialDate(undefined);
    setShowEventModal(true);
    setSelectedEvent(null);
  }

  function handleEventSaved(savedEvent: CalendarEvent) {
    setShowEventModal(false);
    setEditingEvent(null);
    setCrmPreFill(null);
    // events 업데이트
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === savedEvent.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedEvent;
        return updated;
      }
      return [...prev, savedEvent];
    });
  }

  async function handleDeleteEvent(id: string) {
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSelectedEvent(null);
    } catch (err) {
      console.error('[캘린더] 이벤트 삭제 오류:', err);
    }
  }

  // ── 렌더링 ──

  const selectedEvents = selectedDate
    ? events.filter((e) => e.start.startsWith(selectedDate))
    : [];

  const title = getTitle(currentDate, view);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col mx-auto w-full max-w-6xl px-4 py-4">
        <div className="bg-white rounded-xl flex flex-col overflow-hidden shadow-card" style={{ minHeight: '600px' }}>
          {/* 캘린더 헤더 */}
          <CalendarHeader
            currentDate={currentDate}
            view={view}
            title={title}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={() => { setCurrentDate(new Date()); setSelectedDate(null); setSelectedEvent(null); }}
            onDateChange={handleDateChange}
            onViewChange={handleViewChange}
          />

          {/* 헤더 액션 바 */}
          <div className="flex items-center justify-between px-4 py-2">
            <button
              onClick={() => openCreateModal(toDateStr(currentDate))}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-brand text-white rounded-full font-medium hover:bg-brand-dark transition-colors shadow-card"
            >
              <span className="text-base leading-none">+</span>
              <span>새 일정</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="설정"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>

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
              members={members}
            />
          )}
        </div>

        {/* 선택된 날짜 이벤트 목록 (월간 뷰에서만) */}
        {view === 'month' && selectedDate && (
          <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedDate} 일정 {selectedEvents.length > 0 ? `(${selectedEvents.length}건)` : ''}
              </h3>
              <button
                onClick={() => openCreateModal(selectedDate)}
                className="text-xs text-brand hover:underline"
              >
                + 추가
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-sm text-gray-400">이 날짜에 등록된 일정이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 rounded p-1 -mx-1"
                    onClick={() => openEditModal(ev)}
                  >
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
      </div>

      {/* EventDetail 사이드 패널 */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={openEditModal}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* EventModal */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => { setShowEventModal(false); setEditingEvent(null); setCrmPreFill(null); }}
        onSave={handleEventSaved}
        initialDate={modalInitialDate}
        editEvent={editingEvent}
        members={members}
        crmPreFill={crmPreFill}
      />

      {/* SettingsModal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
