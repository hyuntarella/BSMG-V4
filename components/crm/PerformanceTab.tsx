'use client';

import { useMemo, useState } from 'react';
import type { CrmRecord } from '@/lib/notion/types';
import PerformanceCard from './PerformanceCard';

// ── PerformanceTab ──

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

/** 그룹핑에 사용할 날짜 파싱 */
function getRecordDate(r: CrmRecord): Date {
  const raw = r.inquiryDate ?? r.createdTime;
  return new Date(raw);
}

/** 연도→월→레코드 구조로 그룹핑 (최신 먼저) */
function groupByYearMonth(records: CrmRecord[]): [number, [number, CrmRecord[]][]][] {
  const yearMap = new Map<number, Map<number, CrmRecord[]>>();

  for (const r of records) {
    const d = getRecordDate(r);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-based

    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(r);
  }

  // 연도 내림차순
  const yearsSorted = Array.from(yearMap.keys()).sort((a, b) => b - a);

  return yearsSorted.map((year) => {
    const monthMap = yearMap.get(year)!;
    // 월 내림차순
    const monthsSorted = Array.from(monthMap.keys()).sort((a, b) => b - a);
    const monthEntries: [number, CrmRecord[]][] = monthsSorted.map((month) => [
      month,
      monthMap.get(month)!,
    ]);
    return [year, monthEntries] as [number, [number, CrmRecord[]][]];
  });
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

  // 통계
  const successCount = useMemo(
    () => performanceRecords.filter(isSuccessRecord).length,
    [performanceRecords]
  );
  const failCount = useMemo(
    () => performanceRecords.filter(isFailRecord).length,
    [performanceRecords]
  );
  const successRate = performanceRecords.length > 0
    ? Math.round((successCount / performanceRecords.length) * 100)
    : 0;

  // 그룹핑
  const grouped = useMemo(() => groupByYearMonth(filteredRecords), [filteredRecords]);

  return (
    <div className="flex flex-col">
      {/* 검색 + 필터 */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2">
        <input
          type="text"
          placeholder="주소, 고객명 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
        />
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
        >
          <option value="전체">담당자 전체</option>
          <option value="이창엽">이창엽</option>
          <option value="박민우">박민우</option>
        </select>
      </div>

      {/* 통계 요약 */}
      <div className="flex gap-4 bg-gray-50 px-4 py-2 text-xs text-gray-600">
        <span>전체 <strong className="text-gray-800">{performanceRecords.length}</strong>건</span>
        <span>성공 <strong className="text-blue-700">{successCount}</strong>건</span>
        <span>실패 <strong className="text-red-600">{failCount}</strong>건</span>
        <span>성공률 <strong className="text-gray-800">{successRate}%</strong></span>
      </div>

      {/* 갤러리 */}
      <div className="overflow-y-auto">
        {filteredRecords.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">실적 데이터가 없습니다</p>
        ) : (
          grouped.map(([year, monthEntries]) => (
            <div key={year}>
              {/* 연도 헤더 */}
              <div className="sticky top-0 z-10 bg-gray-100 px-4 py-2 text-lg font-bold text-gray-700">
                {year}년
              </div>

              {monthEntries.map(([month, monthRecords]) => (
                <div key={month}>
                  {/* 월 헤더 */}
                  <div className="sticky top-10 z-[9] bg-gray-50 px-4 py-1.5 text-sm font-semibold text-gray-600">
                    {month}월
                  </div>

                  {/* 카드 그리드 */}
                  <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-2 sm:grid-cols-3">
                    {monthRecords.map((record) => (
                      <PerformanceCard
                        key={record.id}
                        record={record}
                        isSuccess={isSuccessRecord(record)}
                        onClick={() => onCardClick(record)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
