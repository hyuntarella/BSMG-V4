'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarEvent, CreateEventInput } from '@/lib/notion/calendar';

interface Member {
  id: string;
  name: string;
  color?: string;
}

interface CrmResult {
  id: string;
  name: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  initialDate?: string;
  editEvent?: CalendarEvent | null;
  members: Member[];
  crmPreFill?: { id: string; name: string } | null;
}

const EVENT_TYPES = ['방문', '시공', '미팅', '기타'];
const EVENT_ACTIONS = ['방문', '견적', '시공', '하자점검', '기타'];

function toLocalDatetimeValue(iso: string): string {
  // ISO "2026-03-31T10:00:00.000Z" or "2026-03-31" → "2026-03-31T10:00"
  if (!iso) return '';
  if (iso.includes('T')) return iso.slice(0, 16);
  return iso + 'T00:00';
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  editEvent,
  members,
  crmPreFill,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [type, setType] = useState('방문');
  const [action, setAction] = useState('');
  const [memberId, setMemberId] = useState('');
  const [crmQuery, setCrmQuery] = useState('');
  const [crmResults, setCrmResults] = useState<CrmResult[]>([]);
  const [selectedCrm, setSelectedCrm] = useState<CrmResult | null>(null);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCrmDropdown, setShowCrmDropdown] = useState(false);

  const crmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 폼 초기화
  useEffect(() => {
    if (!isOpen) return;

    if (editEvent) {
      setTitle(editEvent.title);
      setAllDay(editEvent.allDay);
      if (editEvent.allDay) {
        setStartDate(editEvent.start.slice(0, 10));
        setEndDate(editEvent.end?.slice(0, 10) ?? editEvent.start.slice(0, 10));
        setStartTime('09:00');
        setEndTime('10:00');
      } else {
        const sdt = toLocalDatetimeValue(editEvent.start);
        setStartDate(sdt.slice(0, 10));
        setStartTime(sdt.slice(11, 16));
        const edt = editEvent.end ? toLocalDatetimeValue(editEvent.end) : sdt;
        setEndDate(edt.slice(0, 10));
        setEndTime(edt.slice(11, 16));
      }
      setType(editEvent.type ?? '방문');
      setAction(editEvent.action ?? '');
      setMemberId(editEvent.memberId ?? '');
      setMemo(editEvent.memo ?? '');
      if (editEvent.crmCustomerId) {
        setSelectedCrm({ id: editEvent.crmCustomerId, name: editEvent.crmCustomerName ?? '' });
        setCrmQuery(editEvent.crmCustomerName ?? '');
      } else {
        setSelectedCrm(null);
        setCrmQuery('');
      }
    } else {
      setTitle('');
      const date = initialDate ?? new Date().toISOString().slice(0, 10);
      setStartDate(date);
      setEndDate(date);
      setStartTime('09:00');
      setEndTime('10:00');
      setAllDay(false);
      setType('방문');
      setAction('');
      setMemberId('');
      setMemo('');

      // CRM에서 넘어온 경우 고객 정보 프리필
      if (crmPreFill?.id) {
        setSelectedCrm({ id: crmPreFill.id, name: crmPreFill.name });
        setCrmQuery(crmPreFill.name);
        setTitle(crmPreFill.name ? `방문 - ${crmPreFill.name}` : '');
      } else {
        setCrmQuery('');
        setSelectedCrm(null);
      }
    }
    setCrmResults([]);
    setShowCrmDropdown(false);
  }, [isOpen, editEvent, initialDate, crmPreFill]);

  // CRM 고객 검색 (debounce 300ms)
  const searchCrm = useCallback((q: string) => {
    if (crmTimerRef.current) clearTimeout(crmTimerRef.current);
    if (!q.trim()) {
      setCrmResults([]);
      setShowCrmDropdown(false);
      return;
    }
    crmTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/crm/search?q=${encodeURIComponent(q)}&limit=8`);
        if (!res.ok) return;
        const data = await res.json();
        const results: CrmResult[] = (data.results ?? []).map((r: { id: string; name: string }) => ({
          id: r.id,
          name: r.name,
        }));
        setCrmResults(results);
        setShowCrmDropdown(results.length > 0);
      } catch {
        // 검색 실패는 조용히 무시
      }
    }, 300);
  }, []);

  function handleCrmInput(value: string) {
    setCrmQuery(value);
    if (selectedCrm && value !== selectedCrm.name) {
      setSelectedCrm(null);
    }
    searchCrm(value);
  }

  function handleCrmSelect(crm: CrmResult) {
    setSelectedCrm(crm);
    setCrmQuery(crm.name);
    setCrmResults([]);
    setShowCrmDropdown(false);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const startIso = allDay ? startDate : `${startDate}T${startTime}`;
      const endIso = allDay ? endDate : `${endDate}T${endTime}`;

      const input: CreateEventInput = {
        title: title.trim(),
        start: startIso,
        end: endIso !== startIso ? endIso : undefined,
        allDay,
        type,
        action: action || undefined,
        memberId: memberId || undefined,
        crmCustomerId: selectedCrm?.id || undefined,
        memo: memo.trim() || undefined,
      };

      let res: Response;
      if (editEvent) {
        res = await fetch(`/api/calendar/${editEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
      } else {
        res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
      }

      if (!res.ok) throw new Error('저장 실패');
      const data = await res.json();
      onSave(data.event);
    } catch (err) {
      console.error('[EventModal] 저장 오류:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editEvent) return;
    if (!confirm(`"${editEvent.title}" 이벤트를 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendar/${editEvent.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      onClose();
    } catch (err) {
      console.error('[EventModal] 삭제 오류:', err);
    } finally {
      setDeleting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {editEvent ? '일정 편집' : '새 일정'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 폼 */}
        <div className="px-5 py-4 space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          {/* 종일 토글 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700">종일</label>
          </div>

          {/* 날짜/시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">시작</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">종료</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              )}
            </div>
          </div>

          {/* 타입 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">타입</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 액션 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">액션</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="">선택 안 함</option>
              {EVENT_ACTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* 담당자 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">담당자</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="">선택 안 함</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* CRM 고객 검색 */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-1">CRM 고객</label>
            <input
              type="text"
              value={crmQuery}
              onChange={(e) => handleCrmInput(e.target.value)}
              onFocus={() => crmResults.length > 0 && setShowCrmDropdown(true)}
              onBlur={() => setTimeout(() => setShowCrmDropdown(false), 150)}
              placeholder="고객 이름 검색..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            {selectedCrm && (
              <span className="absolute right-3 top-[30px] text-xs text-brand font-medium">
                연결됨
              </span>
            )}
            {showCrmDropdown && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {crmResults.map((crm) => (
                  <li
                    key={crm.id}
                    onMouseDown={() => handleCrmSelect(crm)}
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    {crm.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="메모 (선택)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div>
            {editEvent && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? '저장 중...' : editEvent ? '수정' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
