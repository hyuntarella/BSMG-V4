'use client';

import { useState } from 'react';
import type { CrmRecord } from '@/lib/notion/types';

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

      {/* 하단: 담당자 아바타 + 문의채널 + 견적금액 */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 담당자 아바타 */}
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg}`}>
            {managerInitial}
          </div>

          {/* 문의채널 */}
          {record.inquiryChannel && (
            <span className="text-xs text-ink-muted">{record.inquiryChannel}</span>
          )}
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
