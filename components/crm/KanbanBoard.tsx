'use client';

import { useState, useRef } from 'react';
import type { CrmRecord } from '@/lib/notion/types';
import { STAGE_MAP, PIPELINE_TO_STAGE } from '@/lib/notion/types';
import KanbanCard from './KanbanCard';
import PerformanceTab from './PerformanceTab';
import CreateRecordModal from './CreateRecordModal';

// ── KanbanBoard ──

const STAGE_TABS = ['0.문의', '1.영업', '1-1.장기', '2.시공', '3.하자', '실적'];

const STAGE_LABELS: Record<string, string> = {
  '0.문의': '문의',
  '1.영업': '영업',
  '1-1.장기': '장기',
  '2.시공': '시공',
  '3.하자': '하자',
  '실적': '실적',
};

interface UndoInfo {
  recordId: string;
  address: string;
  prevPipeline: string | null;
  prevStage: string | null;
  newPipeline: string;
  timer: ReturnType<typeof setTimeout>;
}

interface KanbanBoardProps {
  records: CrmRecord[];
  activeStage: string;
  onStageChange: (stage: string) => void;
  onCardClick: (record: CrmRecord) => void;
  onRecordCreate?: (record: CrmRecord) => void;
  onPipelineChange?: (id: string, pipeline: string, stage: string) => void;
}

export default function KanbanBoard({
  records,
  activeStage,
  onStageChange,
  onCardClick,
  onRecordCreate,
  onPipelineChange,
}: KanbanBoardProps) {
  const pipelines = STAGE_MAP[activeStage] ?? [];
  const isPerformanceTab = activeStage === '실적';

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [dragOverPipeline, setDragOverPipeline] = useState<string | null>(null);
  const [undoInfo, setUndoInfo] = useState<UndoInfo | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Drag & Drop ──
  const handleDragOver = (e: React.DragEvent, pipeline: string) => {
    e.preventDefault();
    setDragOverPipeline(pipeline);
  };

  const handleDragLeave = () => {
    setDragOverPipeline(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPipeline: string) => {
    e.preventDefault();
    setDragOverPipeline(null);

    const recordId = e.dataTransfer.getData('text/plain');
    if (!recordId) return;

    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    // 같은 파이프라인이면 무시
    if (record.pipeline === targetPipeline) return;

    const prevPipeline = record.pipeline;
    const prevStage = record.stage;
    const newStage = PIPELINE_TO_STAGE[targetPipeline] ?? prevStage ?? null;

    // 이전 Undo 타이머 클리어
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    // 낙관적 UI 업데이트
    onPipelineChange?.(recordId, targetPipeline, newStage ?? '');

    // API 호출
    await fetch(`/api/crm/${recordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline: targetPipeline, stage: newStage }),
    });

    // Undo 토스트 설정
    const timer = setTimeout(() => {
      setUndoInfo(null);
    }, 5000);

    undoTimerRef.current = timer;
    setUndoInfo({
      recordId,
      address: record.address,
      prevPipeline,
      prevStage,
      newPipeline: targetPipeline,
      timer,
    });
  };

  const handleUndo = async () => {
    if (!undoInfo) return;

    const { recordId, prevPipeline, prevStage } = undoInfo;

    // 타이머 클리어
    clearTimeout(undoInfo.timer);
    setUndoInfo(null);

    // 낙관적 롤백
    onPipelineChange?.(recordId, prevPipeline ?? '', prevStage ?? '');

    // API 호출
    await fetch(`/api/crm/${recordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline: prevPipeline, stage: prevStage }),
    });
  };

  const handleCreateRecord = (record: CrmRecord) => {
    onRecordCreate?.(record);
  };

  return (
    <div className="relative flex flex-col">
      {/* 탭 바 */}
      <div className="overflow-x-auto border-b bg-white">
        <div className="flex min-w-max px-2 pt-2">
          {STAGE_TABS.map((stage) => {
            const isActive = stage === activeStage;
            const stageCount =
              stage === '실적'
                ? records.filter(
                    (r) =>
                      r.contractStatus === '계약성공' ||
                      r.pipeline === '잔금완료' ||
                      r.contractStatus === '계약실패' ||
                      r.pipeline === '재연락금지'
                  ).length
                : records.filter((r) => {
                    const pipesForStage = STAGE_MAP[stage] ?? [];
                    return pipesForStage.includes(r.pipeline ?? '');
                  }).length;

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
                  className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : stageCount > 0
                        ? 'bg-brand/10 text-brand'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {stageCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 실적 탭 */}
      {isPerformanceTab && (
        <PerformanceTab records={records} onCardClick={onCardClick} />
      )}

      {/* 파이프라인 컬럼들 */}
      {!isPerformanceTab && (
        <div className="flex gap-3 overflow-x-auto p-3">
          {pipelines.map((pipeline) => {
            const pipelineCards = records.filter((r) => r.pipeline === pipeline);
            const isDragOver = dragOverPipeline === pipeline;

            return (
              <div
                key={pipeline}
                className={`flex min-w-[260px] max-w-[300px] flex-shrink-0 flex-col rounded-lg transition-colors ${
                  isDragOver
                    ? 'border-2 border-dashed border-blue-200 bg-blue-50'
                    : 'bg-gray-50'
                }`}
                onDragOver={(e) => handleDragOver(e, pipeline)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, pipeline)}
              >
                {/* 컬럼 헤더 */}
                <div className="flex items-center justify-between rounded-t-lg border-b bg-white px-3 py-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {pipeline}
                    <span className={`ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                      pipelineCards.length > 0 ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {pipelineCards.length}
                    </span>
                  </span>
                </div>

                {/* 카드 목록 */}
                <div className="flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto p-2">
                  {pipelineCards.length === 0 ? (
                    <p className="rounded-md border border-dashed border-gray-300 py-6 text-center text-xs text-gray-400">레코드 없음</p>
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
      )}

      {/* FAB 버튼 */}
      <button
        onClick={() => setCreateModalOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
        aria-label="신규 레코드 생성"
      >
        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Undo 토스트 */}
      {undoInfo && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg bg-gray-800 px-4 py-3 text-white shadow-xl">
          <span className="text-sm">
            <span className="font-medium">{undoInfo.address}</span>
            {' → '}
            <span className="font-medium">{undoInfo.newPipeline}</span>
            {'으로 이동'}
          </span>
          <button
            onClick={handleUndo}
            className="rounded-md bg-white/20 px-3 py-1 text-xs font-medium hover:bg-white/30"
          >
            되돌리기
          </button>
        </div>
      )}

      {/* 생성 모달 */}
      <CreateRecordModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateRecord}
      />
    </div>
  );
}
