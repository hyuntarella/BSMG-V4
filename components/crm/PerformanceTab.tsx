'use client';

import { useMemo, useState } from 'react';
import type { CrmRecord } from '@/lib/supabase/crm-types';
import PerformanceCard from './PerformanceCard';

// ── PerformanceTab (2컬럼 칸반) ──

interface PerformanceTabProps {
  records: CrmRecord[];
  onCardClick: (record: CrmRecord) => void;
}

/** 실적 분류 헬퍼 */
function isSuccessRecord(r: CrmRecord): boolean {
  return r.contractStatus === '계약성공' || r.pipeline === '잔금완료';
}

function isFailRecord(r: CrmRecord): boolean {
  return r.contractStatus === '계약실패' || r.pipeline === '재연락금지';
}

/** 만원 단위 포맷 */
function fmtMan(amount: number): string {
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString()}만`;
}

export default function PerformanceTab({ records, onCardClick }: PerformanceTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState('전체');

  // 실적 레코드 필터링
  const performanceRecords = useMemo(
    () => records.filter((r) => isSuccessRecord(r) || isFailRecord(r)),
    [records]
  );

  // 검색 + 담당자 필터 적용
  const filteredRecords = useMemo(() => {
    return performanceRecords.filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const inAddress = r.address.toLowerCase().includes(q);
        const inName = (r.customerName ?? '').toLowerCase().includes(q);
        if (!inAddress && !inName) return false;
      }
      if (managerFilter !== '전체' && r.manager !== managerFilter) return false;
      return true;
    });
  }, [performanceRecords, searchQuery, managerFilter]);

  // 성공/실패 분리
  const successRecords = useMemo(() => filteredRecords.filter(isSuccessRecord), [filteredRecords]);
  const failRecords = useMemo(() => filteredRecords.filter(isFailRecord), [filteredRecords]);

  // 금액 합계
  const successTotal = useMemo(
    () => successRecords.reduce((sum, r) => sum + (r.contractAmount ?? r.estimateAmount ?? 0), 0),
    [successRecords]
  );
  const failTotal = useMemo(
    () => failRecords.reduce((sum, r) => sum + (r.contractAmount ?? r.estimateAmount ?? 0), 0),
    [failRecords]
  );

  const successRate = performanceRecords.length > 0
    ? Math.round((successRecords.length / performanceRecords.length) * 100)
    : 0;

  return (
    <div data-testid="performance-tab" className="flex flex-col">
      {/* 검색 + 필터 */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2">
        <input
          type="text"
          placeholder="주소, 고객명 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
          data-testid="performance-search"
        />
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
          data-testid="performance-manager-filter"
        >
          <option value="전체">담당자 전체</option>
          <option value="이창엽">이창엽</option>
          <option value="박민우">박민우</option>
        </select>
        <span className="ml-auto text-xs text-gray-500">
          성공률 <strong className="text-gray-800">{successRate}%</strong>
        </span>
      </div>

      {/* 2컬럼 칸반 */}
      <div className="flex gap-3 overflow-x-auto p-4">
        {/* 성공 컬럼 */}
        <div data-testid="performance-success-column" className="flex min-w-[280px] max-w-[320px] flex-shrink-0 flex-col rounded-xl bg-blue-50/50">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-700">성공</span>
              {successTotal > 0 && (
                <span className="text-[10px] text-blue-500 font-medium tabular-nums">
                  {fmtMan(successTotal)}
                </span>
              )}
            </div>
            <span className="min-w-[1.5rem] rounded-full bg-blue-100 px-1.5 py-0.5 text-center text-xs font-bold text-blue-700">
              {successRecords.length}
            </span>
          </div>
          <div className="flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto px-2 pb-3">
            {successRecords.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">성공 건 없음</p>
            ) : (
              successRecords.map((record) => (
                <PerformanceCard
                  key={record.id}
                  record={record}
                  isSuccess={true}
                  onClick={() => onCardClick(record)}
                />
              ))
            )}
          </div>
        </div>

        {/* 실패 컬럼 */}
        <div data-testid="performance-fail-column" className="flex min-w-[280px] max-w-[320px] flex-shrink-0 flex-col rounded-xl bg-red-50/50">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-red-700">실패</span>
              {failTotal > 0 && (
                <span className="text-[10px] text-red-500 font-medium tabular-nums">
                  {fmtMan(failTotal)}
                </span>
              )}
            </div>
            <span className="min-w-[1.5rem] rounded-full bg-red-100 px-1.5 py-0.5 text-center text-xs font-bold text-red-700">
              {failRecords.length}
            </span>
          </div>
          <div className="flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto px-2 pb-3">
            {failRecords.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">실패 건 없음</p>
            ) : (
              failRecords.map((record) => (
                <PerformanceCard
                  key={record.id}
                  record={record}
                  isSuccess={false}
                  onClick={() => onCardClick(record)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
