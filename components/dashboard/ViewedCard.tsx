'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDismissed, addDismissed } from '@/lib/utils/dismissed'
import { formatRelativeTime } from '@/lib/utils/relativeTime'
import { fm } from '@/lib/utils/format'
import type { ViewedRecord } from '@/app/api/dashboard/viewed/route'

const DISMISSED_KEY = 'dismissed_viewed'

export default function ViewedCard() {
  const [records, setRecords] = useState<ViewedRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dismissed = getDismissed(DISMISSED_KEY)

    fetch('/api/dashboard/viewed')
      .then((res) => {
        if (!res.ok) throw new Error('열람 고객 조회 실패')
        return res.json() as Promise<{ records: ViewedRecord[] }>
      })
      .then((data) => {
        const filtered = data.records.filter((r) => !dismissed.includes(r.id))
        setRecords(filtered)
      })
      .catch((err: unknown) => {
        console.error('열람 고객 조회 실패:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = (id: string) => {
    addDismissed(DISMISSED_KEY, id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const isWithin24h = (viewedAt: string) => {
    const diffMs = Date.now() - new Date(viewedAt).getTime()
    return diffMs < 24 * 60 * 60 * 1000
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-ink">견적서 열람 고객</h3>
        <p className="text-xs text-ink-muted">불러오는 중...</p>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-ink">견적서 열람 고객</h3>
        <div className="flex flex-col items-center rounded-lg border border-dashed border-ink-faint py-8 text-center">
          <svg className="h-8 w-8 text-ink-faint mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <p className="text-sm font-medium text-ink-secondary">아직 열람 기록 없음</p>
          <p className="text-xs text-ink-muted mt-0.5">고객이 견적서를 열면 여기 표시됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <h3 className="mb-2 text-sm font-semibold text-ink">
        견적서 열람 고객{' '}
        <span className="ml-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          {records.length}
        </span>
      </h3>

      <div className="space-y-1.5">
        {records.map((record) => (
          <div key={record.id} className="flex items-center justify-between rounded-lg border-l-4 border-l-emerald-200 bg-surface-muted px-3 py-2.5 transition-shadow hover:shadow-card">
            <Link
              href={`/estimate/${record.id}`}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-sm font-medium text-ink">
                {record.customerName || record.siteName || '(고객명 없음)'}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs ${
                    isWithin24h(record.viewedAt) ? 'font-semibold text-accent-dark' : 'text-ink-secondary'
                  }`}
                >
                  {formatRelativeTime(record.viewedAt)} 열람
                </span>
                {record.totalAmount > 0 && (
                  <span className="text-xs font-semibold text-ink">
                    {fm(record.totalAmount)}원
                  </span>
                )}
              </div>
            </Link>

            <button
              onClick={() => handleDismiss(record.id)}
              className="ml-2 shrink-0 text-lg leading-none text-ink-faint hover:text-ink-secondary"
              aria-label="숨기기"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
