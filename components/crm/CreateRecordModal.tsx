'use client';

import { useState, useRef, useEffect } from 'react';
import type { CrmRecord } from '@/lib/supabase/crm-types';

// ── CreateRecordModal ──

const MANAGERS = ['이창엽', '박민우', '미배정'];
const INQUIRY_CHANNELS = ['네이버', '전화', '소개', '기타'];

interface CreateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (record: CrmRecord) => void;
}

export default function CreateRecordModal({ isOpen, onClose, onCreate }: CreateRecordModalProps) {
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [manager, setManager] = useState('미배정');
  const [inquiryChannel, setInquiryChannel] = useState('');
  const [loading, setLoading] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const addressRef = useRef<HTMLInputElement>(null);

  // ESC로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // 모달 열릴 때 폼 초기화 + 포커스
  useEffect(() => {
    if (isOpen) {
      setAddress('');
      setCustomerName('');
      setPhone('');
      setManager('미배정');
      setInquiryChannel('');
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
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          customerName: customerName.trim() || undefined,
          phone: phone.trim() || undefined,
          manager: manager !== '미배정' ? manager : undefined,
          inquiryChannel: inquiryChannel || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`레코드 생성 실패: ${res.status}`);
      }

      const created = (await res.json()) as CrmRecord;
      onCreate(created);
      onClose();
    } catch (err) {
      console.error('CreateRecordModal error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold text-gray-800">신규 레코드 생성</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 py-4">
          {/* 주소 (필수) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              주소 <span className="text-red-500">*</span>
            </label>
            <input
              ref={addressRef}
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (addressError) setAddressError(false);
              }}
              placeholder="시공 현장 주소"
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 ${
                addressError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                  : 'border-gray-200 focus:border-brand focus:ring-brand/20'
              }`}
            />
            {addressError && (
              <p className="mt-1 text-xs text-red-500">주소를 입력하세요.</p>
            )}
          </div>

          {/* 고객명 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">고객명</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="고객명 (선택)"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
            />
          </div>

          {/* 전화번호 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000 (선택)"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
            />
          </div>

          {/* 담당자 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">담당자</label>
            <select
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
            >
              {MANAGERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 문의채널 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">문의채널</label>
            <select
              value={inquiryChannel}
              onChange={(e) => setInquiryChannel(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
            >
              <option value="">선택 안 함</option>
              {INQUIRY_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-60"
            >
              {loading && (
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {loading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
