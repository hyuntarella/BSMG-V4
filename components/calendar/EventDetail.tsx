'use client';

import { useState, useRef } from 'react';
import { CalendarEvent } from '@/lib/supabase/calendar-types';
import Link from 'next/link';

interface EventDetailProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

const TYPE_COLOR_MAP: Record<string, string> = {
  방문: '#3B82F6',
  시공: '#10B981',
  미팅: '#8B5CF6',
  기타: '#6B7280',
};

function formatDateTime(iso: string, allDay: boolean): string {
  if (!iso) return '';
  if (allDay) return iso.slice(0, 10);
  // ISO: "2026-03-31T09:00"
  const datePart = iso.slice(0, 10);
  const timePart = iso.slice(11, 16);
  return `${datePart} ${timePart}`;
}

export default function EventDetail({ event, onClose, onEdit, onDelete }: EventDetailProps) {
  const [memo, setMemo] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const memoInitRef = useRef<string>('');

  // 이벤트 변경 시 메모 초기화
  if (event && event.memo !== memoInitRef.current && memo !== (event.memo ?? '')) {
    memoInitRef.current = event.memo ?? '';
    setMemo(event.memo ?? '');
  }

  if (!event) return null;

  async function handleMemoBlur() {
    if (!event) return;
    if (memo === (event.memo ?? '')) return; // 변경 없음
    setSavingMemo(true);
    try {
      await fetch(`/api/calendar/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });
    } catch (err) {
      console.error('[EventDetail] 메모 저장 오류:', err);
    } finally {
      setSavingMemo(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`"${event?.title}" 이벤트를 삭제하시겠습니까?`)) return;
    onDelete(event!.id);
  }

  const typeColor = TYPE_COLOR_MAP[event.type] ?? TYPE_COLOR_MAP.기타;
  const startDisplay = formatDateTime(event.start, event.allDay);
  const endDisplay = event.end ? formatDateTime(event.end, event.allDay) : null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-start justify-between px-4 py-4 border-b border-gray-200">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className="mt-1 w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: typeColor }}
          />
          <h3 className="text-sm font-semibold text-gray-900 leading-tight break-words">
            {event.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* 타입 칩 */}
        <div>
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: typeColor }}
          >
            {event.type}
          </span>
          {event.action && (
            <span className="ml-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {event.action}
            </span>
          )}
        </div>

        {/* 날짜/시간 */}
        <div className="text-sm text-gray-700">
          <span className="font-medium">일시: </span>
          <span>{startDisplay}</span>
          {endDisplay && endDisplay !== startDisplay && (
            <span className="text-gray-500"> ~ {endDisplay}</span>
          )}
          {event.allDay && (
            <span className="ml-1.5 text-xs text-gray-400">(종일)</span>
          )}
        </div>

        {/* 담당자 */}
        {event.memberName && (
          <div className="text-sm text-gray-700">
            <span className="font-medium">담당: </span>
            <span>{event.memberName}</span>
          </div>
        )}

        {/* CRM 고객 */}
        {event.crmCustomerId && (
          <div className="text-sm text-gray-700">
            <span className="font-medium">고객: </span>
            {event.crmCustomerName ? (
              <Link
                href={`/crm?id=${event.crmCustomerId}`}
                className="text-brand hover:underline"
              >
                {event.crmCustomerName}
              </Link>
            ) : (
              <span className="text-gray-500">연결됨</span>
            )}
          </div>
        )}

        {/* 메모 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            메모 {savingMemo && <span className="text-gray-400 font-normal">(저장 중...)</span>}
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={handleMemoBlur}
            rows={4}
            placeholder="메모 입력..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
          />
        </div>
      </div>

      {/* 버튼 */}
      <div className="px-4 py-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={() => onEdit(event)}
          className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          편집
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
