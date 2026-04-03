'use client'

import { useEffect, useState } from 'react'
import { getDismissed, addDismissed } from '@/lib/utils/dismissed'
import { fm } from '@/lib/utils/format'

// ── Types ──

interface FollowUpRecord {
  id: string
  address: string
  customerName: string | null
  daysSince: number
  estimateAmount: number | null
  manager: string | null
}

const DISMISSED_KEY = 'dismissed_followup'
const DEFAULT_VISIBLE = 3

// ── Component ──

interface FollowUpCardProps {
  onCrmOpen?: (id: string) => void
}

export default function FollowUpCard({ onCrmOpen }: FollowUpCardProps = {}) {
  const [records, setRecords] = useState<FollowUpRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setDismissed(getDismissed(DISMISSED_KEY))

    fetch('/api/dashboard/follow-up')
      .then((res) => {
        if (!res.ok) throw new Error('연락해야 할 곳 조회 실패')
        return res.json() as Promise<{ records: FollowUpRecord[] }>
      })
      .then((data) => setRecords(data.records))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '연락해야 할 곳 조회 실패'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = (id: string) => {
    addDismissed(DISMISSED_KEY, id)
    setDismissed((prev) => [...prev, id])
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const visible = records.filter((r) => !dismissed.includes(r.id))
  const shown = expanded ? visible : visible.slice(0, DEFAULT_VISIBLE)
  const hasMore = visible.length > DEFAULT_VISIBLE

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">연락해야 할 곳</h2>
        <p className="text-sm text-ink-muted">불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">연락해야 할 곳</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">연락해야 할 곳</h2>
        <div className="flex flex-col items-center rounded-lg border border-dashed border-ink-faint py-8 text-center">
          <svg className="h-8 w-8 text-emerald-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-ink-secondary">모두 연락 완료</p>
          <p className="text-xs text-ink-muted mt-0.5">팔로업 대상이 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-ink">
        연락해야 할 곳{' '}
        <span className="ml-1 text-sm font-normal text-ink-secondary">({visible.length}건)</span>
      </h2>

      <div className="space-y-2">
        {shown.map((record) => (
          <FollowUpItem key={record.id} record={record} onDismiss={handleDismiss} onCrmOpen={onCrmOpen} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 w-full rounded-lg border border-dashed border-ink-faint py-2 text-xs text-ink-secondary hover:border-ink-muted hover:text-ink transition-colors"
        >
          {expanded ? '접기' : `더보기 (${visible.length - DEFAULT_VISIBLE}건)`}
        </button>
      )}
    </div>
  )
}

// ── Sub-component ──

interface FollowUpItemProps {
  record: FollowUpRecord
  onDismiss: (id: string) => void
  onCrmOpen?: (id: string) => void
}

function FollowUpItem({ record, onDismiss, onCrmOpen }: FollowUpItemProps) {
  const isUrgent = record.daysSince >= 7

  return (
    <div
      data-testid="dashboard-crm-item"
      onClick={() => onCrmOpen?.(record.id)}
      className={`cursor-pointer rounded-lg border-l-4 bg-surface-muted p-3 transition-shadow hover:shadow-card ${
      isUrgent ? 'border-l-red-400' : 'border-l-accent-200'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {/* 주소 */}
          <p className="text-sm font-medium text-ink truncate">{record.address || '(주소 없음)'}</p>

          <div className="flex flex-wrap items-center gap-2">
            {/* 경과일수 칩 */}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isUrgent
                  ? 'bg-red-100 text-red-600'
                  : 'bg-accent-100 text-accent-dark'
              }`}
            >
              -{record.daysSince}일
            </span>

            {/* 견적금액 */}
            {record.estimateAmount != null && (
              <span className="text-xs font-semibold text-ink">
                {fm(record.estimateAmount)}원
              </span>
            )}

            {/* 담당자 칩 */}
            {record.manager && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                {record.manager}
              </span>
            )}
          </div>
        </div>

        {/* x 버튼 */}
        <button
          onClick={() => onDismiss(record.id)}
          className="shrink-0 text-ink-faint hover:text-ink-secondary text-xl leading-none"
          aria-label="숨기기"
          title="숨기기"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
