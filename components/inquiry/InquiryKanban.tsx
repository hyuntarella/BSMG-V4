'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import type { Inquiry, InquiryUpdate, PipelineStage } from '@/lib/supabase/inquiry-types';
import { PIPELINE_STAGES } from '@/lib/supabase/inquiry-types';
import InquiryCard from './InquiryCard';
import InquiryDetail from './InquiryDetail';
import InquiryCreateModal from './InquiryCreateModal';

// ── InquiryKanban ──

interface UndoInfo {
  inquiryId: string;
  address: string;
  prevStage: PipelineStage;
  newStage: PipelineStage;
  timer: ReturnType<typeof setTimeout>;
}

interface InquiryKanbanProps {
  initialInquiries: Inquiry[];
}

export default function InquiryKanban({ initialInquiries }: InquiryKanbanProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState('전체');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [undoInfo, setUndoInfo] = useState<UndoInfo | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 필터링 ──
  const filtered = useMemo(() => {
    let result = inquiries;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (inq) =>
          inq.address.toLowerCase().includes(q) ||
          (inq.client_name?.toLowerCase().includes(q) ?? false) ||
          (inq.phone?.includes(q) ?? false)
      );
    }
    if (managerFilter !== '전체') {
      result = result.filter((inq) => inq.manager === managerFilter);
    }
    return result;
  }, [inquiries, searchQuery, managerFilter]);

  // ── 파이프라인별 그룹 ──
  const stageGroups = useMemo(() => {
    const groups: Record<PipelineStage, Inquiry[]> = {} as Record<PipelineStage, Inquiry[]>;
    for (const stage of PIPELINE_STAGES) {
      groups[stage] = [];
    }
    for (const inq of filtered) {
      if (groups[inq.pipeline_stage]) {
        groups[inq.pipeline_stage].push(inq);
      }
    }
    return groups;
  }, [filtered]);

  // ── Drag & Drop ──
  const handleDragOver = useCallback((e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    setDragOverStage(null);

    const inquiryId = e.dataTransfer.getData('text/plain');
    if (!inquiryId) return;

    const inquiry = inquiries.find((i) => i.id === inquiryId);
    if (!inquiry || inquiry.pipeline_stage === targetStage) return;

    const prevStage = inquiry.pipeline_stage;

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    // 낙관적 업데이트
    setInquiries((prev) =>
      prev.map((i) => (i.id === inquiryId ? { ...i, pipeline_stage: targetStage } : i))
    );

    // API
    await fetch(`/api/inquiries/${inquiryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: targetStage }),
    });

    // Undo 토스트
    const timer = setTimeout(() => setUndoInfo(null), 5000);
    undoTimerRef.current = timer;
    setUndoInfo({ inquiryId, address: inquiry.address, prevStage, newStage: targetStage, timer });
  }, [inquiries]);

  const handleUndo = useCallback(async () => {
    if (!undoInfo) return;
    clearTimeout(undoInfo.timer);
    setUndoInfo(null);

    setInquiries((prev) =>
      prev.map((i) => (i.id === undoInfo.inquiryId ? { ...i, pipeline_stage: undoInfo.prevStage } : i))
    );

    await fetch(`/api/inquiries/${undoInfo.inquiryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: undoInfo.prevStage }),
    });
  }, [undoInfo]);

  const handleUpdate = useCallback((id: string, partial: InquiryUpdate) => {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, ...partial } : i)));
    setSelectedInquiry((prev) => (prev && prev.id === id ? { ...prev, ...partial } as Inquiry : prev));
  }, []);

  const handleCreate = useCallback((inquiry: Inquiry) => {
    setInquiries((prev) => [inquiry, ...prev]);
  }, []);

  const toggleCollapse = useCallback((stage: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col" data-testid="inquiry-kanban">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-3 shadow-card">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="주소, 고객명, 연락처 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-ink-faint/30 bg-surface-muted pl-9 pr-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-white transition-colors"
          />
        </div>
        <select
          data-testid="manager-filter"
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="rounded-xl border border-ink-faint/30 bg-surface-muted px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
          aria-label="담당자 필터"
        >
          <option value="전체">담당자 전체</option>
          <option value="이창엽">이창엽</option>
          <option value="박민우">박민우</option>
        </select>
        <span className="text-xs text-ink-muted">
          총 {filtered.length}건
        </span>
      </div>

      {/* 칸반 보드 */}
      <div className="flex gap-3 overflow-x-auto p-4">
        {PIPELINE_STAGES.map((stage) => {
          const cards = stageGroups[stage] ?? [];
          const isDragOver = dragOverStage === stage;
          const isCollapsed = collapsedColumns.has(stage);

          const totalAmount = cards.reduce((sum, i) => sum + (i.estimate_amount ?? 0), 0);
          const totalAmountStr = totalAmount > 0 ? `${Math.round(totalAmount / 10000).toLocaleString()}만` : null;

          return (
            <div
              key={stage}
              data-testid="inquiry-kanban-column"
              className={`flex flex-shrink-0 flex-col rounded-xl transition-all ${
                isCollapsed ? 'min-w-[48px] max-w-[48px]' : 'min-w-[280px] max-w-[320px]'
              } ${isDragOver ? 'border-2 border-dashed border-brand-200 bg-brand-50' : 'bg-surface-muted'}`}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* 컬럼 헤더 */}
              {isCollapsed ? (
                <button
                  data-testid="column-expand"
                  onClick={() => toggleCollapse(stage)}
                  className="flex flex-col items-center gap-2 px-2 py-3"
                  aria-label={`${stage} 펼치기`}
                >
                  <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-[10px] font-bold text-ink [writing-mode:vertical-lr]">{stage}</span>
                  <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">{cards.length}</span>
                </button>
              ) : (
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      data-testid="column-collapse"
                      onClick={() => toggleCollapse(stage)}
                      className="text-ink-muted hover:text-ink transition-colors"
                      aria-label={`${stage} 접기`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs font-bold text-ink tracking-wide">{stage}</span>
                    {totalAmountStr && (
                      <span className="text-[10px] text-ink-muted font-medium tabular-nums">{totalAmountStr}</span>
                    )}
                  </div>
                  <span className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${
                    cards.length > 0 ? 'bg-brand/10 text-brand' : 'bg-ink-faint/30 text-ink-muted'
                  }`}>
                    {cards.length}
                  </span>
                </div>
              )}

              {/* 카드 목록 */}
              {!isCollapsed && (
                <div className="flex max-h-[calc(100vh-200px)] flex-col gap-2 overflow-y-auto px-2 pb-3">
                  {cards.length === 0 ? (
                    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-ink-faint/40 py-8 text-center">
                      <svg className="h-8 w-8 text-ink-faint mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-xs text-ink-muted">카드를 여기로 드래그</p>
                    </div>
                  ) : (
                    cards.map((inq) => (
                      <InquiryCard
                        key={inq.id}
                        inquiry={inq}
                        onClick={() => setSelectedInquiry(inq)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setCreateModalOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand shadow-elevated transition-all hover:scale-110 hover:bg-brand-dark active:scale-95"
        aria-label="새 문의 등록"
      >
        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Undo 토스트 */}
      {undoInfo && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-brand-900 px-5 py-3.5 text-white shadow-elevated">
          <span className="text-sm">
            <span className="font-semibold">{undoInfo.address}</span>
            {' → '}
            <span className="font-semibold">{undoInfo.newStage}</span>
          </span>
          <button onClick={handleUndo} className="rounded-lg bg-white/20 px-3.5 py-1.5 text-xs font-semibold hover:bg-white/30 transition-colors">
            되돌리기
          </button>
        </div>
      )}

      {/* 상세 패널 */}
      <InquiryDetail
        inquiry={selectedInquiry}
        isOpen={!!selectedInquiry}
        onClose={() => setSelectedInquiry(null)}
        onUpdate={handleUpdate}
      />

      {/* 생성 모달 */}
      <InquiryCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
