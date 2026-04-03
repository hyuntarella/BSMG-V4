'use client';

import type { CrmRecord } from '@/lib/supabase/crm-types';

// ── PerformanceCard ──

interface PerformanceCardProps {
  record: CrmRecord;
  isSuccess: boolean;
  onClick: () => void;
}

/** 만원 단위 금액 포맷 */
function formatAmount(amount: number): string {
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}만원`;
}

export default function PerformanceCard({ record, isSuccess, onClick }: PerformanceCardProps) {
  const amount = record.contractAmount ?? record.estimateAmount;
  const managerColor =
    record.manager === '이창엽'
      ? 'bg-blue-100 text-blue-700'
      : record.manager === '박민우'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-500';

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-3 transition-shadow hover:shadow-md ${
        isSuccess
          ? 'border-blue-200 bg-blue-50'
          : 'border-red-200 bg-red-50'
      }`}
    >
      {/* 주소 */}
      <p className="truncate text-sm font-medium text-gray-800">{record.address}</p>

      {/* 고객명 */}
      {record.customerName && (
        <p className="mt-0.5 text-xs text-gray-600">{record.customerName}</p>
      )}

      {/* 시공분야 */}
      {record.workTypes.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">{record.workTypes.join(', ')}</p>
      )}

      {/* 시공평수 */}
      {record.area && (
        <p className="mt-0.5 text-xs text-gray-500">{record.area}</p>
      )}

      {/* 금액 */}
      {amount != null && (
        <p className="mt-1.5 text-sm font-semibold text-gray-800">{formatAmount(amount)}</p>
      )}

      {/* 담당자 칩 */}
      {record.manager && (
        <div className="mt-1.5">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${managerColor}`}>
            {record.manager}
          </span>
        </div>
      )}
    </div>
  );
}
