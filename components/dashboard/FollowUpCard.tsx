'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SentEstimate {
  id: string
  customer_name: string
  email_sent_at: string
  daysSinceSent: number
}

interface FollowUpCardProps {
  estimates: SentEstimate[]
}

const MILESTONES = [3, 7, 14, 31]

export default function FollowUpCard({ estimates }: FollowUpCardProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const dismiss = (id: string) => {
    setDismissed(prev => { const next = new Set(Array.from(prev)); next.add(id); return next })
  }

  // 마일스톤별 그룹핑
  const groups = MILESTONES.map(days => ({
    days,
    label: `${days}일 경과`,
    items: estimates.filter(e =>
      !dismissed.has(`${e.id}-${days}`) && e.daysSinceSent >= days
    ),
  })).filter(g => g.items.length > 0)

  if (groups.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">후속 관리</h3>
        <p className="rounded-lg border border-dashed border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
          후속 관리 대상이 없습니다
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">후속 관리</h3>
      <div className="space-y-3">
        {groups.map(group => (
          <div key={group.days}>
            <p className="mb-1 text-xs font-medium text-amber-600">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(est => (
                <div key={`${est.id}-${group.days}`} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <Link href={`/estimate/${est.id}`} className="text-sm font-semibold text-gray-800 hover:underline">
                    {est.customer_name || '(고객명 없음)'}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600">{est.daysSinceSent}일</span>
                    <button
                      onClick={() => dismiss(`${est.id}-${group.days}`)}
                      className="text-gray-300 hover:text-gray-500 text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
