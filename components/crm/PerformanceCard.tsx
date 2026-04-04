'use client';

import type { CrmRecord } from '@/lib/supabase/crm-types';

// ── PerformanceCard (2줄 카드) ──

interface PerformanceCardProps {
  record: CrmRecord;
  isSuccess: boolean;
  onClick: () => void;
}

/** 만원 단위 금액 포맷 */
function formatAmount(amount: number): string {
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}만`;
}

/** MM/DD 형식 날짜 */
function fmtDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  return dateStr.slice(5);
}

export default function PerformanceCard({ record, isSuccess, onClick }: PerformanceCardProps) {
  const amount = record.contractAmount ?? record.estimateAmount;
  const completedDate = fmtDate(record.balanceCompleteDate ?? record.inquiryDate);

  return (
    <div
      data-testid="performance-card"
      onClick={onClick}
      className={`cursor-pointer rounded-xl bg-white p-3 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 border-l-4 ${
        isSuccess ? 'border-l-blue-400' : 'border-l-red-400'
      }`}
    >
      {/* 1행: 주소 */}
      <p className="truncate text-sm font-semibold text-ink leading-tight">
        {record.address}
      </p>
      {/* 2행: 금액 + 날짜 */}
      <div className="mt-1 flex items-center gap-2">
        {amount != null && (
          <span className="text-xs font-bold tabular-nums text-ink">
            {formatAmount(amount)}
          </span>
        )}
        {completedDate && (
          <span className="text-[10px] text-ink-muted">{completedDate}</span>
        )}
        {record.manager && (
          <span className="ml-auto text-[10px] text-ink-muted">{record.manager}</span>
        )}
      </div>
    </div>
  );
}
