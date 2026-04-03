'use client';

import { useEffect, useState } from 'react';
import type { CrmRecord } from '@/lib/supabase/crm-types';
import DetailField from '@/components/crm/DetailField';
import ActionButtons from '@/components/crm/ActionButtons';

interface CrmSidePanelProps {
  crmId: string | null;
  onClose: () => void;
}

export default function CrmSidePanel({ crmId, onClose }: CrmSidePanelProps) {
  const [record, setRecord] = useState<CrmRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!crmId) { setRecord(null); return; }
    setLoading(true);
    fetch(`/api/crm/${crmId}`)
      .then((r) => r.json())
      .then((data) => setRecord(data?.id ? data : null))
      .catch(() => setRecord(null))
      .finally(() => setLoading(false));
  }, [crmId]);

  // ESC로 닫기
  useEffect(() => {
    if (!crmId) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [crmId, onClose]);

  if (!crmId) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="crm-detail-panel">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 패널 */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <h2 className="truncate text-base font-semibold text-ink">
            {loading ? '불러오는 중...' : (record?.address ?? '고객 상세')}
          </h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="p-6 text-center text-sm text-ink-muted">불러오는 중...</div>
        )}

        {!loading && !record && (
          <div className="p-6 text-center text-sm text-ink-muted">고객 정보를 찾을 수 없습니다</div>
        )}

        {!loading && record && (
          <div className="flex flex-col gap-4 px-4 py-4">
            {/* 액션 버튼 */}
            <ActionButtons record={record} />

            {/* 기본정보 */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">기본정보</h3>
              <div className="grid grid-cols-2 gap-2">
                <DetailField label="주소" value={record.address} type="text" onSave={() => {}} />
                <DetailField label="고객명" value={record.customerName} type="text" onSave={() => {}} />
                <DetailField label="전화번호" value={record.phone} type="phone" onSave={() => {}} />
                <DetailField label="메모" value={record.memo} type="text" onSave={() => {}} />
              </div>
            </section>

            {/* 영업정보 */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">영업정보</h3>
              <div className="grid grid-cols-2 gap-2">
                <DetailField label="담당자" value={record.manager} type="text" onSave={() => {}} />
                <DetailField label="파이프라인" value={record.pipeline} type="text" onSave={() => {}} />
                <DetailField label="견적금액" value={record.estimateAmount?.toString() ?? null} type="number" onSave={() => {}} />
              </div>
            </section>

            {/* 링크 */}
            {(record.driveUrl || record.estimateWebUrl) && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">링크</h3>
                <div className="flex gap-2">
                  {record.estimateWebUrl && (
                    <a href={record.estimateWebUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">견적서 보기</a>
                  )}
                  {record.driveUrl && (
                    <a href={record.driveUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">Google Drive</a>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
