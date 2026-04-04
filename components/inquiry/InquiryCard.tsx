'use client';

import { useState } from 'react';
import type { Inquiry } from '@/lib/supabase/inquiry-types';
import { CHANNEL_LABELS } from '@/lib/supabase/inquiry-types';

// ── InquiryCard ──

interface InquiryCardProps {
  inquiry: Inquiry;
  onClick: () => void;
}

const MANAGER_COLORS: Record<string, string> = {
  '이창엽': 'bg-blue-100 text-blue-700',
  '박민우': 'bg-emerald-100 text-emerald-700',
};

function fmtAmount(amount: number | null): string | null {
  if (amount === null || amount === 0) return null;
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}만`;
}

function calcStageDays(stageChangedAt: string | null): number {
  if (!stageChangedAt) return 0;
  return Math.floor((Date.now() - new Date(stageChangedAt).getTime()) / 86400000);
}

export default function InquiryCard({ inquiry, onClick }: InquiryCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const managerColor = inquiry.manager
    ? (MANAGER_COLORS[inquiry.manager] ?? 'bg-gray-100 text-gray-600')
    : null;
  const managerInitial = inquiry.manager ? inquiry.manager[0] : null;

  const estAmount = fmtAmount(inquiry.estimate_amount);
  const contractAmount = fmtAmount(inquiry.contract_amount);

  const stageDays = calcStageDays(inquiry.stage_changed_at);
  const isStagnant = stageDays >= 7;

  const channelLabel = CHANNEL_LABELS[inquiry.channel] ?? inquiry.channel;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', inquiry.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  return (
    <div
      data-testid="inquiry-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onClick={onClick}
      className={`group cursor-pointer rounded-xl bg-white p-3 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 relative overflow-hidden min-h-[72px] ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      {/* 정체 경고 바 */}
      {isStagnant && (
        <div data-testid="stagnant-badge" className="absolute top-0 left-0 right-0 h-0.5 bg-red-500" />
      )}

      {/* hover 좌측 브랜드 바 */}
      <div className="absolute left-0 top-0 bottom-0 w-0 bg-brand transition-all group-hover:w-1" />

      {/* 1행: 주소 + 정체 뱃지 */}
      <div className="flex items-center gap-1.5">
        <p data-testid="inquiry-card-address" className="flex-1 truncate text-sm font-semibold text-ink leading-tight">
          {inquiry.address}
        </p>
        {isStagnant && (
          <span className="flex-shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
            {stageDays}일
          </span>
        )}
      </div>

      {/* 2행: 고객명 + 담당자 뱃지 */}
      <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-secondary">
        {inquiry.client_name && <span>{inquiry.client_name}</span>}
        {inquiry.client_name && inquiry.manager && <span className="text-ink-faint">&middot;</span>}
        {inquiry.manager && managerInitial && (
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${managerColor}`}>
            {managerInitial}
          </span>
        )}
      </div>

      {/* 3행: 금액 */}
      {(estAmount || contractAmount) && (
        <div data-testid="inquiry-card-amounts" className="mt-1.5 flex items-center gap-1 text-xs font-mono tabular-nums text-ink">
          {estAmount && <span>견적 <span className="font-semibold">{estAmount}</span></span>}
          {estAmount && contractAmount && <span className="text-ink-faint">|</span>}
          {contractAmount && <span>계약 <span className="font-semibold text-brand">{contractAmount}</span></span>}
        </div>
      )}

      {/* 4행: 채널 뱃지 + 시공분야 뱃지 */}
      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
          {channelLabel}
        </span>
        {inquiry.work_type && inquiry.work_type !== '기타' && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            {inquiry.work_type}
          </span>
        )}
      </div>

      {/* 5행: 체크박스 상태 */}
      {(inquiry.proposal_sent || inquiry.ir_inspection || inquiry.case_documented) && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-muted">
          {inquiry.proposal_sent && <span className="text-emerald-600 font-medium">제안서</span>}
          {inquiry.ir_inspection && <span className="text-purple-600 font-medium">적외선</span>}
          {inquiry.case_documented && <span className="text-orange-600 font-medium">사례</span>}
        </div>
      )}

      {/* 6행: 바로가기 아이콘 */}
      <div data-testid="inquiry-card-links" className="mt-1.5 flex items-center gap-1">
        {inquiry.estimate_web_url && (
          <a
            href={inquiry.estimate_web_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-5 items-center gap-0.5 rounded bg-blue-50 px-1.5 text-[10px] font-medium text-blue-600 hover:bg-blue-100 transition-colors"
            data-testid="inquiry-card-estimate-link"
          >
            견적서
          </a>
        )}
        {inquiry.drive_url && (
          <a
            href={inquiry.drive_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-5 items-center gap-0.5 rounded bg-gray-50 px-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            data-testid="inquiry-card-drive-link"
          >
            Drive
          </a>
        )}
      </div>
    </div>
  );
}
