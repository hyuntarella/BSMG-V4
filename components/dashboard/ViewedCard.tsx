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
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">견적서 열람 고객</h3>
        <p className="text-xs text-gray-400">불러오는 중...</p>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">견적서 열람 고객</h3>
        <p className="rounded-lg border border-dashed border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
          열람 기록이 없습니다
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        견적서 열람 고객{' '}
        <span className="ml-1 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
          {records.length}
        </span>
      </h3>

      <div className="space-y-1.5">
        {records.map((record) => (
          <div key={record.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <Link
              href={`/estimate/${record.id}`}
              className="min-w-0 flex-1"
            >
              <p className="truncate font-medium text-gray-800">
                {record.customerName || record.siteName || '(고객명 없음)'}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs ${
                    isWithin24h(record.viewedAt) ? 'text-orange-600' : 'text-gray-500'
                  }`}
                >
                  {formatRelativeTime(record.viewedAt)} 열람
                </span>
                {record.totalAmount > 0 && (
                  <span className="text-xs text-brand">
                    {fm(record.totalAmount)}원
                  </span>
                )}
              </div>
            </Link>

            <button
              onClick={() => handleDismiss(record.id)}
              className="ml-2 shrink-0 text-lg leading-none text-gray-300 hover:text-gray-500"
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
