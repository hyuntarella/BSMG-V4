'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmRecord } from '@/lib/supabase/crm-types';
import { STAGE_MAP } from '@/lib/supabase/crm-types';
import DetailField from './DetailField';
import CommentSection from './CommentSection';
import ProgressTimeline from './ProgressTimeline';
import ActionButtons from './ActionButtons';

// ── DetailModal ──

const MANAGERS = ['이창엽', '박민우', '미배정'];
const STAGES = ['0.문의', '1.영업', '1-1.장기', '2.시공', '3.하자'];
const CONTRACT_STATUSES = ['계약전', '계약중', '계약완료', '계약취소'];
const INQUIRY_CHANNELS = ['네이버', '인스타', '유튜브', '지인소개', '직접방문', '기타'];
const WORK_TYPES = ['복합방수', '우레탄방수', '주차장고경질', '옥상녹화', '지붕공사', '기타'];

interface DetailModalProps {
  record: CrmRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, partial: Partial<CrmRecord>) => void;
}

export default function DetailModal({ record, isOpen, onClose, onUpdate }: DetailModalProps) {
  const router = useRouter();

  // ESC로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const pipelineOptions = record.stage ? (STAGE_MAP[record.stage] ?? []) : [];

  const handleGoToEstimate = () => {
    router.push(
      `/estimate/new?crmId=${record.id}&address=${encodeURIComponent(record.address)}&customerName=${encodeURIComponent(record.customerName ?? '')}&manager=${encodeURIComponent(record.manager ?? '')}`
    );
  };

  const handleGoToProposal = () => {
    router.push(
      `/proposal?address=${encodeURIComponent(record.address)}&manager=${encodeURIComponent(record.manager ?? '')}`
    );
  };

  const handleGoToCalendar = () => {
    const params = new URLSearchParams();
    params.set('action', 'create');
    params.set('crmId', record.id);
    if (record.customerName) params.set('crmName', record.customerName);
    if (record.address) params.set('address', record.address);
    router.push(`/calendar?${params.toString()}`);
  };

  const handleSave = async (field: keyof CrmRecord, rawValue: string | null) => {
    let value: string | number | string[] | null = rawValue;

    // ── Type coerce for numeric fields ──
    if (
      field === 'estimateAmount' ||
      field === 'contractAmount' ||
      field === 'deposit' ||
      field === 'balance'
    ) {
      value = rawValue !== null ? Number(rawValue) : null;
    }

    // ── multiselect: workTypes ──
    if (field === 'workTypes') {
      const arr = rawValue ? rawValue.split(',').map((s) => s.trim()).filter(Boolean) : [];
      onUpdate(record.id, { [field]: arr });
      await fetch(`/api/crm/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: arr }),
      });
      return;
    }

    onUpdate(record.id, { [field]: value as never });
    await fetch(`/api/crm/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const workTypesDisplay = record.workTypes?.length > 0 ? record.workTypes.join(', ') : null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      {/* 우측 슬라이드 패널 */}
      <div
        data-testid="detail-panel"
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <h2 className="truncate text-base font-semibold text-gray-800">{record.address}</h2>
          <button
            onClick={onClose}
            className="ml-2 flex-shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4">
          {/* 견적서/제안서 연결 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleGoToEstimate}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              견적서 작성
            </button>
            <button
              onClick={handleGoToProposal}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2zm-6 4h3v2H7v-2z" clipRule="evenodd" />
              </svg>
              제안서 작성
            </button>
          </div>

          {/* 액션 버튼 */}
          <ActionButtons record={record} />

          {/* 기본정보 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">기본정보</h3>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="주소" value={record.address} type="text" onSave={(v) => handleSave('address', v)} />
              <DetailField label="고객명" value={record.customerName} type="text" onSave={(v) => handleSave('customerName', v)} />
              <DetailField label="전화번호" value={record.phone} type="phone" onSave={(v) => handleSave('phone', v)} />
              <DetailField label="고객이메일" value={record.email} type="email" onSave={(v) => handleSave('email', v)} />
              <DetailField label="문의채널" value={record.inquiryChannel} type="select" options={INQUIRY_CHANNELS} onSave={(v) => handleSave('inquiryChannel', v)} />
              <DetailField label="메모" value={record.memo} type="text" onSave={(v) => handleSave('memo', v)} />
            </div>
          </section>

          {/* 영업정보 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">영업정보</h3>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="담당자" value={record.manager} type="select" options={MANAGERS} onSave={(v) => handleSave('manager', v)} />
              <DetailField label="단계" value={record.stage} type="select" options={STAGES} onSave={(v) => handleSave('stage', v)} />
              <DetailField label="파이프라인" value={record.pipeline} type="select" options={pipelineOptions} onSave={(v) => handleSave('pipeline', v)} />
              <DetailField label="계약상태" value={record.contractStatus} type="select" options={CONTRACT_STATUSES} onSave={(v) => handleSave('contractStatus', v)} />
            </div>
          </section>

          {/* 시공정보 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">시공정보</h3>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="시공분야" value={workTypesDisplay} type="multiselect" options={WORK_TYPES} onSave={(v) => handleSave('workTypes', v)} />
              <DetailField label="시공평수" value={record.area} type="text" onSave={(v) => handleSave('area', v)} />
            </div>
          </section>

          {/* 금액 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">금액</h3>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="견적금액" value={record.estimateAmount?.toString() ?? null} type="number" onSave={(v) => handleSave('estimateAmount', v)} />
              <DetailField label="계약금액" value={record.contractAmount?.toString() ?? null} type="number" onSave={(v) => handleSave('contractAmount', v)} />
              <DetailField label="착수금" value={record.deposit?.toString() ?? null} type="number" onSave={(v) => handleSave('deposit', v)} />
              <DetailField label="잔금" value={record.balance?.toString() ?? null} type="number" onSave={(v) => handleSave('balance', v)} />
            </div>
          </section>

          {/* 일정 */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">일정</h3>
              <button
                onClick={handleGoToCalendar}
                className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                캘린더 일정 추가
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="문의일자" value={record.inquiryDate} type="date" onSave={(v) => handleSave('inquiryDate', v)} />
              <DetailField label="견적방문일자" value={record.visitDate} type="date" onSave={(v) => handleSave('visitDate', v)} />
              <DetailField label="견적서발송일" value={record.estimateSentDate} type="date" onSave={(v) => handleSave('estimateSentDate', v)} />
              <DetailField label="견적서열람일" value={record.estimateViewedDate} type="date" onSave={(v) => handleSave('estimateViewedDate', v)} />
              <DetailField label="잔금완료" value={record.balanceCompleteDate} type="date" onSave={(v) => handleSave('balanceCompleteDate', v)} />
            </div>
          </section>

          {/* 링크 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">링크</h3>
            <div className="flex flex-col gap-2">
              <DetailField label="구글드라이브URL" value={record.driveUrl} type="url" onSave={(v) => handleSave('driveUrl', v)} />
              <DetailField label="견적서웹URL" value={record.estimateWebUrl} type="url" onSave={(v) => handleSave('estimateWebUrl', v)} />
            </div>
          </section>

          {/* 진행 타임라인 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">진행 현황</h3>
            <ProgressTimeline record={record} />
          </section>

          {/* 댓글 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">댓글</h3>
            <CommentSection pageId={record.id} />
          </section>
        </div>
      </div>
    </div>
  );
}
