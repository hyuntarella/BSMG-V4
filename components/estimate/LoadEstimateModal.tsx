'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fm } from '@/lib/utils/format'

interface EstimateItem {
  id: string
  mgmt_no: string | null
  date: string
  customer_name: string | null
  site_name: string | null
  m2: number
  grand_total: number
}

interface LoadEstimateModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoadEstimateModal({ isOpen, onClose }: LoadEstimateModalProps) {
  const router = useRouter()
  const [estimates, setEstimates] = useState<EstimateItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch('/api/estimates?limit=20')
      .then((res) => res.json())
      .then((data) => {
        setEstimates(data.estimates ?? data ?? [])
      })
      .catch(() => setEstimates([]))
      .finally(() => setLoading(false))
  }, [isOpen])

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleSelect = useCallback(
    (id: string) => {
      router.push(`/estimate/${id}`)
      onClose()
    },
    [router, onClose]
  )

  if (!isOpen) return null

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold">견적서 불러오기</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 검색 */}
        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="고객명, 현장명, 관리번호 검색..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            autoFocus
          />
        </div>

        {/* 목록 */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {search ? '검색 결과가 없습니다' : '견적서가 없습니다'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered.map((est) => (
                <li key={est.id}>
                  <button
                    className="w-full px-5 py-3 text-left hover:bg-gray-50 transition"
                    onClick={() => handleSelect(est.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {est.customer_name || '(고객명 없음)'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {est.site_name || '현장 미입력'}
                          {est.m2 > 0 && ` · ${fm(est.m2)}m²`}
                          {est.mgmt_no && ` · ${est.mgmt_no}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right ml-4">
                        {est.grand_total > 0 && (
                          <p className="text-sm font-semibold tabular-nums text-brand">
                            {fm(est.grand_total)}원
                          </p>
                        )}
                        <p className="text-xs text-gray-400">{est.date}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
