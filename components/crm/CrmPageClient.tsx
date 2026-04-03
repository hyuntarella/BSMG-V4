'use client';

import { useState } from 'react';
import { useCrm } from '@/hooks/useCrm';
import type { CrmRecord } from '@/lib/supabase/crm-types';
import { PIPELINE_TO_STAGE } from '@/lib/supabase/crm-types';
import KanbanBoard from './KanbanBoard';
import DetailModal from './DetailModal';

// ── CrmPageClient ──

interface CrmPageClientProps {
  initialRecords: CrmRecord[];
}

export default function CrmPageClient({ initialRecords }: CrmPageClientProps) {
  const {
    filteredRecords,
    activeStage,
    searchQuery,
    managerFilter,
    setActiveStage,
    setSearchQuery,
    setManagerFilter,
    updateRecordLocal,
    addRecordLocal,
    loading,
    error,
  } = useCrm({ initialRecords });

  const [selectedRecord, setSelectedRecord] = useState<CrmRecord | null>(null);

  const handleCardClick = (record: CrmRecord) => {
    setSelectedRecord(record);
  };

  const handleUpdate = (id: string, partial: Partial<CrmRecord>) => {
    updateRecordLocal(id, partial);
    // Keep modal in sync with updated data
    setSelectedRecord((prev) => (prev && prev.id === id ? { ...prev, ...partial } : prev));
  };

  const handleRecordCreate = (record: CrmRecord) => {
    addRecordLocal(record);
  };

  const handlePipelineChange = (id: string, pipeline: string, stage: string) => {
    const newStage = stage || PIPELINE_TO_STAGE[pipeline] || null;
    updateRecordLocal(id, { pipeline, stage: newStage });
    // Keep modal in sync if open
    setSelectedRecord((prev) =>
      prev && prev.id === id ? { ...prev, pipeline, stage: newStage } : prev
    );
  };

  return (
    <div className="flex flex-col">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-3 shadow-card">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="주소, 고객명, 전화번호 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-ink-faint/30 bg-surface-muted pl-9 pr-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-white transition-colors"
          />
        </div>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="rounded-xl border border-ink-faint/30 bg-surface-muted px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
        >
          <option value="전체">담당자 전체</option>
          <option value="이창엽">이창엽</option>
          <option value="박민우">박민우</option>
        </select>
        {loading && <span className="text-xs text-ink-muted">로딩 중...</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      {/* 칸반보드 */}
      <KanbanBoard
        records={filteredRecords}
        activeStage={activeStage}
        onStageChange={setActiveStage}
        onCardClick={handleCardClick}
        onRecordCreate={handleRecordCreate}
        onPipelineChange={handlePipelineChange}
      />

      {/* 상세 모달 */}
      <DetailModal
        record={selectedRecord}
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
