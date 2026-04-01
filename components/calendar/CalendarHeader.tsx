'use client';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  title?: string;        // 뷰에 따른 커스텀 타이틀 (없으면 "YYYY년 M월" 기본값)
  onDateChange: (d: Date) => void;
  onViewChange: (v: CalendarView) => void;
  onPrev?: () => void;   // 뷰 인식 이전 이동 (없으면 -1개월)
  onNext?: () => void;   // 뷰 인식 다음 이동 (없으면 +1개월)
  onToday?: () => void;  // 오늘 이동 커스텀 핸들러
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: '월간',
  week: '주간',
  day: '일간',
};

function ChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function CalendarHeader({
  currentDate,
  view,
  title,
  onDateChange,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // 기본 이동 (월 단위) — onPrev/onNext가 없을 때 fallback
  function goPrev() {
    if (onPrev) {
      onPrev();
      return;
    }
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    onDateChange(d);
  }

  function goNext() {
    if (onNext) {
      onNext();
      return;
    }
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    onDateChange(d);
  }

  function goToday() {
    if (onToday) {
      onToday();
      return;
    }
    onDateChange(new Date());
  }

  const displayTitle = title ?? `${year}년 ${month}월`;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      {/* 네비게이션 */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="p-2 rounded-lg hover:bg-surface-muted transition-colors text-ink-secondary"
          aria-label="이전"
        >
          <ChevronLeft />
        </button>

        <h2 className="text-base font-bold text-ink min-w-[140px] text-center">
          {displayTitle}
        </h2>

        <button
          onClick={goNext}
          className="p-2 rounded-lg hover:bg-surface-muted transition-colors text-ink-secondary"
          aria-label="다음"
        >
          <ChevronRight />
        </button>

        <button
          onClick={goToday}
          className="ml-2 px-3 py-1.5 text-sm border border-ink-faint rounded-lg hover:bg-surface-muted transition-colors text-ink-secondary font-medium"
        >
          오늘
        </button>
      </div>

      {/* 뷰 전환 탭 — pill 스타일 */}
      <div className="flex gap-0.5 rounded-full bg-surface-muted p-0.5">
        {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`px-3.5 py-1.5 text-sm rounded-full transition-all ${
              view === v
                ? 'bg-brand-900 text-white font-semibold shadow-card'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
