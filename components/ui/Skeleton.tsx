'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      data-testid="skeleton"
      className={`animate-pulse rounded-lg bg-ink-faint/40 ${className}`}
    />
  );
}

// ── 대시보드 스켈레톤 ──
export function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-skeleton" className="mx-auto max-w-5xl px-4 py-6 space-y-5">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-32" />
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      {/* Cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── CRM 스켈레톤 ──
export function CrmSkeleton() {
  return (
    <div data-testid="crm-skeleton" className="flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-2 bg-white px-4 py-3 shadow-card">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      {/* Tabs */}
      <div className="flex gap-2 border-b border-ink-faint/30 bg-white px-4 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16" />
        ))}
      </div>
      {/* Columns */}
      <div className="flex gap-3 overflow-hidden p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="min-w-[280px] flex-shrink-0 space-y-2 rounded-xl bg-surface-muted p-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 캘린더 스켈레톤 ──
export function CalendarSkeleton() {
  return (
    <div data-testid="calendar-skeleton" className="mx-auto w-full max-w-6xl px-4 py-4">
      <div className="rounded-xl bg-white p-4 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 견적서 목록 스켈레톤 ──
export function EstimateListSkeleton() {
  return (
    <div data-testid="estimate-list-skeleton" className="mx-auto max-w-5xl px-4 py-6 space-y-3">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}
