'use client';

import { useCrm } from '@/hooks/useCrm';
import type { CrmRecord } from '@/lib/notion/types';
import KanbanBoard from './KanbanBoard';

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
    loading,
    error,
  } = useCrm({ initialRecords });

  const handleCardClick = (_record: CrmRecord) => {
    // 추후: 카드 상세 모달 또는 페이지 이동
  };

  return (
    <div className="flex flex-col">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2">
        <input
          type="text"
          placeholder="주소, 고객명, 전화번호 검색..."
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
        {loading && <span className="text-xs text-gray-400">로딩 중...</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      {/* 칸반보드 */}
      <KanbanBoard
        records={filteredRecords}
        activeStage={activeStage}
        onStageChange={setActiveStage}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
