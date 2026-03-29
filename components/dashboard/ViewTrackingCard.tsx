'use client'

import { useState } from 'react'

interface ViewedEstimate {
  id: string
  customer_name: string
  email_viewed_at: string
  dismissed?: boolean
}

interface ViewTrackingCardProps {
  estimates: ViewedEstimate[]
}

export default function ViewTrackingCard({ estimates }: ViewTrackingCardProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = estimates.filter(e => !dismissed.has(e.id))

  const dismiss = (id: string) => {
    setDismissed(prev => { const next = new Set(Array.from(prev)); next.add(id); return next })
  }

  if (visible.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">견적서 열람 고객</h3>
        <p className="rounded-lg border border-dashed border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
          열람한 고객이 없습니다
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">견적서 열람 고객</h3>
      <div className="space-y-1.5">
        {visible.map(est => (
          <div key={est.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-gray-800">{est.customer_name || '(고객명 없음)'}</p>
              <p className="text-xs text-green-600">{formatViewedTime(est.email_viewed_at)} 열람</p>
            </div>
            <button
              onClick={() => dismiss(est.id)}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatViewedTime(iso: string): string {
  const viewed = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - viewed.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    return `${Math.floor(diffHours)}시간 전`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}일 전`
}
