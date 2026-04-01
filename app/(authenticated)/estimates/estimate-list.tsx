'use client'

import { useState } from 'react'
import Link from 'next/link'
import { fm } from '@/lib/utils/format'

interface EstimateRow {
  id: string
  mgmt_no: string | null
  status: string
  date: string
  customer_name: string | null
  site_name: string | null
  m2: number
  memo: string | null
  created_at: string
  totalAmount: number
  sheetTypes: string[]
}

interface EstimateListProps {
  estimates: EstimateRow[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '작성중', color: 'bg-gray-100 text-gray-600' },
  saved: { label: '저장됨', color: 'bg-blue-100 text-blue-700' },
  sent: { label: '발송됨', color: 'bg-emerald-100 text-emerald-700' },
  viewed: { label: '열람됨', color: 'bg-accent-100 text-accent-dark' },
}

export default function EstimateList({ estimates }: EstimateListProps) {
  const [search, setSearch] = useState('')

  const filtered = estimates.filter((est) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (est.customer_name ?? '').toLowerCase().includes(q) ||
      (est.site_name ?? '').toLowerCase().includes(q) ||
      (est.mgmt_no ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* 상단 */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">견적서 목록</h1>
        <Link
          href="/estimate/new"
          className="rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-card hover:shadow-card-hover transition-all"
        >
          + 새 견적서
        </Link>
      </div>

      {/* 검색 */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="고객명, 현장명, 관리번호 검색..."
          className="w-full rounded-xl border border-ink-faint/30 bg-white pl-10 pr-4 py-2.5 text-sm shadow-card focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl bg-white py-16 text-center shadow-card">
          <svg className="h-10 w-10 text-ink-faint mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-ink-secondary">
            {search ? '검색 결과가 없습니다' : '견적서가 없습니다'}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {search ? '다른 검색어를 시도해보세요' : '새 견적서를 작성해보세요'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((est) => {
            const statusInfo = STATUS_LABELS[est.status] ?? STATUS_LABELS.draft

            return (
              <Link
                key={est.id}
                href={`/estimate/${est.id}`}
                className="group block rounded-xl bg-white p-4 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 relative overflow-hidden"
              >
                {/* hover 시 좌측 brand 바 */}
                <div className="absolute left-0 top-0 bottom-0 w-0 bg-brand transition-all group-hover:w-1" />

                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">
                        {est.customer_name || '(고객명 없음)'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                      {est.sheetTypes.map((t) => (
                        <span
                          key={t}
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            t === '복합'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-purple-50 text-purple-600'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {est.site_name || '현장 미입력'}
                      {est.m2 > 0 && ` · ${fm(est.m2)}m²`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {est.totalAmount > 0 && (
                      <p className="text-sm font-bold tabular-nums text-ink">
                        {fm(est.totalAmount)}원
                      </p>
                    )}
                    <p className="text-[10px] text-ink-muted">
                      {est.mgmt_no ?? ''} · {est.date}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
