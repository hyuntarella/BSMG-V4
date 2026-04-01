'use client'

import { useEffect, useState } from 'react'

interface KpiData {
  csCount: number
  unsentCount: number
  followUpCount: number
  viewedCount: number
}

export default function DashboardKpi() {
  const [data, setData] = useState<KpiData>({ csCount: 0, unsentCount: 0, followUpCount: 0, viewedCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/crm/cs-status').then(r => r.json()),
      fetch('/api/dashboard/unsent').then(r => r.json()),
      fetch('/api/dashboard/follow-up').then(r => r.json()),
      fetch('/api/dashboard/viewed').then(r => r.json()),
    ]).then(([cs, unsent, followUp, viewed]) => {
      setData({
        csCount: cs.status === 'fulfilled' ? (Array.isArray(cs.value) ? cs.value.length : 0) : 0,
        unsentCount: unsent.status === 'fulfilled' ? (unsent.value.records?.length ?? 0) : 0,
        followUpCount: followUp.status === 'fulfilled' ? (followUp.value.records?.length ?? 0) : 0,
        viewedCount: viewed.status === 'fulfilled' ? (viewed.value.records?.length ?? 0) : 0,
      })
    }).finally(() => setLoading(false))
  }, [])

  const kpis = [
    { label: 'CS 대기', value: data.csCount, color: 'text-blue-600', bg: 'bg-blue-50', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { label: '미발송', value: data.unsentCount, color: 'text-red-600', bg: 'bg-red-50', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { label: '팔로업', value: data.followUpCount, color: 'text-accent-dark', bg: 'bg-accent-50', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { label: '열람 고객', value: data.viewedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
        >
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bg}`}>
              <svg className={`h-4.5 w-4.5 ${kpi.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{width: 18, height: 18}}>
                <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
              </svg>
            </div>
            <div>
              <p className="text-xs text-ink-secondary">{kpi.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${loading ? 'text-ink-faint' : kpi.value > 0 ? kpi.color : 'text-ink-muted'}`}>
                {loading ? '-' : kpi.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
