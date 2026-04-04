'use client';

import { useState, useRef, useEffect } from 'react';
import type { Inquiry, InquiryChannel, WorkType } from '@/lib/supabase/inquiry-types';
import { CHANNEL_LABELS, WORK_TYPE_OPTIONS } from '@/lib/supabase/inquiry-types';

// ── InquiryCreateModal ──

const MANAGERS = ['이창엽', '박민우'];
const CHANNEL_OPTIONS: InquiryChannel[] = [
  'naver_powerlink',
  'naver_powercontent',
  'naver_phone',
  'soomgo',
  'daum_nate',
  'referral',
  'etc',
];

interface InquiryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (inquiry: Inquiry) => void;
}

export default function InquiryCreateModal({ isOpen, onClose, onCreate }: InquiryCreateModalProps) {
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<InquiryChannel>('etc');
  const [workType, setWorkType] = useState<WorkType>('기타');
  const [manager, setManager] = useState('');
  const [loading, setLoading] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setAddress('');
      setClientName('');
      setPhone('');
      setChannel('etc');
      setWorkType('기타');
      setManager('');
      setAddressError(false);
      setLoading(false);
      setTimeout(() => addressRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      setAddressError(true);
      addressRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          client_name: clientName.trim() || undefined,
          phone: phone.trim() || undefined,
          channel,
          work_type: workType,
          manager: manager || undefined,
        }),
      });

      if (!res.ok) throw new Error(`생성 실패: ${res.status}`);

      const created = (await res.json()) as Inquiry;
      onCreate(created);
      onClose();
    } catch (err) {
      console.error('InquiryCreateModal error:', err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20';

  return (
    <div data-testid="inquiry-create-overlay" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        data-testid="inquiry-create-modal"
        className="w-full max-w-md rounded-t-xl sm:rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold text-gray-800">새 문의 등록</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form data-testid="inquiry-create-form" onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 py-4">
          {/* 주소 (필수) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              주소 <span className="text-red-500">*</span>
            </label>
            <input
              ref={addressRef}
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); if (addressError) setAddressError(false); }}
              placeholder="시공 현장 주소"
              className={`${inputClass} ${addressError ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
            />
            {addressError && <p className="mt-1 text-xs text-red-500">주소를 입력하세요.</p>}
          </div>

          {/* 고객명 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">고객명</label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="고객명" className={inputClass} />
          </div>

          {/* 연락처 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">연락처</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className={inputClass} />
          </div>

          {/* 채널 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">유입 채널</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as InquiryChannel)} className={inputClass}>
              {CHANNEL_OPTIONS.map((ch) => (
                <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
              ))}
            </select>
          </div>

          {/* 시공 분야 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">시공 분야</label>
            <select value={workType} onChange={(e) => setWorkType(e.target.value as WorkType)} className={inputClass}>
              {WORK_TYPE_OPTIONS.map((wt) => (
                <option key={wt} value={wt}>{wt}</option>
              ))}
            </select>
          </div>

          {/* 담당자 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">담당자</label>
            <select value={manager} onChange={(e) => setManager(e.target.value)} className={inputClass}>
              <option value="">미배정</option>
              {MANAGERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              data-testid="inquiry-create-submit"
              className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-60"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
