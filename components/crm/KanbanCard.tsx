'use client';

import { useState } from 'react';
import type { CrmRecord } from '@/lib/supabase/crm-types';

// ── KanbanCard ──

interface KanbanCardProps {
  record: CrmRecord;
  onClick: () => void;
}

const MANAGER_COLORS: Record<string, string> = {
  '이창엽': 'bg-blue-100 text-blue-700',
  '박민우': 'bg-emerald-100 text-emerald-700',
};

const MANAGER_INITIALS: Record<string, string> = {
  '이창엽': '이',
  '박민우': '박',
};

/** 만원 단위 금액 포맷 — font-mono용 */
function fmtAmount(amount: number | null): string | null {
  if (amount === null || amount === 0) return null;
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}만`;
}

/** MM/DD 형식 날짜 */
function fmtDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // "2026-03-15" → "03/15"
  const parts = dateStr.split('-');
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  return dateStr.slice(5);
}

export default function KanbanCard({ record, onClick }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const managerColor = record.manager
    ? (MANAGER_COLORS[record.manager] ?? 'bg-gray-100 text-gray-600')
    : null;
  const managerLabel = record.manager ?? null;
  const managerInitial = record.manager
    ? (MANAGER_INITIALS[record.manager] ?? record.manager[0])
    : null;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', record.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const estAmount = fmtAmount(record.estimateAmount);
  const contractAmount = fmtAmount(record.contractAmount);
  const estDate = fmtDate(record.estimateSentDate);
  const viewedDate = fmtDate(record.estimateViewedDate);
  const visitDate = fmtDate(record.visitDate);

  // 정체 경고: 최근 활동 기준 7일 이상 경과
  const stagnantDays = (() => {
    const refDate = record.estimateSentDate ?? record.visitDate ?? record.inquiryDate;
    if (!refDate) return 0;
    return Math.floor((Date.now() - new Date(refDate).getTime()) / 86400000);
  })();
  const isStagnant = stagnantDays >= 7;

  return (
    <div
      data-testid="kanban-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`group cursor-pointer rounded-xl bg-white p-3 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 relative overflow-hidden min-h-[72px] ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      {/* 정체 경고 바 */}
      {isStagnant && (
        <div data-testid="stagnant-badge" className="absolute top-0 left-0 right-0 h-0.5 bg-red-500" />
      )}

      {/* hover 시 좌측 브랜드 바 */}
      <div className="absolute left-0 top-0 bottom-0 w-0 bg-brand transition-all group-hover:w-1" />

      {/* 1행: 주소 + 정체 뱃지 */}
      <div className="flex items-center gap-1.5">
        <p data-testid="kanban-card-address" className="flex-1 truncate text-sm font-semibold text-ink leading-tight">
          {record.address}
        </p>
        {isStagnant && (
          <span className="flex-shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
            {stagnantDays}일
          </span>
        )}
      </div>

      {/* 2행: 고객명 + 담당자 뱃지 */}
      <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-secondary">
        {record.customerName && <span>{record.customerName}</span>}
        {record.customerName && managerLabel && <span className="text-ink-faint">&middot;</span>}
        {managerLabel && (
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${managerColor}`}>
            {managerInitial}
          </span>
        )}
      </div>

      {/* 3행: 금액 — 견적 | 계약 */}
      {(estAmount || contractAmount) && (
        <div data-testid="kanban-card-amounts" className="mt-1.5 flex items-center gap-1 text-xs font-mono tabular-nums text-ink">
          {estAmount && <span>견적 <span className="font-semibold">{estAmount}</span></span>}
          {estAmount && contractAmount && <span className="text-ink-faint">|</span>}
          {contractAmount && <span>계약 <span className="font-semibold text-brand">{contractAmount}</span></span>}
        </div>
      )}

      {/* 4행: 날짜 흐름 — 방문일 → 발송일 → 열람일 */}
      {(visitDate || estDate || viewedDate) && (
        <div data-testid="kanban-card-dates" className="mt-1 flex items-center gap-1 text-[10px] text-ink-muted">
          {visitDate && <span>방문 {visitDate}</span>}
          {visitDate && estDate && <span>&rarr;</span>}
          {estDate && <span>발송 {estDate}</span>}
          {estDate && viewedDate && <span>&rarr;</span>}
          {!estDate && viewedDate && visitDate && <span>&rarr;</span>}
          {viewedDate && <span className="text-emerald-600 font-medium">열람 {viewedDate}</span>}
        </div>
      )}

      {/* 5행: 메모 미리보기 — 1줄 truncate, italic */}
      {record.memo && (
        <p data-testid="kanban-card-memo" className="mt-1 truncate text-[10px] text-ink-muted italic leading-tight">
          {record.memo}
        </p>
      )}

      {/* 6행: 바로가기 아이콘 */}
      <div data-testid="kanban-card-links" className="mt-1.5 flex items-center gap-1">
        {record.estimateWebUrl && (
          <a
            href={record.estimateWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-5 items-center gap-0.5 rounded bg-blue-50 px-1.5 text-[10px] font-medium text-blue-600 hover:bg-blue-100 transition-colors"
            title="견적서"
            data-testid="kanban-card-estimate-link"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            견적서
          </a>
        )}
        <a
          href={`/proposal?customer_id=${record.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-5 items-center gap-0.5 rounded bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          title="제안서"
          data-testid="kanban-card-proposal-link"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          제안서
        </a>
        {record.driveUrl && (
          <a
            href={record.driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-5 items-center gap-0.5 rounded bg-gray-50 px-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            title="Google Drive"
            data-testid="kanban-card-drive-link"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Drive
          </a>
        )}
      </div>
    </div>
  );
}
