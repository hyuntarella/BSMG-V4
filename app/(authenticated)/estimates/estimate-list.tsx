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
  sent: { label: '발송됨', color: 'bg-green-100 text-green-700' },
  viewed: { label: '열람됨', color: 'bg-purple-100 text-purple-700' },
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">견적서 목록</h1>
        <Link
          href="/estimate/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + 새 견적서
        </Link>
      </div>

      {/* 검색 */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="고객명, 현장명, 관리번호 검색..."
        className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          {search ? '검색 결과가 없습니다' : '견적서가 없습니다. 새 견적서를 작성해보세요.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((est) => {
            const statusInfo = STATUS_LABELS[est.status] ?? STATUS_LABELS.draft

            return (
              <Link
                key={est.id}
                href={`/estimate/${est.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-brand/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {est.customer_name || '(고객명 없음)'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                      {est.sheetTypes.map((t) => (
                        <span
                          key={t}
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            t === '복합'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-purple-50 text-purple-600'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {est.site_name || '현장 미입력'}
                      {est.m2 > 0 && ` · ${fm(est.m2)}m²`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {est.totalAmount > 0 && (
                      <p className="font-bold tabular-nums text-brand">
                        {fm(est.totalAmount)}원
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400">
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
