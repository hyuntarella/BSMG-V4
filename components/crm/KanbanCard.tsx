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

const MANAGER_AVATAR_BG: Record<string, string> = {
  '이창엽': 'bg-blue-500',
  '박민우': 'bg-emerald-500',
};

function formatAmountMan(amount: number | null): string | null {
  if (amount === null) return null;
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}만원`;
}

export default function KanbanCard({ record, onClick }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const managerColor = record.manager
    ? (MANAGER_COLORS[record.manager] ?? 'bg-gray-100 text-gray-600')
    : 'bg-gray-100 text-gray-400';

  const managerLabel = record.manager ?? '미배정';
  const managerInitial = record.manager
    ? (MANAGER_INITIALS[record.manager] ?? record.manager[0])
    : '?';
  const avatarBg = record.manager
    ? (MANAGER_AVATAR_BG[record.manager] ?? 'bg-gray-400')
    : 'bg-gray-300';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', record.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      data-testid="kanban-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`group cursor-pointer rounded-xl bg-white p-3.5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 relative overflow-hidden ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      {/* hover 시 좌측 브랜드 바 */}
      <div className="absolute left-0 top-0 bottom-0 w-0 bg-brand transition-all group-hover:w-1" />

      {/* 주소 */}
      <p className="truncate text-sm font-semibold text-ink">{record.address}</p>

      {/* 고객명 + 전화번호 */}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-secondary">
        {record.customerName && <span>{record.customerName}</span>}
        {record.phone && (
          <a
            href={`tel:${record.phone}`}
            className="hover:text-brand hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {record.phone}
          </a>
        )}
      </div>

      {/* 시공평수 */}
      {record.area && (
        <p className="mt-1 text-xs text-ink-muted">{record.area}</p>
      )}

      {/* 날짜 정보 */}
      {(record.estimateSentDate || record.estimateViewedDate) && (
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-muted">
          {record.estimateSentDate && <span>발송 {record.estimateSentDate.slice(5)}</span>}
          {record.estimateViewedDate && <span className="text-emerald-600 font-medium">열람 {record.estimateViewedDate.slice(5)}</span>}
        </div>
      )}

      {/* 메모 미리보기 */}
      {record.memo && (
        <p className="mt-1 truncate text-[11px] text-ink-muted leading-tight">{record.memo}</p>
      )}

      {/* 하단: 담당자 아바타 + 링크 아이콘 + 견적금액 */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 담당자 아바타 */}
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg}`}>
            {managerInitial}
          </div>

          {/* 바로가기 아이콘 */}
          <div className="flex items-center gap-1">
            {record.estimateWebUrl && (
              <a
                href={record.estimateWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-5 w-5 items-center justify-center rounded text-ink-muted hover:text-brand hover:bg-brand-50 transition-colors"
                title="견적서"
                data-testid="kanban-card-estimate-link"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>
            )}
            {record.driveUrl && (
              <a
                href={record.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-5 w-5 items-center justify-center rounded text-ink-muted hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Google Drive"
                data-testid="kanban-card-drive-link"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* 견적금액 */}
        {record.estimateAmount !== null && (
          <span className="text-sm font-bold tabular-nums text-ink">
            {formatAmountMan(record.estimateAmount)}
          </span>
        )}
      </div>
    </div>
  );
}
