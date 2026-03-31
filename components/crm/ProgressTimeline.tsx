import type { CrmRecord } from '@/lib/notion/types';

// ── ProgressTimeline ──

interface TimelineStep {
  label: string;
  date: string | null;
}

interface ProgressTimelineProps {
  record: CrmRecord;
}

export default function ProgressTimeline({ record }: ProgressTimelineProps) {
  const steps: TimelineStep[] = [
    { label: '문의일자', date: record.inquiryDate },
    { label: '견적방문일자', date: record.visitDate },
    { label: '견적서발송일', date: record.estimateSentDate },
    { label: '견적서열람일', date: record.estimateViewedDate },
    { label: '잔금완료', date: record.balanceCompleteDate },
  ];

  // ── Find last completed step index ──
  let lastCompletedIdx = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].date) lastCompletedIdx = i;
  }

  return (
    <div className="flex flex-col">
      {steps.map((step, idx) => {
        const done = !!step.date;
        const lineComplete = idx < lastCompletedIdx;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.label} className="flex gap-3">
            {/* 원 + 선 */}
            <div className="flex flex-col items-center">
              <div
                className={`z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? 'border-brand bg-brand'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {done && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 ${
                    lineComplete ? 'bg-brand' : 'border-l-2 border-dashed border-gray-200 bg-transparent'
                  }`}
                  style={{ minHeight: '24px' }}
                />
              )}
            </div>

            {/* 내용 */}
            <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
              <span className={`text-xs font-medium ${done ? 'text-gray-800' : 'text-gray-400'}`}>
                {step.label}
              </span>
              {done ? (
                <p className="text-xs text-brand">{step.date}</p>
              ) : (
                <p className="text-xs text-gray-300">미완료</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
