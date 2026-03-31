'use client';

import type { CrmRecord } from '@/lib/notion/types';

// ── KanbanCard ──

interface KanbanCardProps {
  record: CrmRecord;
  onClick: () => void;
}

const MANAGER_COLORS: Record<string, string> = {
  '이창엽': 'bg-blue-100 text-blue-700',
  '박민우': 'bg-green-100 text-green-700',
};

function formatAmountMan(amount: number | null): string | null {
  if (amount === null) return null;
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}만원`;
}

export default function KanbanCard({ record, onClick }: KanbanCardProps) {
  const managerColor = record.manager
    ? (MANAGER_COLORS[record.manager] ?? 'bg-gray-100 text-gray-600')
    : 'bg-gray-100 text-gray-400';

  const managerLabel = record.manager ?? '미배정';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* 주소 */}
      <p className="truncate text-sm font-medium text-gray-900">{record.address}</p>

      {/* 고객명 + 전화번호 */}
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
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
        <p className="mt-1 text-xs text-gray-400">{record.area}</p>
      )}

      {/* 하단: 담당자 + 문의채널 + 견적금액 */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* 담당자 칩 */}
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${managerColor}`}>
          {managerLabel}
        </span>

        {/* 문의채널 */}
        {record.inquiryChannel && (
          <span className="text-xs text-gray-400">{record.inquiryChannel}</span>
        )}
      </div>

      {/* 견적금액 */}
      {record.estimateAmount !== null && (
        <p className="mt-1.5 text-right text-xs font-semibold text-gray-700">
          {formatAmountMan(record.estimateAmount)}
        </p>
      )}
    </div>
  );
}
