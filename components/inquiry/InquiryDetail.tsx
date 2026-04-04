'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Inquiry, InquiryUpdate, InquiryChannel, WorkType, PipelineStage, ContractStatus } from '@/lib/supabase/inquiry-types';
import { PIPELINE_STAGES, CHANNEL_LABELS, WORK_TYPE_OPTIONS } from '@/lib/supabase/inquiry-types';
import DetailField from '@/components/crm/DetailField';

// ── InquiryDetail — 우측 슬라이드 패널 ──

const MANAGERS = ['이창엽', '박민우'];
const CHANNEL_OPTIONS: InquiryChannel[] = [
  'naver_powerlink', 'naver_powercontent', 'naver_phone',
  'soomgo', 'daum_nate', 'referral', 'etc',
];
const CONTRACT_OPTIONS: ContractStatus[] = ['진행중', 'Won', 'Lost'];

interface InquiryDetailProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, partial: InquiryUpdate) => void;
}

export default function InquiryDetail({ inquiry, isOpen, onClose, onUpdate }: InquiryDetailProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen || !inquiry) return null;

  const handleSave = async (field: string, rawValue: string | null) => {
    let value: string | number | boolean | null = rawValue;

    if (field === 'estimate_amount' || field === 'contract_amount') {
      value = rawValue !== null ? Number(rawValue) : null;
    }
    if (field === 'area_sqm') {
      value = rawValue !== null ? parseFloat(rawValue) : null;
    }
    if (field === 'proposal_sent' || field === 'ir_inspection' || field === 'case_documented') {
      value = rawValue === 'true';
    }

    const update = { [field]: value } as InquiryUpdate;
    onUpdate(inquiry.id, update);

    await fetch(`/api/inquiries/${inquiry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
  };

  const handleGoToEstimate = () => {
    router.push(
      `/estimate/new?crmId=${inquiry.legacy_crm_id ?? inquiry.id}&address=${encodeURIComponent(inquiry.address)}&customerName=${encodeURIComponent(inquiry.client_name ?? '')}&manager=${encodeURIComponent(inquiry.manager ?? '')}`
    );
  };

  const handleGoToProposal = () => {
    router.push(
      `/proposal?address=${encodeURIComponent(inquiry.address)}&manager=${encodeURIComponent(inquiry.manager ?? '')}`
    );
  };

  const channelDisplayOptions = CHANNEL_OPTIONS.map((ch) => CHANNEL_LABELS[ch]);
  const channelDisplay = CHANNEL_LABELS[inquiry.channel] ?? inquiry.channel;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        data-testid="inquiry-detail-panel"
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <h2 className="truncate text-base font-semibold text-gray-800">{inquiry.address}</h2>
          <button onClick={onClose} className="ml-2 flex-shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4">
          {/* 견적서/제안서 연결 버튼 */}
          <div className="flex gap-2">
            <button onClick={handleGoToEstimate} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">
              견적서 작성
            </button>
            <button onClick={handleGoToProposal} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:opacity-90">
              제안서 작성
            </button>
          </div>

          {/* 기본정보 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">기본정보</h3>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="주소" value={inquiry.address} type="text" onSave={(v) => handleSave('address', v)} />
              <DetailField label="고객명" value={inquiry.client_name} type="text" onSave={(v) => handleSave('client_name', v)} />
              <DetailField label="연락처" value={inquiry.phone} type="phone" onSave={(v) => handleSave('phone', v)} />
              <DetailField label="시공분야" value={inquiry.work_type} type="select" options={WORK_TYPE_OPTIONS} onSave={(v) => handleSave('work_type', v)} />
              <DetailField label="채널" value={channelDisplay} type="select" options={channelDisplayOptions} onSave={(v) => {
                const entry = Object.entries(CHANNEL_LABELS).find(([, label]) => label === v);
                handleSave('channel', entry ? entry[0] : v);
              }} />
              <DetailField label="담당자" value={inquiry.manager} type="select" options={MANAGERS} onSave={(v) => handleSave('manager', v)} />
            </div>
          </section>

          {/* 파이프라인 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">영업정보</h3>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="파이프라인" value={inquiry.pipeline_stage} type="select" options={PIPELINE_STAGES as unknown as string[]} onSave={(v) => handleSave('pipeline_stage', v)} />
              <DetailField label="계약상태" value={inquiry.contract_status} type="select" options={CONTRACT_OPTIONS} onSave={(v) => handleSave('contract_status', v)} />
              <DetailField label="견적금액" value={inquiry.estimate_amount?.toString() ?? null} type="number" onSave={(v) => handleSave('estimate_amount', v)} />
              <DetailField label="계약금액" value={inquiry.contract_amount?.toString() ?? null} type="number" onSave={(v) => handleSave('contract_amount', v)} />
              <DetailField label="시공평수" value={inquiry.area_sqm?.toString() ?? null} type="number" onSave={(v) => handleSave('area_sqm', v)} />
            </div>
          </section>

          {/* 체크박스 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">진행 체크</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inquiry.proposal_sent}
                  onChange={(e) => handleSave('proposal_sent', String(e.target.checked))}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                제안서 발송
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inquiry.ir_inspection}
                  onChange={(e) => handleSave('ir_inspection', String(e.target.checked))}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                적외선 측정
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inquiry.case_documented}
                  onChange={(e) => handleSave('case_documented', String(e.target.checked))}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                시공 사례 정리
              </label>
            </div>
          </section>

          {/* 메모 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">메모</h3>
            <DetailField label="메모" value={inquiry.memo} type="text" onSave={(v) => handleSave('memo', v)} />
          </section>

          {/* 링크 */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">링크</h3>
            <div className="flex flex-col gap-2">
              <DetailField label="구글드라이브URL" value={inquiry.drive_url} type="url" onSave={(v) => handleSave('drive_url', v)} />
              <DetailField label="견적서웹URL" value={inquiry.estimate_web_url} type="url" onSave={(v) => handleSave('estimate_web_url', v)} />
            </div>
          </section>

          {/* 소개 출처 (referral 채널일 때) */}
          {inquiry.channel === 'referral' && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">소개 출처</h3>
              <DetailField label="소개인" value={inquiry.referral_source} type="text" onSave={(v) => handleSave('referral_source', v)} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
