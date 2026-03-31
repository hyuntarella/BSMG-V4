'use client';

import type { CrmRecord } from '@/lib/notion/types';
import { STAGE_MAP } from '@/lib/notion/types';
import KanbanCard from './KanbanCard';

// ── KanbanBoard ──

const STAGE_TABS = ['0.문의', '1.영업', '1-1.장기', '2.시공', '3.하자'];

const STAGE_LABELS: Record<string, string> = {
  '0.문의': '문의',
  '1.영업': '영업',
  '1-1.장기': '장기',
  '2.시공': '시공',
  '3.하자': '하자',
};

interface KanbanBoardProps {
  records: CrmRecord[];
  activeStage: string;
  onStageChange: (stage: string) => void;
  onCardClick: (record: CrmRecord) => void;
}

export default function KanbanBoard({
  records,
  activeStage,
  onStageChange,
  onCardClick,
}: KanbanBoardProps) {
  const pipelines = STAGE_MAP[activeStage] ?? [];

  return (
    <div className="flex flex-col">
      {/* 탭 바 */}
      <div className="overflow-x-auto border-b bg-white">
        <div className="flex min-w-max px-2 pt-2">
          {STAGE_TABS.map((stage) => {
            const isActive = stage === activeStage;
            const stageCount = records.filter(
              (r) => {
                // count records matching this stage via pipeline
                const pipesForStage = STAGE_MAP[stage] ?? [];
                return pipesForStage.includes(r.pipeline ?? '');
              }
            ).length;

            return (
              <button
                key={stage}
                onClick={() => onStageChange(stage)}
                className={`flex items-center gap-1.5 rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-brand bg-brand text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {STAGE_LABELS[stage]}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {stageCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 파이프라인 컬럼들 */}
      <div className="flex gap-3 overflow-x-auto p-3">
        {pipelines.map((pipeline) => {
          const pipelineCards = records.filter((r) => r.pipeline === pipeline);

          return (
            <div
              key={pipeline}
              className="flex min-w-[260px] max-w-[300px] flex-shrink-0 flex-col rounded-lg bg-gray-50"
            >
              {/* 컬럼 헤더 */}
              <div className="flex items-center justify-between rounded-t-lg border-b bg-white px-3 py-2">
                <span className="text-xs font-semibold text-gray-700">{pipeline}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {pipelineCards.length}
                </span>
              </div>

              {/* 카드 목록 */}
              <div className="flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto p-2">
                {pipelineCards.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">레코드 없음</p>
                ) : (
                  pipelineCards.map((record) => (
                    <KanbanCard
                      key={record.id}
                      record={record}
                      onClick={() => onCardClick(record)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
