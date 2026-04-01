'use client'

import { useEffect, useState } from 'react'
import type { CrmRecord } from '@/lib/notion/types'
import { getDismissed, addDismissed } from '@/lib/utils/dismissed'

const DISMISSED_KEY = 'dismissed_cs'

const PIPELINE_OPTIONS = [
  '정보 입력 완료',
  '견적 방문 예정',
  '견적 방문 완료',
  '견적서 전송',
  '계약',
  '계약 실패',
  '보류',
]

export default function CsStatusSection() {
  const [records, setRecords] = useState<CrmRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    setDismissed(getDismissed(DISMISSED_KEY))

    fetch('/api/crm/cs-status')
      .then((res) => {
        if (!res.ok) throw new Error('CS 현황 조회 실패')
        return res.json() as Promise<CrmRecord[]>
      })
      .then((data) => setRecords(data))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'CS 현황 조회 실패'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = (id: string) => {
    addDismissed(DISMISSED_KEY, id)
    setDismissed((prev) => [...prev, id])
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const handlePipelineChange = async (id: string, pipeline: string) => {
    try {
      const res = await fetch('/api/crm/cs-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: id, pipeline }),
      })
      if (!res.ok) throw new Error('파이프라인 변경 실패')
      // 정보 입력 완료가 아닌 상태로 변경 → 카드 제거
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('파이프라인 변경 실패:', err)
    }
  }

  const visible = records.filter((r) => !dismissed.includes(r.id))

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">CS 현황</h2>
        <p className="text-sm text-ink-muted">불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">CS 현황</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">CS 현황</h2>
        <p className="rounded-lg border border-dashed border-ink-faint py-6 text-center text-sm text-ink-muted">
          정보 입력 완료 건이 없습니다
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-ink">
        CS 현황 <span className="ml-1 text-sm font-normal text-ink-secondary">({visible.length}건)</span>
      </h2>
      <div className="space-y-2">
        {visible.map((record) => (
          <CsCard
            key={record.id}
            record={record}
            onDismiss={handleDismiss}
            onPipelineChange={handlePipelineChange}
          />
        ))}
      </div>
    </div>
  )
}

// ── Sub-component ──

interface CsCardProps {
  record: CrmRecord
  onDismiss: (id: string) => void
  onPipelineChange: (id: string, pipeline: string) => void
}

function CsCard({ record, onDismiss, onPipelineChange }: CsCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-gray-900 truncate">
            {record.customerName ?? '(고객명 없음)'}
          </p>
          <p className="text-sm text-gray-600 truncate">{record.address}</p>
          {record.phone && (
            <a
              href={`tel:${record.phone}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {record.phone}
            </a>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {record.inquiryChannel && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {record.inquiryChannel}
              </span>
            )}
            {record.inquiryDate && (
              <span className="text-xs text-gray-400">{record.inquiryDate}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(record.id)}
          className="shrink-0 text-gray-300 hover:text-gray-500 text-xl leading-none"
          aria-label="연락완료"
          title="연락완료"
        >
          &times;
        </button>
      </div>
      <div className="mt-3">
        <select
          defaultValue="정보 입력 완료"
          onChange={(e) => onPipelineChange(record.id, e.target.value)}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {PIPELINE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
