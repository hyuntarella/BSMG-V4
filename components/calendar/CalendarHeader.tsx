'use client';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (d: Date) => void;
  onViewChange: (v: CalendarView) => void;
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
  onDateChange,
  onViewChange,
}: CalendarHeaderProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  function goPrev() {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    onDateChange(d);
  }

  function goNext() {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    onDateChange(d);
  }

  function goToday() {
    onDateChange(new Date());
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      {/* 월 네비게이션 */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="이전 달"
        >
          <ChevronLeft />
        </button>

        <h2 className="text-base font-semibold text-gray-900 min-w-[100px] text-center">
          {year}년 {month}월
        </h2>

        <button
          onClick={goNext}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="다음 달"
        >
          <ChevronRight />
        </button>

        <button
          onClick={goToday}
          className="ml-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
        >
          오늘
        </button>
      </div>

      {/* 뷰 전환 탭 */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              view === v
                ? 'bg-white shadow-sm font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
