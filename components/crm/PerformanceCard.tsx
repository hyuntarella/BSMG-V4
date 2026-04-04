'use client';

import type { CrmRecord } from '@/lib/supabase/crm-types';

// ── PerformanceCard (축소 버전) ──

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
      className={`cursor-pointer rounded-lg border px-3 py-2 transition-shadow hover:shadow-md ${
        isSuccess
          ? 'border-blue-200 bg-blue-50/60'
          : 'border-red-200 bg-red-50/60'
      }`}
    >
      {/* 1줄: 주소 + 계약금액 + 완료일 */}
      <div className="flex items-center gap-2">
        <p className="flex-1 truncate text-xs font-medium text-gray-800">{record.address}</p>
        {amount != null && (
          <span className="flex-shrink-0 text-xs font-bold tabular-nums text-gray-700">{formatAmount(amount)}</span>
        )}
        {completedDate && (
          <span className="flex-shrink-0 text-[10px] text-gray-400">{completedDate}</span>
        )}
      </div>
    </div>
  );
}
