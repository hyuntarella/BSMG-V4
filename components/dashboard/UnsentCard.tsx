'use client'

import { useEffect, useState } from 'react'
import type { UnsentRecord } from '@/app/api/dashboard/unsent/route'
import { getDismissed, addDismissed } from '@/lib/utils/dismissed'

const DISMISSED_KEY = 'dismissed_unsent'
const DEFAULT_VISIBLE = 3

export default function UnsentCard() {
  const [records, setRecords] = useState<UnsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const dismissed = getDismissed(DISMISSED_KEY)

    fetch('/api/dashboard/unsent')
      .then((res) => {
        if (!res.ok) throw new Error('미발송 조회 실패')
        return res.json() as Promise<{ records: UnsentRecord[] }>
      })
      .then(({ records: data }) => {
        setRecords(data.filter((r) => !dismissed.includes(r.id)))
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '미발송 조회 실패'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = (id: string) => {
    addDismissed(DISMISSED_KEY, id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const visible = expanded ? records : records.slice(0, DEFAULT_VISIBLE)
  const hasMore = records.length > DEFAULT_VISIBLE

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">미발송</h2>
        <p className="text-sm text-ink-muted">불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">미발송</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">미발송</h2>
        <p className="rounded-lg border border-dashed border-ink-faint py-6 text-center text-sm text-ink-muted">
          미발송 건이 없습니다
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-ink">
        미발송{' '}
        <span className="ml-1 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-normal text-red-600">
          {records.length}건
        </span>
      </h2>

      <div className="space-y-2">
        {visible.map((record) => (
          <UnsentItem key={record.id} record={record} onDismiss={handleDismiss} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-lg border border-dashed border-ink-faint py-2 text-xs text-ink-secondary hover:border-ink-muted hover:text-ink transition-colors"
        >
          {expanded ? '접기' : `더보기 (${records.length - DEFAULT_VISIBLE}건 더)`}
        </button>
      )}
    </div>
  )
}

// ── Sub-component ──

interface UnsentItemProps {
  record: UnsentRecord
  onDismiss: (id: string) => void
}

function UnsentItem({ record, onDismiss }: UnsentItemProps) {
  return (
    <div className="rounded-lg border-l-4 border-l-red-300 bg-surface-muted p-3 transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-ink truncate">{record.address}</p>
          {record.name && (
            <p className="text-xs text-ink-secondary truncate">{record.name}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
              -{record.daysSince}일
            </span>
            {record.manager && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                {record.manager}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(record.id)}
          className="shrink-0 text-xl leading-none text-ink-faint hover:text-ink-secondary"
          aria-label="숨기기"
          title="숨기기"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
