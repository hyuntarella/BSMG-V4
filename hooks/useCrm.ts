'use client';

import { useState, useMemo, useCallback } from 'react';
import type { CrmRecord } from '@/lib/notion/types';
import { PIPELINE_TO_STAGE } from '@/lib/notion/types';

// ── useCrm ──

interface UseCrmOptions {
  initialRecords?: CrmRecord[];
}

export function useCrm({ initialRecords = [] }: UseCrmOptions = {}) {
  const [records, setRecords] = useState<CrmRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string>('0.문의');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [managerFilter, setManagerFilter] = useState<string>('전체');

  // ── 레코드 fetch ──
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm');
      if (!res.ok) {
        throw new Error(`CRM 데이터 로드 실패: ${res.status}`);
      }
      const data = (await res.json()) as CrmRecord[];
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CRM 데이터 로드 중 오류 발생');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 로컬 낙관적 업데이트 ──
  const updateRecordLocal = useCallback((id: string, partial: Partial<CrmRecord>) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...partial } : r))
    );
  }, []);

  // ── API + 로컬 업데이트 (낙관적, 에러 시 롤백) ──
  const updateRecord = useCallback(async (id: string, partial: Partial<CrmRecord>) => {
    // 현재 값 저장 (롤백용)
    const prev = records.find((r) => r.id === id);
    if (!prev) return;

    // 낙관적 업데이트
    updateRecordLocal(id, partial);

    try {
      const res = await fetch(`/api/crm/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        throw new Error(`업데이트 실패: ${res.status}`);
      }
    } catch (err) {
      // 롤백
      console.error('updateRecord failed, rolling back:', err);
      updateRecordLocal(id, {
        pipeline: prev.pipeline,
        stage: prev.stage,
        contractStatus: prev.contractStatus,
      });
    }
  }, [records, updateRecordLocal]);

  // ── 레코드 추가 (생성 후 로컬 추가) ──
  const addRecordLocal = useCallback((record: CrmRecord) => {
    setRecords((prev) => [record, ...prev]);
  }, []);

  // ── 필터링된 레코드 ──
  const filteredRecords = useMemo(() => {
    // 실적 탭: 전체 레코드 반환 (PerformanceTab 내부에서 필터링)
    if (activeStage === '실적') {
      return records;
    }

    let result = records.filter(
      (r) => PIPELINE_TO_STAGE[r.pipeline ?? ''] === activeStage
    );

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.address.toLowerCase().includes(q) ||
          (r.customerName?.toLowerCase().includes(q) ?? false) ||
          (r.phone?.includes(q) ?? false)
      );
    }

    if (managerFilter !== '전체') {
      result = result.filter((r) => r.manager === managerFilter);
    }

    return result;
  }, [records, activeStage, searchQuery, managerFilter]);

  return {
    records,
    filteredRecords,
    loading,
    error,
    activeStage,
    searchQuery,
    managerFilter,
    fetchRecords,
    updateRecordLocal,
    updateRecord,
    addRecordLocal,
    setActiveStage,
    setSearchQuery,
    setManagerFilter,
  };
}
